import { useEffect, useState } from 'react';
import { getChannelsBulk, type ClientChannelInfo } from '../api/chat';

/**
 * Чипы висят у каждого клиентского телефона, а страница показывает десятки
 * клиентов. Поэтому id, запрошенные в одном кадре, уходят одним запросом, а
 * ответ живёт в кэше: таблица на сотню строк не делает сотню запросов подряд.
 *
 * Сервер по пачке отвечает только кэшем доступности — провайдера никто не
 * дёргает, для этого в карточке остаётся явная кнопка «Проверить номера».
 */
const BATCH_MS = 50;
/** Столько номер считается «свежим» без запроса к серверу. */
const TTL_MS = 60 * 1000;

interface CacheEntry {
  channels: ClientChannelInfo[];
  at: number;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();
const queue = new Set<string>();
const inflight = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify(clientId: string) {
  listeners.get(clientId)?.forEach((listener) => listener());
}

function schedule(clientId: string) {
  queue.add(clientId);
  if (!timer) timer = setTimeout(flush, BATCH_MS);
}

async function flush() {
  timer = null;
  const ids = [...queue].filter((id) => !inflight.has(id));
  queue.clear();
  if (ids.length === 0) return;

  ids.forEach((id) => inflight.add(id));
  try {
    const items = await getChannelsBulk(ids);
    const at = Date.now();
    for (const item of items) cache.set(item.clientId, { channels: item.channels, at });
    // Клиент мог быть удалён, пока таблица открыта: пустой ответ тоже кэшим,
    // иначе этот id будет заново дёргать сервер при каждом рендере.
    const answered = new Set(items.map((item) => item.clientId));
    for (const id of ids) {
      if (!answered.has(id)) cache.set(id, { channels: [], at });
    }
  } catch {
    // Чипы — справка у номера, а не обязательный блок таблицы: ошибку не
    // показываем, следующий рендер попробует снова.
  } finally {
    ids.forEach((id) => {
      inflight.delete(id);
      notify(id);
    });
  }
}

export function useClientChannels(clientId: string | null | undefined): {
  channels: ClientChannelInfo[];
  loaded: boolean;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    const listener = () => setTick((prev) => prev + 1);
    let bucket = listeners.get(clientId);
    if (!bucket) {
      bucket = new Set();
      listeners.set(clientId, bucket);
    }
    bucket.add(listener);

    const entry = cache.get(clientId);
    if (!entry) schedule(clientId);
    else if (Date.now() - entry.at > TTL_MS && !inflight.has(clientId)) schedule(clientId);

    return () => {
      bucket?.delete(listener);
      if (bucket && bucket.size === 0) listeners.delete(clientId);
    };
  }, [clientId]);

  const entry = clientId ? cache.get(clientId) : undefined;
  return { channels: entry?.channels ?? [], loaded: Boolean(entry) };
}

/**
 * Перепроверка в оверлее обязана отразиться на чипах под ним: иначе карточка
 * продолжает показывать старый ответ провайдера, который только что обновили.
 */
export function putChannelsCache(clientId: string, channels: ClientChannelInfo[]) {
  cache.set(clientId, { channels, at: Date.now() });
  notify(clientId);
}

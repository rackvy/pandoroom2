import type { ClientChannelInfo, MessageChannel } from '../api/chat';

/** Одно имя канала на админку: полоса в оверлее и чипы у телефона говорят одинаково. */
export const CHANNEL_NAMES: Record<MessageChannel, string> = {
  INTERNAL: 'Внутренний чат',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  MAX: 'MAX',
};

/** Порядок чипов: WhatsApp дальше по частоте, чем алфавит, которым отвечает база. */
export const EXTERNAL_CHANNEL_ORDER: MessageChannel[] = ['WHATSAPP', 'TELEGRAM', 'MAX'];

/** Откуда взялась пометка о канале — менеджеру важно знать, насколько ей верить. */
export const CHANNEL_SOURCE_NAMES: Record<ClientChannelInfo['source'], string> = {
  PROBE: 'проверка номера у провайдера',
  WEBHOOK: 'клиент отсюда уже писал',
  MANUAL: 'пометку поставил менеджер',
  LEGACY: 'осталось из прежних переписок',
};

export function channelLabel(channel: MessageChannel): string {
  return CHANNEL_NAMES[channel] ?? channel;
}

/** Свежесть проверки в подсказке — дата, а не «30 дней назад»: число можно сверить. */
export function formatCheckedDay(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function compareChannels(a: ClientChannelInfo, b: ClientChannelInfo): number {
  return (
    EXTERNAL_CHANNEL_ORDER.indexOf(a.channel) - EXTERNAL_CHANNEL_ORDER.indexOf(b.channel) ||
    a.channel.localeCompare(b.channel)
  );
}

/** Подсказка к чипу: чем подтверждён канал и когда. */
export function channelHint(channel: ClientChannelInfo): string {
  const name = channelLabel(channel.channel);
  if (!channel.available) {
    return channel.note || `${name}: данных о регистрации в мессенджере нет`;
  }
  const source = CHANNEL_SOURCE_NAMES[channel.source] ?? channel.source;
  const day = formatCheckedDay(channel.checkedAt);
  return `${name}: номер подтверждён (${source}${day ? `, ${day}` : ''}) — открыть чат`;
}

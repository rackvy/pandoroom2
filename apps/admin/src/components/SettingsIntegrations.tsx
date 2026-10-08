import { useCallback, useEffect, useState } from 'react';
import {
  getIntegrations,
  getWazzupDriver,
  getZvonokStatus,
  patchIntegration,
  type IntegrationGroup,
  type IntegrationProvider,
  type ZvonokStatus,
} from '../api/integrations';
import type { ChatDriverMode } from '../api/chat';
import { toast } from './ui/Toast';
import styles from './SettingsIntegrations.module.css';

/**
 * Интеграции, за которыми пока нет бизнес-логики. Wazzup сюда больше не
 * относится: его настройки реально управляют отправкой сообщений.
 */
const STORAGE_ONLY: IntegrationProvider[] = ['yandex_disk', 'google_calendar'];

const SOURCE_LABELS: Record<string, string> = {
  db: 'из настроек',
  env: 'из окружения',
  none: 'не задано',
};

type Drafts = Record<string, Record<string, string>>;

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join('; ');
  return typeof message === 'string' ? message : fallback;
}

function toDrafts(groups: IntegrationGroup[]): Drafts {
  const drafts: Drafts = {};
  for (const group of groups) {
    drafts[group.provider] = {};
    for (const field of group.fields) {
      drafts[group.provider][field.key] = field.value ?? '';
    }
  }
  return drafts;
}

export default function SettingsIntegrations() {
  const [groups, setGroups] = useState<IntegrationGroup[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [zvonok, setZvonok] = useState<ZvonokStatus | null>(null);
  const [wazzup, setWazzup] = useState<ChatDriverMode | null>(null);

  const loadDriver = useCallback(async () => {
    try {
      setWazzup(await getWazzupDriver());
    } catch {
      setWazzup(null);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await getIntegrations();
      setGroups(data);
      setDrafts(toDrafts(data));
      loadDriver();
    } catch (err) {
      toast.error(errorMessage(err, 'Не удалось загрузить интеграции'));
    } finally {
      setIsLoading(false);
    }
  }, [loadDriver]);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = (group: IntegrationGroup) =>
    group.fields.some((field) => (drafts[group.provider]?.[field.key] ?? '') !== field.value);

  function setField(provider: string, key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], [key]: value } }));
  }

  async function handleSave(group: IntegrationGroup) {
    setSaving(group.provider);
    try {
      const updated = await patchIntegration(group.provider, drafts[group.provider] || {});
      setGroups((prev) => prev.map((item) => (item.provider === updated.provider ? updated : item)));
      setDrafts((prev) => ({ ...prev, [updated.provider]: toDrafts([updated])[updated.provider] }));
      toast.success(`${group.label}: сохранено`);
      if (group.provider === 'wazzup') loadDriver();
    } catch (err) {
      toast.error(errorMessage(err, 'Не удалось сохранить'));
    } finally {
      setSaving(null);
    }
  }

  async function handleCheckZvonok() {
    setChecking(true);
    try {
      setZvonok(await getZvonokStatus());
    } catch (err) {
      toast.error(errorMessage(err, 'Zvonok не ответил'));
    } finally {
      setChecking(false);
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Загружаем интеграции...</div>;
  }

  return (
    <div className={styles.grid}>
      <div className={styles.intro}>
        Ключи хранятся в базе и применяются сразу, без перезапуска сервера. Если поле оставить
        пустым, значение берётся из переменной окружения. Секретные поля не показываются целиком —
        чтобы заменить ключ, введите новый целиком; маска означает «не трогать».
      </div>

      {groups.map((group) => {
        const isZvonok = group.provider === 'zvonok';
        const isWazzup = group.provider === 'wazzup';
        return (
          <section className={styles.card} key={group.provider}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>{group.label}</h4>
              {STORAGE_ONLY.includes(group.provider) && (
                <span className={styles.badgeNeutral}>только хранение</span>
              )}
              {isWazzup && (
                <span
                  className={wazzup?.kind === 'wazzup' ? styles.badgeOk : styles.badgeWarn}
                  title={wazzup?.reason || 'Сервер не ответил'}
                >
                  {wazzup === null
                    ? 'драйвер не проверен'
                    : wazzup.kind === 'wazzup'
                      ? 'боевой драйвер'
                      : 'тестовый драйвер'}
                </span>
              )}
              {isZvonok && (
                <span className={zvonok?.configured ? styles.badgeOk : styles.badgeWarn}>
                  {zvonok === null ? 'не проверено' : zvonok.configured ? 'настроено' : 'не настроено'}
                </span>
              )}
            </div>

            {group.note && <p className={styles.note}>{group.note}</p>}

            <div className={styles.fields}>
              {group.fields.map((field) => {
                const value = drafts[group.provider]?.[field.key] ?? '';
                return (
                  <label className={styles.field} key={field.key}>
                    <span className={styles.fieldLabel}>
                      {field.label}
                      <span className={styles.source}>{SOURCE_LABELS[field.source]}</span>
                      {field.isSecret && field.secretLength && (
                        <span className={styles.source}>длина {field.secretLength}</span>
                      )}
                    </span>
                    {field.type === 'bool' ? (
                      <span className={styles.switchRow}>
                        <input
                          type="checkbox"
                          checked={value === 'true'}
                          onChange={(e) =>
                            setField(group.provider, field.key, e.target.checked ? 'true' : 'false')
                          }
                        />
                        <span className={styles.switchText}>
                          {value === 'true' ? 'включено' : 'выключено'}
                        </span>
                      </span>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className={styles.textarea}
                        rows={4}
                        spellCheck={false}
                        value={value}
                        placeholder="вставить целиком, чтобы заменить"
                        onChange={(e) => setField(group.provider, field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        className={styles.input}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={value}
                        placeholder="не менять"
                        onChange={(e) => setField(group.provider, field.key, e.target.value)}
                      />
                    )}
                    {field.hint && <span className={styles.hint}>{field.hint}</span>}
                  </label>
                );
              })}
            </div>

            {isZvonok && (
              <div className={styles.checkBlock}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleCheckZvonok}
                  disabled={checking}
                >
                  {checking ? 'Проверяем...' : 'Проверить баланс и кампании'}
                </button>
                {zvonok?.error && <div className={styles.errorText}>Zvonok: {zvonok.error}</div>}
                {zvonok && !zvonok.error && (
                  <div className={styles.checkResult}>
                    <div>Баланс: {zvonok.balance || '—'}</div>
                    {zvonok.campaigns.length === 0 ? (
                      <div className={styles.errorText}>
                        Кампаний нет — ни один звонок не уйдёт. Создайте кампанию «Диктовка кода
                        роботом» в кабинете Zvonok и впишите её ID выше.
                      </div>
                    ) : (
                      <ul className={styles.campaigns}>
                        {zvonok.campaigns.map((campaign) => (
                          <li key={campaign.id}>
                            <code>{campaign.id}</code> — {campaign.name || 'без названия'}
                            {campaign.isActive === false ? ' (выключена)' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => handleSave(group)}
                disabled={saving === group.provider || !isDirty(group)}
              >
                {saving === group.provider ? 'Сохраняем...' : 'Сохранить'}
              </button>
              {isDirty(group) && (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() =>
                    setDrafts((prev) => ({ ...prev, [group.provider]: toDrafts([group])[group.provider] }))
                  }
                >
                  Отменить изменения
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

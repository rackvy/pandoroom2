import { useState, useEffect, useCallback } from 'react';
import { getTemplates, updateTemplate, type NotificationTemplate } from '../../api/notifications';
import { toast } from '../../components/ui/Toast';
import styles from './NotificationTemplatesPage.module.css';

/** Variable tokens that can be used in templates */
const VARIABLE_DOCS: Record<string, string> = {
  '#NAME#': 'Имя клиента',
  '#QUEST_NAME#': 'Название квеста',
  '#DATE#': 'Дата события',
  '#TIME#': 'Время начала',
  '#NEW_DATE#': 'Новая дата (при переносе)',
  '#NEW_TIME#': 'Новое время (при переносе)',
  '#SUM_RUB#': 'Сумма визита (₽)',
  '#BRANCH_PHONE#': 'Телефон филиала',
  '#ADDRESS#': 'Адрес филиала',
  '#ESTIMATED_TIME#': 'Примерное время (мин)',
};

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExpand = (t: NotificationTemplate) => {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    setEditText(t.templateText);
    setEditName(t.name);
  };

  const handleSave = async (t: NotificationTemplate) => {
    if (t.id.startsWith('__default__')) {
      toast.error('Этот шаблон ещё не создан в базе. Обратитесь к разработчику.');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateTemplate(t.id, {
        templateText: editText,
        name: editName,
      });
      setTemplates(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      toast.success('Шаблон сохранён');
      setExpandedId(null);
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: NotificationTemplate) => {
    if (t.id.startsWith('__default__')) return;
    try {
      const updated = await updateTemplate(t.id, { isActive: !t.isActive });
      setTemplates(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      toast.success(updated.isActive ? 'Шаблон включён' : 'Шаблон выключен');
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  /** Extract which #KEY# variables are used in a template text */
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/#[A-Z_]+#/g);
    return matches ? [...new Set(matches)] : [];
  };

  /** Insert a variable tag at cursor position in the textarea */
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(`textarea-${expandedId}`) as HTMLTextAreaElement;
    if (!textarea) {
      setEditText(prev => prev + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = editText.slice(0, start) + variable + editText.slice(end);
    setEditText(newText);
    // Restore cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Шаблоны уведомлений</h1>
      </div>
      <p className={styles.subtitle}>
        Редактируйте текст шаблонов. Используйте переменные вида{' '}
        <code className={styles.code}>#NAME#</code> — они автоматически подставятся при отправке.
      </p>

      <div className={styles.list}>
        {templates.map((t) => {
          const isExpanded = expandedId === t.id;
          const usedVars = extractVariables(isExpanded ? editText : t.templateText);

          return (
            <div
              key={t.id}
              className={`${styles.card} ${!t.isActive ? styles.cardDisabled : ''}`}
            >
              {/* Card header */}
              <div className={styles.cardHeader} onClick={() => handleExpand(t)}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>
                    {t.name}
                    {!t.isActive && <span className={styles.badgeOff}>выкл</span>}
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.trigger}>{t.trigger}</span>
                    <span className={styles.key}>{t.key}</span>
                  </div>
                </div>
                <button className={styles.expandBtn}>{isExpanded ? '−' : '+'}</button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className={styles.cardBody}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Название шаблона</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Текст сообщения</label>
                    <textarea
                      id={`textarea-${t.id}`}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className={styles.textarea}
                      rows={4}
                    />
                  </div>

                  {/* Variable palette */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Вставить переменную</label>
                    <div className={styles.varPalette}>
                      {Object.entries(VARIABLE_DOCS).map(([v, desc]) => (
                        <button
                          key={v}
                          type="button"
                          className={`${styles.varChip} ${usedVars.includes(v) ? styles.varUsed : ''}`}
                          onClick={() => insertVariable(v)}
                          title={desc}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className={styles.varHints}>
                      {usedVars.length > 0 ? (
                        <span className={styles.usedLabel}>Используются: </span>
                      ) : null}
                      {usedVars.map(v => (
                        <span key={v} className={styles.usedVar}>
                          {v} — {VARIABLE_DOCS[v] || 'неизвестная'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {t.description && (
                    <div className={styles.description}>
                      <strong>Описание:</strong> {t.description}
                    </div>
                  )}

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => handleToggleActive(t)}
                    >
                      {t.isActive ? 'Выключить' : 'Включить'}
                    </button>
                    <div className={styles.cardActionsRight}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setExpandedId(null)}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        disabled={saving}
                        onClick={() => handleSave(t)}
                      >
                        {saving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

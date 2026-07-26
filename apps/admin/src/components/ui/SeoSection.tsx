import { useState, useMemo } from 'react';
import styles from './SeoSection.module.css';

export interface SeoFields {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  schemaJson?: string | null;
}

interface Props {
  value: SeoFields;
  onChange: (fields: SeoFields) => void;
}

export default function SeoSection({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const set = (field: keyof SeoFields, v: string) =>
    onChange({ ...value, [field]: v });

  const jsonState = useMemo(() => {
    const raw = (value.schemaJson || '').trim();
    if (!raw) return 'empty';
    try {
      JSON.parse(raw);
      return 'valid';
    } catch {
      return 'invalid';
    }
  }, [value.schemaJson]);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.headerTitle}>SEO и Schema.org</span>
        <span className={styles.headerMeta}>
          {jsonState === 'invalid' && (
            <span className={styles.badgeError}>JSON невалиден</span>
          )}
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>SEO-заголовок (title)</label>
            <input
              type="text"
              className={styles.input}
              value={value.seoTitle || ''}
              onChange={e => set('seoTitle', e.target.value)}
              placeholder="Например: Квест «Тайна Теслы» во Владивостоке — забронировать"
            />
            <span className={styles.hint}>Тег &lt;title&gt; страницы. Если пусто — используется название.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>SEO-описание (description)</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={value.seoDescription || ''}
              onChange={e => set('seoDescription', e.target.value)}
              placeholder="Краткое описание для сниппета в поисковой выдаче (до 160 символов)"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Ключевые слова (keywords)</label>
            <input
              type="text"
              className={styles.input}
              value={value.seoKeywords || ''}
              onChange={e => set('seoKeywords', e.target.value)}
              placeholder="квесты владивосток, детский праздник, через запятую"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Schema.org (JSON-LD)</label>
            <textarea
              className={`${styles.textarea} ${styles.jsonArea} ${
                jsonState === 'invalid' ? styles.jsonInvalid : ''
              }`}
              rows={8}
              spellCheck={false}
              value={value.schemaJson || ''}
              onChange={e => set('schemaJson', e.target.value)}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Event",\n  ...\n}'}
            />
            {jsonState === 'valid' && (
              <span className={styles.jsonOk}>✓ JSON валиден</span>
            )}
            {jsonState === 'invalid' && (
              <span className={styles.jsonErr}>✗ Невалидный JSON — исправьте перед публикацией</span>
            )}
            {jsonState === 'empty' && (
              <span className={styles.hint}>
                Вставьте разметку Schema.org в формате JSON-LD. Генератор: technicalseo.com/tools/schema-markup-generator
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

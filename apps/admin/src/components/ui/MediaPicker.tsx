import { useState, useEffect, useMemo } from 'react';
import { getMediaList, type Media } from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import styles from './MediaPicker.module.css';

type Accept = 'image' | 'video' | 'all';

interface MediaPickerProps {
  open: boolean;
  title?: string;
  accept?: Accept;
  onSelect: (media: Media) => void;
  onClose: () => void;
}

type TypeFilter = 'all' | 'image' | 'video' | 'file';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'image', label: 'Изображения' },
  { value: 'video', label: 'Видео' },
  { value: 'file', label: 'Файлы' },
];

function isVideo(item: Media): boolean {
  return item.mimeType.startsWith('video/');
}

export default function MediaPicker({
  open,
  title = 'Выбор из медиатеки',
  accept = 'all',
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    if (!open) return;
    setSearchQuery('');
    setTypeFilter('all');
    setLoading(true);
    setError(null);
    getMediaList()
      .then(setMedia)
      .catch(() => setError('Ошибка загрузки медиатеки'))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    return media.filter((item) => {
      // accept filter
      if (accept === 'image' && !item.mimeType.startsWith('image/')) return false;
      if (accept === 'video' && !isVideo(item)) return false;

      // type chips (only meaningful when accept === 'all')
      if (accept === 'all') {
        if (typeFilter === 'image' && !item.mimeType.startsWith('image/')) return false;
        if (typeFilter === 'video' && !isVideo(item)) return false;
        if (typeFilter === 'file' && (item.mimeType.startsWith('image/') || isVideo(item)))
          return false;
      }

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        item.originalName.toLowerCase().includes(q) ||
        (item.altText || '').toLowerCase().includes(q)
      );
    });
  }, [media, accept, typeFilter, searchQuery]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Поиск по имени или alt-тексту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {accept === 'all' && (
            <div className={styles.typeFilters}>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`${styles.typeFilter} ${typeFilter === f.value ? styles.typeFilterActive : ''}`}
                  onClick={() => setTypeFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <div className={styles.state}>Загрузка...</div>}
        {error && <div className={styles.stateError}>{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.state}>Ничего не найдено</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.grid}>
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.card}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                title={item.originalName}
              >
                <div className={styles.thumb}>
                  {item.mimeType.startsWith('image/') ? (
                    <img src={getMediaUrl(item.url)} alt={item.altText || item.originalName} />
                  ) : (
                    <div className={styles.thumbPlaceholder}>
                      <span className={styles.thumbIcon}>{isVideo(item) ? '🎬' : '📄'}</span>
                      <span className={styles.thumbExt}>
                        {item.originalName.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.cardName}>{item.originalName}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

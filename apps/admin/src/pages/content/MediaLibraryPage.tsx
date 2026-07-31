import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMediaList,
  uploadMedia,
  updateMedia,
  deleteMedia,
  getMediaUsage,
  type Media,
  type MediaUsage,
} from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './MediaLibraryPage.module.css';

type TypeFilter = 'all' | 'image' | 'video' | 'file';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'image', label: 'Изображения' },
  { value: 'video', label: 'Видео' },
  { value: 'file', label: 'Файлы' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function isVideo(item: Media): boolean {
  return item.mimeType.startsWith('video/');
}

function matchesTypeFilter(item: Media, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'image') return item.mimeType.startsWith('image/');
  if (filter === 'video') return isVideo(item);
  return !item.mimeType.startsWith('image/') && !isVideo(item);
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Modal state
  const [selected, setSelected] = useState<Media | null>(null);
  const [altText, setAltText] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMediaList();
      setMedia(data);
    } catch {
      setError('Ошибка загрузки медиатеки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploadProgress({ done: 0, total: list.length });
    let ok = 0;
    let failed = 0;

    for (const file of list) {
      try {
        await uploadMedia(file);
        ok++;
      } catch {
        failed++;
      }
      setUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }

    setUploadProgress(null);
    if (ok > 0) toast.success(`Загружено файлов: ${ok}`);
    if (failed > 0) toast.error(`Не удалось загрузить: ${failed}`);
    loadMedia();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const openModal = (item: Media) => {
    setSelected(item);
    setAltText(item.altText || '');
    setUsage(null);
  };

  const closeModal = () => {
    setSelected(null);
    setUsage(null);
    setCheckingUsage(false);
  };

  const handleSaveAlt = async () => {
    if (!selected) return;
    setSavingAlt(true);
    try {
      const updated = await updateMedia(selected.id, { altText: altText.trim() });
      setMedia((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelected(updated);
      toast.success('Alt-текст сохранён');
    } catch {
      toast.error('Ошибка сохранения alt-текста');
    } finally {
      setSavingAlt(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    // 1. Check usage first
    setCheckingUsage(true);
    let usageData: MediaUsage;
    try {
      usageData = await getMediaUsage(selected.id);
    } catch {
      setCheckingUsage(false);
      toast.error('Не удалось проверить использование файла');
      return;
    }
    setCheckingUsage(false);

    if (usageData.total > 0) {
      setUsage(usageData);
      return;
    }

    // 2. Not used — ask confirmation
    const confirmed = await confirm({
      title: 'Удалить файл?',
      message: `Файл "${selected.originalName}" будет удалён безвозвратно.`,
      confirmText: 'Удалить',
      type: 'danger',
    });
    if (!confirmed) return;

    // 3. Delete
    try {
      await deleteMedia(selected.id);
      toast.success('Файл удалён');
      closeModal();
      loadMedia();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ошибка удаления файла';
      toast.error(msg);
    }
  };

  const filtered = media.filter((item) => {
    if (!matchesTypeFilter(item, typeFilter)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.originalName.toLowerCase().includes(q) ||
      (item.altText || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div
      className={styles.page}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>Медиатека</h1>
        <button
          className={styles.addButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadProgress}
        >
          <span>+</span>
          <span>{uploadProgress ? 'Загрузка...' : 'Загрузить файлы'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleInputChange}
        />
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Поиск по имени или alt-тексту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.typeFilters}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.typeFilter} ${typeFilter === f.value ? styles.typeFilterActive : ''}`}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {uploadProgress && (
        <div className={styles.uploadProgress}>
          Загрузка файлов: {uploadProgress.done} из {uploadProgress.total}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {dragOver && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropHint}>Отпустите файлы для загрузки</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {media.length === 0
            ? 'Медиатека пуста — загрузите файлы'
            : 'Ничего не найдено'}
        </div>
      ) : (
        <>
          <div className={styles.count}>
            Показано {filtered.length} из {media.length}
          </div>
          <div className={styles.grid}>
            {filtered.map((item) => (
              <div
                key={item.id}
                className={styles.card}
                onClick={() => openModal(item)}
                title={item.originalName}
              >
                <div className={styles.thumb}>
                  {item.mimeType.startsWith('image/') ? (
                    <img src={getMediaUrl(item.url)} alt={item.altText || item.originalName} />
                  ) : isVideo(item) ? (
                    <div className={styles.thumbPlaceholder}>
                      <span className={styles.thumbIcon}>🎬</span>
                      <span className={styles.thumbExt}>
                        {item.originalName.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.thumbPlaceholder}>
                      <span className={styles.thumbIcon}>📄</span>
                      <span className={styles.thumbExt}>
                        {item.originalName.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{item.originalName}</div>
                  <div className={styles.cardMeta}>
                    {formatSize(item.sizeBytes)} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selected.originalName}</h3>
              <button className={styles.closeBtn} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className={styles.preview}>
              {selected.mimeType.startsWith('image/') ? (
                <img
                  src={getMediaUrl(selected.url)}
                  alt={selected.altText || selected.originalName}
                />
              ) : isVideo(selected) ? (
                <video controls src={getMediaUrl(selected.url)} />
              ) : (
                <div className={styles.previewFile}>
                  <span className={styles.previewFileIcon}>📄</span>
                  <span>{selected.originalName}</span>
                </div>
              )}
            </div>

            <div className={styles.modalMeta}>
              <span>{formatSize(selected.sizeBytes)}</span>
              <span>{selected.mimeType}</span>
              <span>
                Загружен {new Date(selected.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>

            <div className={styles.altSection}>
              <label className={styles.altLabel}>Alt-текст (описание)</label>
              <div className={styles.altRow}>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Описание файла..."
                  className={styles.altInput}
                />
                <button
                  className={styles.saveAltBtn}
                  onClick={handleSaveAlt}
                  disabled={savingAlt || altText.trim() === (selected.altText || '')}
                >
                  {savingAlt ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>

            {usage && usage.total > 0 && (
              <div className={styles.usageBlock}>
                <div className={styles.usageTitle}>
                  Файл используется — удаление заблокировано
                </div>
                <ul className={styles.usageList}>
                  {usage.usages.map((u) => (
                    <li key={u.label}>
                      {u.label}: {u.count}
                    </li>
                  ))}
                </ul>
                <div className={styles.usageHint}>
                  Сначала уберите файл из этих разделов.
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>
                Закрыть
              </button>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={checkingUsage}
              >
                {checkingUsage ? 'Проверка...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

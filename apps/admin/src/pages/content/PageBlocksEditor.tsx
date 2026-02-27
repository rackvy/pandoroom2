import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPageBlocks, updatePageBlock, type PageBlock, type PageKey } from '../../api/content';
import { uploadMedia } from '../../api/media';
import styles from './QuestsListPage.module.css';

const PAGE_OPTIONS: { key: PageKey; label: string }[] = [
  { key: 'HOME', label: 'Главная страница' },
  { key: 'PARTY_GUIDE', label: 'Гид по праздникам' },
  { key: 'PARTY_GUIDE_KIDS', label: 'Гид - Детский праздник' },
  { key: 'PARTY_GUIDE_6_10', label: 'Гид - 6-10 лет' },
  { key: 'PARTY_GUIDE_10_15', label: 'Гид - 10-15 лет' },
  { key: 'CAFE', label: 'Кафе' },
  { key: 'CAFE_KAFE', label: 'Кафе - Кафе' },
  { key: 'CAFE_LOUNGE', label: 'Кафе - Лаунж' },
  { key: 'CAFE_KIDS', label: 'Кафе - Детская' },
];

export default function PageBlocksEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPage, setSelectedPage] = useState<PageKey>(
    (searchParams.get('page') as PageKey) || 'HOME'
  );
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<PageBlock | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPageBlocks(selectedPage);
      setBlocks(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError('Ошибка загрузки блоков');
    } finally {
      setLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => {
    loadBlocks();
    setSearchParams({ page: selectedPage });
  }, [selectedPage, loadBlocks, setSearchParams]);

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPage(e.target.value as PageKey);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const media = await uploadMedia(file);
      await updatePageBlock(blockId, { imageId: media.id });
      loadBlocks();
    } catch (err) {
      alert('Ошибка загрузки изображения');
    }
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;

    try {
      setSaving(true);
      await updatePageBlock(editingBlock.id, {
        title: editingBlock.title || undefined,
        text: editingBlock.text || undefined,
        linkUrl: editingBlock.linkUrl || undefined,
      });
      setEditingBlock(null);
      loadBlocks();
    } catch (err) {
      setError('Ошибка сохранения блока');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Редактор страниц</h1>
      </div>

      <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
        <label className={styles.label}>Выберите страницу</label>
        <select value={selectedPage} onChange={handlePageChange} className={styles.input}>
          {PAGE_OPTIONS.map(page => (
            <option key={page.key} value={page.key}>{page.label}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {editingBlock ? (
        <form onSubmit={handleSaveBlock} className={styles.form}>
          <h3>Редактирование блока: {editingBlock.blockKey}</h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Заголовок</label>
            <input
              type="text"
              value={editingBlock.title || ''}
              onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Текст</label>
            <textarea
              value={editingBlock.text || ''}
              onChange={(e) => setEditingBlock({ ...editingBlock, text: e.target.value })}
              className={styles.textarea}
              rows={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ссылка</label>
            <input
              type="text"
              value={editingBlock.linkUrl || ''}
              onChange={(e) => setEditingBlock({ ...editingBlock, linkUrl: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => setEditingBlock(null)}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Порядок</th>
              <th>Ключ блока</th>
              <th>Заголовок</th>
              <th>Текст</th>
              <th>Изображение</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.id}>
                <td>{block.sortOrder}</td>
                <td>{block.blockKey}</td>
                <td>{block.title || '-'}</td>
                <td>
                  <div style={{ maxWidth: '200px', maxHeight: '60px', overflow: 'hidden' }}>
                    {block.text ? block.text.substring(0, 50) + (block.text.length > 50 ? '...' : '') : '-'}
                  </div>
                </td>
                <td>
                  {block.image?.url ? (
                    <img src={block.image.url} alt="" className={styles.questImage} style={{ width: '60px', height: '40px' }} />
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, block.id)}
                      className={styles.fileInput}
                      style={{ width: '100px' }}
                    />
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setEditingBlock(block)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

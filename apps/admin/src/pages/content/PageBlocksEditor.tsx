import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPageBlocks, updatePageBlock, createPageBlock, deletePageBlock, type PageBlock, type PageKey } from '../../api/content';
import { uploadMedia } from '../../api/media';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './Form.module.css';
import hintStyles from './PageBlocksEditor.module.css';
import RichTextEditor from '../../components/ui/RichTextEditor';

// ─── Page options with descriptions ─────────────────────────────────────────

interface ExpectedBlock {
  key: string;
  description: string;
  extraJsonHint?: string;
}

interface PageOption {
  key: PageKey;
  label: string;
  description: string;
  expectedBlocks: ExpectedBlock[] | null; // null = free-form
  freeFormMessage?: string;
}

const PAGE_OPTIONS: PageOption[] = [
  {
    key: 'HOME',
    label: 'Главная страница',
    description: 'Блоки для главной страницы: hero-секция, праздничные карточки, сервисы',
    expectedBlocks: [
      { key: 'hero_title', description: 'Заголовок hero-секции' },
      { key: 'hero_features', description: 'Список преимуществ (JSON-массив строк)', extraJsonHint: '["Преимущество 1", "Преимущество 2", ...]' },
      { key: 'hero_cta_text', description: 'Текст CTA-кнопки' },
      { key: 'hero_bg', description: 'Фоновое изображение hero-секции (загружается как картинка блока)' },
      { key: 'hero_photo_1', description: 'Фото коллажа №1 (правое верхнее)' },
      { key: 'hero_photo_2', description: 'Фото коллажа №2 (правое нижнее)' },
      { key: 'hero_photo_3', description: 'Фото коллажа №3 (левое)' },
      { key: 'holiday_cards', description: 'Карточки праздников (JSON-массив объектов)', extraJsonHint: '[{"title": "...", "description": "...", "imageId": "..."}, ...]' },
      { key: 'services', description: 'Иконки сервисов (JSON-массив объектов)', extraJsonHint: '[{"title": "...", "iconId": "..."}, ...]' },
    ],
  },
  {
    key: 'CAFE',
    label: 'Кафе',
    description: 'Блоки для страницы кафе',
    expectedBlocks: null,
    freeFormMessage: 'Создавайте блоки с произвольными ключами',
  },
];

// Helper to find current page option
function getPageOption(pageKey: PageKey): PageOption | undefined {
  return PAGE_OPTIONS.find(p => p.key === pageKey);
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [isCreating, setIsCreating] = useState(false);
  const [newBlock, setNewBlock] = useState<Partial<PageBlock>>({
    pageKey: selectedPage,
    blockKey: '',
    title: '',
    text: '',
    linkUrl: '',
    sortOrder: 0,
  });

  const currentOption = getPageOption(selectedPage);

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
    const newPage = e.target.value as PageKey;
    setSelectedPage(newPage);
    setNewBlock(prev => ({ ...prev, pageKey: newPage }));
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
      toast.success('Блок сохранен');
    } catch (err) {
      setError('Ошибка сохранения блока');
      toast.error('Ошибка сохранения блока');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.blockKey || !newBlock.pageKey) {
      toast.error('Укажите ключ блока');
      return;
    }

    try {
      setSaving(true);
      await createPageBlock({
        pageKey: newBlock.pageKey as PageKey,
        blockKey: newBlock.blockKey,
        title: newBlock.title || undefined,
        text: newBlock.text || undefined,
        linkUrl: newBlock.linkUrl || undefined,
        sortOrder: blocks.length,
      });
      setIsCreating(false);
      setNewBlock({
        pageKey: selectedPage,
        blockKey: '',
        title: '',
        text: '',
        linkUrl: '',
        sortOrder: 0,
      });
      loadBlocks();
      toast.success('Блок создан');
    } catch (err) {
      setError('Ошибка создания блока');
      toast.error('Ошибка создания блока');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (block: PageBlock) => {
    const confirmed = await confirm({
      title: 'Удалить блок?',
      message: `Вы уверены, что хотите удалить блок "${block.blockKey}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deletePageBlock(block.id);
      loadBlocks();
      toast.success('Блок удален');
    } catch (err) {
      toast.error('Ошибка удаления блока');
    }
  };

  const handleMoveBlock = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

    try {
      await Promise.all(
        newBlocks.map((block, i) =>
          updatePageBlock(block.id, { sortOrder: i })
        )
      );
      loadBlocks();
      toast.success('Порядок обновлен');
    } catch (err) {
      toast.error('Ошибка обновления порядка');
    }
  };

  // Resolve extraJson hint for a given blockKey on the current page
  function getExtraJsonHintForKey(blockKey: string): string | undefined {
    return currentOption?.expectedBlocks?.find(b => b.key === blockKey)?.extraJsonHint;
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Редактор страниц</h1>
      </div>

      {/* Page selector */}
      <div className={styles.formGroup} style={{ marginBottom: '8px' }}>
        <label className={styles.label}>Выберите страницу</label>
        <select value={selectedPage} onChange={handlePageChange} className={styles.input} style={{ maxWidth: '400px' }}>
          {PAGE_OPTIONS.map(page => (
            <option key={page.key} value={page.key}>{page.label}</option>
          ))}
        </select>
      </div>

      {/* Page description + expected blocks */}
      {currentOption && (
        <div style={{ marginBottom: '20px' }}>
          <div className={hintStyles.pageHint}>
            {currentOption.description}
          </div>

          {currentOption.expectedBlocks && currentOption.expectedBlocks.length > 0 && (
            <div className={hintStyles.expectedBlocks}>
              <div className={hintStyles.expectedBlocksTitle}>Ожидаемые ключи блоков:</div>
              {currentOption.expectedBlocks.map(b => (
                <div key={b.key} className={hintStyles.expectedBlockItem}>
                  <code className={hintStyles.expectedBlockKey}>{b.key}</code>
                  <span className={hintStyles.expectedBlockDesc}>— {b.description}</span>
                </div>
              ))}
            </div>
          )}

          {currentOption.freeFormMessage && (
            <div className={hintStyles.expectedBlocks}>
              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>{currentOption.freeFormMessage}</span>
            </div>
          )}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {editingBlock ? (
        <form onSubmit={handleSaveBlock} className={styles.form}>
          <h3>Редактирование блока: {editingBlock.blockKey}</h3>

          {/* ExtraJson hint for known blockKey */}
          {getExtraJsonHintForKey(editingBlock.blockKey) && (
            <div className={hintStyles.hintText} style={{ marginBottom: '1rem' }}>
              Поле <code>extraJson</code> ожидается в формате:{' '}
              <div className={hintStyles.extraJsonHint}>
                {getExtraJsonHintForKey(editingBlock.blockKey)}
              </div>
            </div>
          )}

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
            <RichTextEditor
              value={editingBlock.text || ''}
              onChange={(val) => setEditingBlock({ ...editingBlock, text: val })}
              minHeight={180}
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
      ) : isCreating ? (
        <form onSubmit={handleCreateBlock} className={styles.form}>
          <h3>Создание нового блока</h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ключ блока *</label>
            <input
              type="text"
              value={newBlock.blockKey || ''}
              onChange={(e) => setNewBlock({ ...newBlock, blockKey: e.target.value })}
              className={styles.input}
              placeholder={
                currentOption?.expectedBlocks
                  ? currentOption.expectedBlocks.map(b => b.key).join(', ')
                  : 'hero, about, features, cta...'
              }
              required
            />
            {/* Dynamic hint based on what the user types */}
            {newBlock.blockKey && getExtraJsonHintForKey(newBlock.blockKey) && (
              <div style={{ marginTop: '0.375rem' }}>
                <span className={hintStyles.hintText}>
                  Этот блок использует <code>extraJson</code>. Ожидаемый формат:
                </span>
                <div className={hintStyles.extraJsonHint}>
                  {getExtraJsonHintForKey(newBlock.blockKey)}
                </div>
              </div>
            )}
            {newBlock.blockKey && currentOption?.expectedBlocks?.find(b => b.key === newBlock.blockKey) && (
              <div className={hintStyles.hintText}>
                {currentOption.expectedBlocks.find(b => b.key === newBlock.blockKey)!.description}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Заголовок</label>
            <input
              type="text"
              value={newBlock.title || ''}
              onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Текст</label>
            <RichTextEditor
              value={newBlock.text || ''}
              onChange={(val) => setNewBlock({ ...newBlock, text: val })}
              minHeight={180}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ссылка</label>
            <input
              type="text"
              value={newBlock.linkUrl || ''}
              onChange={(e) => setNewBlock({ ...newBlock, linkUrl: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsCreating(false)}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Создание...' : 'Создать блок'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <button className={hintStyles.addButton} onClick={() => setIsCreating(true)}>
              + Добавить блок
            </button>
          </div>
          {blocks.length === 0 ? (
            <div className={styles.empty}>
              Блоки отсутствуют. Нажмите «+ Добавить блок», чтобы создать первый.
            </div>
          ) : (
            <table className={hintStyles.table}>
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
                {blocks.map((block, index) => (
                  <tr key={block.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button
                          onClick={() => handleMoveBlock(index, 'up')}
                          disabled={index === 0}
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                        >
                          ↑
                        </button>
                        <span>{block.sortOrder}</span>
                        <button
                          onClick={() => handleMoveBlock(index, 'down')}
                          disabled={index === blocks.length - 1}
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td>
                      <code>{block.blockKey}</code>
                      {block.extraJson && (
                        <div className={hintStyles.hintText} title={JSON.stringify(block.extraJson, null, 2)}>
                          extraJson ✓
                        </div>
                      )}
                    </td>
                    <td>{block.title || '-'}</td>
                    <td>
                      <div style={{ maxWidth: '200px', maxHeight: '60px', overflow: 'hidden' }}>
                        {block.text ? block.text.substring(0, 50) + (block.text.length > 50 ? '...' : '') : '-'}
                      </div>
                    </td>
                    <td>
                      {block.image?.url ? (
                        <img src={block.image.url} alt="" className={hintStyles.questImage} style={{ width: '60px', height: '40px' }} />
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
                          className={hintStyles.actionButton}
                          onClick={() => setEditingBlock(block)}
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          className={hintStyles.actionButton}
                          onClick={() => handleDeleteBlock(block)}
                          title="Удалить"
                          style={{ color: '#f44336' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

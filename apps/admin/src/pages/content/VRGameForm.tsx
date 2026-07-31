import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getVRGame,
  createVRGame,
  updateVRGame,
  getBranches,
  type CreateVRGameData,
  type Branch,
  type ContentSection,
} from '../../api/catalog';
import { getAgeRestrictions, getDifficulties } from '../../api/content';
import { uploadMedia, updateMedia, type Media } from '../../api/media';
import { getMediaUrl } from '../../utils/media';
import { toast } from '../../components/ui/Toast';
import RichTextEditor from '../../components/ui/RichTextEditor';
import SeoSection from '../../components/ui/SeoSection';
import DifficultyIconPicker from '../../components/ui/DifficultyIconPicker';
import MediaPicker from '../../components/ui/MediaPicker';
import pageStyles from './Form.module.css';
import styles from '../../components/QuestForm.module.css';

export default function VRGameForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [ageOptions, setAgeOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'Без ограничений' },
  ]);
  const [difficultyOptions, setDifficultyOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'Не указана' },
  ]);

  const [formData, setFormData] = useState<CreateVRGameData>({
    branchId: null,
    name: '',
    description: null,
    genre: null,
    difficulty: null,
    difficultyIcon: null,
    ageRestriction: null,
    subtitle: null,
    minPlayers: 1,
    maxPlayers: 20,
    durationMinutes: null,
    previewImageId: null,
    backgroundImageId: null,
    videoId: null,
    contentSections: [{ title: '', text: '' }],
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    schemaJson: null,
    isActive: true,
    sortOrder: 0,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewAltText, setPreviewAltText] = useState('');
  const [backgroundAltText, setBackgroundAltText] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'preview' | 'background' | 'video' | 'gallery' | null>(null);
  const [pickedMedia, setPickedMedia] = useState<{ preview?: Media; background?: Media }>({});
  // Gallery: existing photos have id, newly added ones have file (uploaded on submit)
  const [galleryItems, setGalleryItems] = useState<
    { id?: string; url: string; file?: File }[]
  >([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    getAgeRestrictions()
      .then((items) => {
        const opts = [
          { value: '', label: 'Без ограничений' },
          ...items.map((item) => ({ value: item.value, label: item.value })),
        ];
        setAgeOptions(opts);
      })
      .catch(console.error);
    getDifficulties()
      .then((items) => {
        const opts = [
          { value: '', label: 'Не указана' },
          ...items.map((item) => ({ value: item.value, label: item.value })),
        ];
        setDifficultyOptions(opts);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const game = await getVRGame(id!);
      setFormData({
        branchId: game.branchId,
        name: game.name,
        description: game.description,
        genre: game.genre,
        difficulty: game.difficulty,
        difficultyIcon: game.difficultyIcon,
        ageRestriction: game.ageRestriction,
        subtitle: game.subtitle,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        durationMinutes: game.durationMinutes,
        previewImageId: game.previewImageId,
        backgroundImageId: game.backgroundImageId,
        videoId: game.videoId,
        contentSections: game.contentSections?.length
          ? game.contentSections.map((s) => ({ title: s.title, text: s.text }))
          : [{ title: '', text: '' }],
        seoTitle: game.seoTitle,
        seoDescription: game.seoDescription,
        seoKeywords: game.seoKeywords,
        schemaJson: game.schemaJson,
        isActive: game.isActive,
        sortOrder: game.sortOrder,
      });
      setPreviewUrl(game.previewImage?.url || null);
      setBackgroundUrl(game.backgroundImage?.url || null);
      setVideoUrl(game.video?.url || null);
      setPreviewAltText(game.previewImage?.altText || '');
      setBackgroundAltText(game.backgroundImage?.altText || '');
      setGalleryItems(
        (game.galleryPhotos || []).map((p) => ({
          id: p.imageId,
          url: getMediaUrl(p.image.url),
        }))
      );

      // add current dictionary values if they are missing from the lists
      if (game.ageRestriction) {
        setAgeOptions((prev) =>
          prev.some((o) => o.value === game.ageRestriction)
            ? prev
            : [...prev, { value: game.ageRestriction!, label: game.ageRestriction! }]
        );
      }
      if (game.difficulty) {
        setDifficultyOptions((prev) =>
          prev.some((o) => o.value === game.difficulty)
            ? prev
            : [...prev, { value: game.difficulty!, label: game.difficulty! }]
        );
      }
    } catch (err) {
      setError('Ошибка загрузки VR игры');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateVRGameData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CreateVRGameData, value: string) => {
    const num = parseInt(value) || 0;
    handleChange(field, num);
  };

  const updateSection = (index: number, patch: Partial<ContentSection>) => {
    setFormData((prev) => ({
      ...prev,
      contentSections: (prev.contentSections || []).map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }));
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      contentSections: [...(prev.contentSections || []), { title: '', text: '' }],
    }));
  };

  const removeSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contentSections: (prev.contentSections || []).filter((_, i) => i !== index),
    }));
  };

  const handlePreviewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const media = await uploadMedia(file, previewAltText || undefined);
      handleChange('previewImageId', media.id);
      setPreviewUrl(media.url);
      setPickedMedia((prev) => ({ ...prev, preview: undefined }));
      toast.success('Превью загружено');
    } catch (err) {
      toast.error('Ошибка загрузки превью');
    }
  };

  const handleBackgroundImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const media = await uploadMedia(file, backgroundAltText || undefined);
      handleChange('backgroundImageId', media.id);
      setBackgroundUrl(media.url);
      setPickedMedia((prev) => ({ ...prev, background: undefined }));
      toast.success('Фоновое изображение загружено');
    } catch (err) {
      toast.error('Ошибка загрузки фонового изображения');
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      toast.success('Загружаю видео, подождите...');
      const media = await uploadMedia(file);
      handleChange('videoId', media.id);
      setVideoUrl(media.url);
      toast.success('Видео загружено');
    } catch (err) {
      toast.error('Ошибка загрузки видео');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeVideo = () => {
    handleChange('videoId', null);
    setVideoUrl(null);
  };

  const handlePickFromLibrary = (media: Media) => {
    if (pickerTarget === 'preview') {
      handleChange('previewImageId', media.id);
      setPreviewUrl(media.url);
      setPreviewAltText(media.altText || '');
      setPickedMedia((prev) => ({ ...prev, preview: media }));
    } else if (pickerTarget === 'background') {
      handleChange('backgroundImageId', media.id);
      setBackgroundUrl(media.url);
      setBackgroundAltText(media.altText || '');
      setPickedMedia((prev) => ({ ...prev, background: media }));
    } else if (pickerTarget === 'video') {
      handleChange('videoId', media.id);
      setVideoUrl(media.url);
      toast.success('Видео выбрано из медиатеки');
    } else if (pickerTarget === 'gallery') {
      setGalleryItems((prev) => {
        if (prev.some((item) => item.id === media.id)) return prev; // no duplicates
        return [...prev, { id: media.id, url: getMediaUrl(media.url) }];
      });
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryItems((prev) => [
        ...prev,
        ...files.map((file) => ({ url: URL.createObjectURL(file), file })),
      ]);
    }
    e.target.value = '';
  };

  const removeGalleryImage = (index: number) => {
    setGalleryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Sync alt-text edits for library-picked images
      if (pickedMedia.preview && previewAltText.trim() !== (pickedMedia.preview.altText || '')) {
        try {
          await updateMedia(pickedMedia.preview.id, { altText: previewAltText.trim() });
        } catch (err) {
          console.error('Failed to update preview alt text:', err);
        }
      }
      if (pickedMedia.background && backgroundAltText.trim() !== (pickedMedia.background.altText || '')) {
        try {
          await updateMedia(pickedMedia.background.id, { altText: backgroundAltText.trim() });
        } catch (err) {
          console.error('Failed to update background alt text:', err);
        }
      }

      // Upload new gallery photos first
      setUploadingGallery(true);
      const galleryPhotoIds: string[] = [];
      for (const item of galleryItems) {
        if (item.id) {
          galleryPhotoIds.push(item.id);
        } else if (item.file) {
          const media = await uploadMedia(item.file);
          galleryPhotoIds.push(media.id);
        }
      }
      setUploadingGallery(false);

      // filter out empty sections
      const submitData: CreateVRGameData = {
        ...formData,
        contentSections: (formData.contentSections || []).filter(
          (s) => s.title.trim() || s.text.trim()
        ),
        galleryPhotoIds,
      };
      if (isEdit) {
        await updateVRGame(id!, submitData);
        toast.success('VR игра обновлена');
      } else {
        await createVRGame(submitData);
        toast.success('VR игра создана');
      }
      navigate('/content/vr-games');
    } catch (err) {
      setError('Ошибка сохранения VR игры');
      toast.error('Ошибка сохранения VR игры');
    } finally {
      setUploadingGallery(false);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={pageStyles.loading}>Загрузка...</div>;
  }

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <h1 className={pageStyles.title}>{isEdit ? 'Редактировать VR игру' : 'Новая VR игра'}</h1>
      </div>

      {error && <div className={pageStyles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="name">Название *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="branchId">Филиал</label>
            <select
              id="branchId"
              value={formData.branchId || ''}
              onChange={(e) => handleChange('branchId', e.target.value || null)}
            >
              <option value="">Без филиала</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="genre">Жанр</label>
            <input
              id="genre"
              type="text"
              value={formData.genre || ''}
              onChange={(e) => handleChange('genre', e.target.value || null)}
              placeholder="Например: Шутер, Приключение"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="difficulty">Сложность</label>
            <select
              id="difficulty"
              value={formData.difficulty || ''}
              onChange={(e) => handleChange('difficulty', e.target.value || null)}
            >
              {difficultyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Иконка сложности</label>
            <DifficultyIconPicker
              value={formData.difficultyIcon || ''}
              onChange={(val) => handleChange('difficultyIcon', val || null)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="subtitle">Подзаголовок</label>
            <input
              id="subtitle"
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => handleChange('subtitle', e.target.value || null)}
              placeholder="Краткий подзаголовок игры"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ageRestriction">Возрастное ограничение</label>
            <select
              id="ageRestriction"
              value={formData.ageRestriction || ''}
              onChange={(e) => handleChange('ageRestriction', e.target.value || null)}
            >
              {ageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="minPlayers">Мин. игроков</label>
            <input
              id="minPlayers"
              type="number"
              min={1}
              max={20}
              value={formData.minPlayers}
              onChange={(e) => handleNumberChange('minPlayers', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="maxPlayers">Макс. игроков</label>
            <input
              id="maxPlayers"
              type="number"
              min={1}
              max={20}
              value={formData.maxPlayers}
              onChange={(e) => handleNumberChange('maxPlayers', e.target.value)}
            />
            <span className={styles.fieldHint}>Максимум 20 игроков на одной арене</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="durationMinutes">Длительность (мин)</label>
            <input
              id="durationMinutes"
              type="number"
              min={5}
              step={5}
              value={formData.durationMinutes ?? ''}
              onChange={(e) =>
                handleChange('durationMinutes', e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="sortOrder">Порядок отображения</label>
            <input
              id="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => handleNumberChange('sortOrder', e.target.value)}
            />
            <span className={styles.fieldHint}>Чем меньше число, тем выше игра в списке</span>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
              />
              Активна
            </label>
          </div>
        </div>

        <div className={styles.imagesSection}>
          <h3>Медиа</h3>

          <div className={styles.imageUploads}>
            <div className={styles.imageField}>
              <label>Превью изображение</label>
              <div className={styles.imagePreview}>
                {previewUrl && (
                  <img src={getMediaUrl(previewUrl)} alt="Preview" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePreviewImageChange}
              />
              <button
                type="button"
                className={styles.addSectionButton}
                onClick={() => setPickerTarget('preview')}
              >
                📚 Выбрать из медиатеки
              </button>
              <input
                type="text"
                placeholder="Alt-текст (описание для SEO)"
                value={previewAltText}
                onChange={(e) => setPreviewAltText(e.target.value)}
                className={styles.altTextInput}
              />
            </div>

            <div className={styles.imageField}>
              <label>Фоновое изображение</label>
              <div className={styles.imagePreview}>
                {backgroundUrl && (
                  <img src={getMediaUrl(backgroundUrl)} alt="Background" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageChange}
              />
              <button
                type="button"
                className={styles.addSectionButton}
                onClick={() => setPickerTarget('background')}
              >
                📚 Выбрать из медиатеки
              </button>
              <input
                type="text"
                placeholder="Alt-текст (описание для SEO)"
                value={backgroundAltText}
                onChange={(e) => setBackgroundAltText(e.target.value)}
                className={styles.altTextInput}
              />
            </div>
          </div>

          <div className={styles.imageField}>
            <label>Видео (MP4)</label>
            {videoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <video
                  src={getMediaUrl(videoUrl)}
                  controls
                  style={{ width: '100%', maxHeight: 320, borderRadius: 6, background: '#000' }}
                />
                <button
                  type="button"
                  className={styles.addSectionButton}
                  onClick={removeVideo}
                >
                  Удалить видео
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="file"
                  accept="video/mp4,video/*"
                  onChange={handleVideoChange}
                  disabled={uploadingVideo}
                />
                <button
                  type="button"
                  className={styles.addSectionButton}
                  onClick={() => setPickerTarget('video')}
                  disabled={uploadingVideo}
                >
                  📚 Выбрать из медиатеки
                </button>
              </div>
            )}
            <span className={styles.fieldHint}>
              {uploadingVideo ? 'Идёт загрузка видео...' : 'Ролик об игре, будет показан на странице игры'}
            </span>
          </div>

          <div className={styles.gallerySection}>
            <label>Галерея фотографий</label>
            <div className={styles.galleryGrid}>
              {galleryItems.map((item, index) => (
                <div key={index} className={styles.galleryItem}>
                  <img src={item.url} alt={`Фото ${index + 1}`} />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeGalleryImage(index)}
                    title="Удалить фото"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className={styles.addGalleryItem}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryImagesChange}
                  hidden
                />
                <span>+ Добавить</span>
              </label>
              <button
                type="button"
                className={styles.addGalleryItem}
                onClick={() => setPickerTarget('gallery')}
              >
                <span>📚 Из медиатеки</span>
              </button>
            </div>
            <span className={styles.fieldHint}>
              Дополнительные фотографии игры. Можно выбрать сразу несколько файлов.
            </span>
          </div>
        </div>

        <div className={styles.textareas}>
          <div className={styles.sectionsHeader}>
            <h3>Контент (табы на странице игры)</h3>
            <span className={styles.sectionsHint}>Каждая секция — это отдельный таб. Название секции станет заголовком таба.</span>
          </div>

          {(formData.contentSections || []).map((section, index) => (
            <div key={index} className={styles.contentSection}>
              <div className={styles.contentSectionTop}>
                <input
                  type="text"
                  placeholder={`Название секции ${index + 1} (например: Описание, Правила)`}
                  value={section.title}
                  onChange={(e) => updateSection(index, { title: e.target.value })}
                  className={styles.sectionTitleInput}
                />
                <button
                  type="button"
                  className={styles.removeSectionButton}
                  onClick={() => removeSection(index)}
                  title="Удалить секцию"
                >
                  ×
                </button>
              </div>
              <RichTextEditor
                value={section.text}
                onChange={(val) => updateSection(index, { text: val })}
                minHeight={100}
              />
            </div>
          ))}

          <button type="button" className={styles.addSectionButton} onClick={addSection}>
            + Добавить ещё
          </button>
        </div>

        <SeoSection
          value={{
            seoTitle: formData.seoTitle,
            seoDescription: formData.seoDescription,
            seoKeywords: formData.seoKeywords,
            schemaJson: formData.schemaJson,
          }}
          onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
        />

        <MediaPicker
          open={pickerTarget !== null}
          accept={pickerTarget === 'video' ? 'video' : 'image'}
          onSelect={handlePickFromLibrary}
          onClose={() => setPickerTarget(null)}
        />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate('/content/vr-games')}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={saving || uploadingVideo || uploadingGallery}
          >
            {uploadingGallery
              ? 'Загрузка фото...'
              : saving
                ? 'Сохранение...'
                : isEdit
                  ? 'Сохранить'
                  : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}

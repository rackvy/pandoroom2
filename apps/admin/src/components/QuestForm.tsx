import { useState, useEffect } from 'react';
import { Quest, CreateQuestData, Branch, ContentSection } from '../api/catalog';
import { getBranches } from '../api/catalog';
import { getAgeRestrictions, getDifficulties } from '../api/content';
import { uploadMedia, updateMedia, Media } from '../api/media';
import { getMediaUrl } from '../utils/media';
import QuestScheduleEditor, { ScheduleSlot } from './QuestScheduleEditor';
import RichTextEditor from './ui/RichTextEditor';
import SeoSection from './ui/SeoSection';
import DifficultyIconPicker from './ui/DifficultyIconPicker';
import MediaPicker from './ui/MediaPicker';
import styles from './QuestForm.module.css';

interface QuestFormProps {
  initialData?: Partial<Quest>;
  onSubmit: (data: CreateQuestData, scheduleSlots?: ScheduleSlot[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function QuestForm({ initialData, onSubmit, onCancel, isSubmitting }: QuestFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ageOptions, setAgeOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'Без ограничений' },
  ]);
  const [difficultyOptions, setDifficultyOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'Не указана' },
  ]);
  const [formData, setFormData] = useState<CreateQuestData>({
    branchId: initialData?.branchId || '',
    name: initialData?.name || '',
    genre: initialData?.genre || '',
    difficulty: initialData?.difficulty || '',
    difficultyIcon: initialData?.difficultyIcon || '',
    minPlayers: initialData?.minPlayers || 2,
    maxPlayers: initialData?.maxPlayers || 6,
    maxExtraPlayers: initialData?.maxExtraPlayers ?? 2,
    durationMinutes: initialData?.durationMinutes || 60,
    previewImageId: initialData?.previewImageId || null,
    backgroundImageId: initialData?.backgroundImageId || null,
    contentSections: initialData?.contentSections?.length
      ? initialData.contentSections.map(s => ({ title: s.title, text: s.text }))
      : [{ title: '', text: '' }],
    extraPlayerPrice: initialData?.extraPlayerPrice || 0,
    allowAnimator: initialData?.allowAnimator ?? true,
    animatorPrice: initialData?.animatorPrice || 0,
    sortOrder: initialData?.sortOrder ?? 0,
    hasActors: initialData?.hasActors || false,
    ageRestriction: initialData?.ageRestriction || '',
    subtitle: initialData?.subtitle || '',
    galleryPhotoIds: initialData?.galleryPhotos?.map(p => p.imageId) || [],
    seoTitle: initialData?.seoTitle || '',
    seoDescription: initialData?.seoDescription || '',
    seoKeywords: initialData?.seoKeywords || '',
    schemaJson: initialData?.schemaJson || '',
  });

  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const [backgroundMedia, setBackgroundMedia] = useState<Media | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'preview' | 'background' | 'gallery' | null>(null);
  // Gallery: items with id are existing/library photos, items with file are uploaded on submit
  const [galleryItems, setGalleryItems] = useState<{ id?: string; url: string; file?: File }[]>(
    initialData?.galleryPhotos?.map(p => ({ id: p.imageId, url: getMediaUrl(p.image.url) })) || []
  );
  const [previewAltText, setPreviewAltText] = useState(initialData?.previewImage?.altText || '');
  const [backgroundAltText, setBackgroundAltText] = useState(initialData?.backgroundImage?.altText || '');
  
  // Schedule slots (only for new quests)
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
    getAgeRestrictions()
      .then((items) => {
        const opts = [
          { value: '', label: 'Без ограничений' },
          ...items.map((item) => ({ value: item.value, label: item.value })),
        ];
        const current = initialData?.ageRestriction || '';
        if (current && !opts.some((o) => o.value === current)) {
          opts.push({ value: current, label: current });
        }
        setAgeOptions(opts);
      })
      .catch(console.error);
    getDifficulties()
      .then((items) => {
        const opts = [
          { value: '', label: 'Не указана' },
          ...items.map((item) => ({ value: item.value, label: item.value })),
        ];
        const current = initialData?.difficulty || '';
        if (current && !opts.some((o) => o.value === current)) {
          opts.push({ value: current, label: current });
        }
        setDifficultyOptions(opts);
      })
      .catch(console.error);
  }, []);

  const handleChange = (field: keyof CreateQuestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CreateQuestData, value: string) => {
    const num = parseInt(value) || 0;
    handleChange(field, num);
  };

  const updateSection = (index: number, patch: Partial<ContentSection>) => {
    setFormData(prev => ({
      ...prev,
      contentSections: (prev.contentSections || []).map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }));
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      contentSections: [...(prev.contentSections || []), { title: '', text: '' }],
    }));
  };

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contentSections: (prev.contentSections || []).filter((_, i) => i !== index),
    }));
  };

  const handlePreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewImageFile(file);
      setPreviewMedia(null);
    }
  };

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      setBackgroundMedia(null);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryItems(prev => [
        ...prev,
        ...files.map(file => ({ url: URL.createObjectURL(file), file })),
      ]);
    }
    e.target.value = '';
  };

  const removeGalleryImage = (index: number) => {
    setGalleryItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePickFromLibrary = (media: Media) => {
    if (pickerTarget === 'preview') {
      setPreviewMedia(media);
      setPreviewImageFile(null);
      setPreviewAltText(media.altText || '');
      handleChange('previewImageId', media.id);
    } else if (pickerTarget === 'background') {
      setBackgroundMedia(media);
      setBackgroundImageFile(null);
      setBackgroundAltText(media.altText || '');
      handleChange('backgroundImageId', media.id);
    } else if (pickerTarget === 'gallery') {
      setGalleryItems(prev => {
        if (prev.some(item => item.id === media.id)) return prev; // no duplicates
        return [...prev, { id: media.id, url: getMediaUrl(media.url) }];
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = { ...formData };

    // Preview image: new file upload > library pick > unchanged
    if (previewImageFile) {
      try {
        const media = await uploadMedia(previewImageFile, previewAltText || undefined);
        submitData.previewImageId = media.id;
      } catch (error) {
        console.error('Failed to upload preview image:', error);
        alert('Ошибка загрузки превью изображения');
        return;
      }
    } else if (previewMedia) {
      submitData.previewImageId = previewMedia.id;
      if (previewAltText.trim() !== (previewMedia.altText || '')) {
        try {
          await updateMedia(previewMedia.id, { altText: previewAltText.trim() });
        } catch (error) {
          console.error('Failed to update preview alt text:', error);
        }
      }
    }

    // Background image: new file upload > library pick > unchanged
    if (backgroundImageFile) {
      try {
        const media = await uploadMedia(backgroundImageFile, backgroundAltText || undefined);
        submitData.backgroundImageId = media.id;
      } catch (error) {
        console.error('Failed to upload background image:', error);
        alert('Ошибка загрузки фонового изображения');
        return;
      }
    } else if (backgroundMedia) {
      submitData.backgroundImageId = backgroundMedia.id;
      if (backgroundAltText.trim() !== (backgroundMedia.altText || '')) {
        try {
          await updateMedia(backgroundMedia.id, { altText: backgroundAltText.trim() });
        } catch (error) {
          console.error('Failed to update background alt text:', error);
        }
      }
    }

    // Gallery: full ordered list — existing/library ids kept, new files uploaded
    try {
      const galleryPhotoIds: string[] = [];
      for (const item of galleryItems) {
        if (item.id) {
          galleryPhotoIds.push(item.id);
        } else if (item.file) {
          const media = await uploadMedia(item.file);
          galleryPhotoIds.push(media.id);
        }
      }
      submitData.galleryPhotoIds = galleryPhotoIds;
    } catch (error) {
      console.error('Failed to upload gallery images:', error);
      alert('Ошибка загрузки галереи');
      return;
    }

    // Pass schedule slots only for new quests
    onSubmit(submitData, initialData ? undefined : scheduleSlots);
  };

  return (
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
          <label htmlFor="branchId">Филиал *</label>
          <select
            id="branchId"
            value={formData.branchId}
            onChange={(e) => handleChange('branchId', e.target.value)}
            required
          >
            <option value="">Выберите филиал</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="genre">Жанр</label>
          <input
            id="genre"
            type="text"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            placeholder="Например: Хоррор, Детектив"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="difficulty">Сложность</label>
          <select
            id="difficulty"
            value={formData.difficulty || ''}
            onChange={(e) => handleChange('difficulty', e.target.value)}
          >
            {difficultyOptions.map(opt => (
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
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="Краткий подзаголовок квеста"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="ageRestriction">Возрастное ограничение</label>
          <select
            id="ageRestriction"
            value={formData.ageRestriction || ''}
            onChange={(e) => handleChange('ageRestriction', e.target.value)}
          >
            {ageOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.hasActors || false}
              onChange={(e) => handleChange('hasActors', e.target.checked)}
            />
            С актёрами
          </label>
        </div>

        <div className={styles.field}>
          <label htmlFor="minPlayers">Мин. игроков</label>
          <input
            id="minPlayers"
            type="number"
            min={1}
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
            value={formData.maxPlayers}
            onChange={(e) => handleNumberChange('maxPlayers', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="maxExtraPlayers">Макс. доп. участников</label>
          <input
            id="maxExtraPlayers"
            type="number"
            min={0}
            max={10}
            value={formData.maxExtraPlayers}
            onChange={(e) => handleNumberChange('maxExtraPlayers', e.target.value)}
          />
          <span className={styles.fieldHint}>Сколько доп. игроков можно добавить сверх мин. (обычно 1-2)</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="durationMinutes">Длительность (мин)</label>
          <input
            id="durationMinutes"
            type="number"
            min={5}
            step={5}
            value={formData.durationMinutes}
            onChange={(e) => handleNumberChange('durationMinutes', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="extraPlayerPrice">Цена за доп. игрока</label>
          <input
            id="extraPlayerPrice"
            type="number"
            min={0}
            value={formData.extraPlayerPrice}
            onChange={(e) => handleNumberChange('extraPlayerPrice', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.allowAnimator || false}
              onChange={(e) => handleChange('allowAnimator', e.target.checked)}
            />
            Аниматор доступен
          </label>
        </div>

        {formData.allowAnimator && (
          <div className={styles.field}>
            <label htmlFor="animatorPrice">Цена аниматора</label>
            <input
              id="animatorPrice"
              type="number"
              min={0}
              value={formData.animatorPrice}
              onChange={(e) => handleNumberChange('animatorPrice', e.target.value)}
            />
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="sortOrder">Порядок отображения</label>
          <input
            id="sortOrder"
            type="number"
            min={0}
            value={formData.sortOrder}
            onChange={(e) => handleNumberChange('sortOrder', e.target.value)}
          />
          <span className={styles.fieldHint}>Чем меньше число, тем выше квест в списке</span>
        </div>
      </div>

      <div className={styles.imagesSection}>
        <h3>Изображения</h3>
        
        <div className={styles.imageUploads}>
          <div className={styles.imageField}>
            <label>Превью изображение</label>
            <div className={styles.imagePreview}>
              {(previewImageFile || previewMedia || initialData?.previewImage) && (
                <img 
                  src={
                    previewImageFile
                      ? URL.createObjectURL(previewImageFile)
                      : previewMedia
                        ? getMediaUrl(previewMedia.url)
                        : getMediaUrl(initialData?.previewImage?.url)
                  }
                  alt="Preview" 
                />
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
              {(backgroundImageFile || backgroundMedia || initialData?.backgroundImage) && (
                <img 
                  src={
                    backgroundImageFile
                      ? URL.createObjectURL(backgroundImageFile)
                      : backgroundMedia
                        ? getMediaUrl(backgroundMedia.url)
                        : getMediaUrl(initialData?.backgroundImage?.url)
                  }
                  alt="Background" 
                />
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

        <div className={styles.gallerySection}>
          <label>Галерея фотографий</label>
          <div className={styles.galleryGrid}>
            {galleryItems.map((item, index) => (
              <div key={index} className={styles.galleryItem}>
                <img src={item.url} alt={`Gallery ${index + 1}`} />
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeGalleryImage(index)}
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
        </div>
      </div>

      <div className={styles.textareas}>
        <div className={styles.sectionsHeader}>
          <h3>Контент (табы на странице квеста)</h3>
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

      {/* Schedule Editor - only for new quests */}
      {!initialData && (
        <QuestScheduleEditor
          slots={scheduleSlots}
          onChange={setScheduleSlots}
        />
      )}

      <SeoSection
        value={{
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          seoKeywords: formData.seoKeywords,
          schemaJson: formData.schemaJson,
        }}
        onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
      />

      <MediaPicker
        open={pickerTarget !== null}
        accept="image"
        onSelect={handlePickFromLibrary}
        onClose={() => setPickerTarget(null)}
      />

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Отмена
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохранение...' : (initialData ? 'Сохранить' : 'Создать')}
        </button>
      </div>
    </form>
  );
}

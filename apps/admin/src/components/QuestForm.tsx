import { useState, useEffect } from 'react';
import { Quest, CreateQuestData, Branch } from '../api/catalog';
import { getBranches } from '../api/catalog';
import { uploadMedia, Media } from '../api/media';
import { getMediaUrl } from '../utils/media';
import QuestScheduleEditor, { ScheduleSlot } from './QuestScheduleEditor';
import styles from './QuestForm.module.css';

interface QuestFormProps {
  initialData?: Partial<Quest>;
  onSubmit: (data: CreateQuestData, scheduleSlots?: ScheduleSlot[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Легкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];

export default function QuestForm({ initialData, onSubmit, onCancel, isSubmitting }: QuestFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState<CreateQuestData>({
    branchId: initialData?.branchId || '',
    name: initialData?.name || '',
    genre: initialData?.genre || '',
    difficulty: initialData?.difficulty || 'medium',
    address: initialData?.address || '',
    minPlayers: initialData?.minPlayers || 2,
    maxPlayers: initialData?.maxPlayers || 6,
    durationMinutes: initialData?.durationMinutes || 60,
    previewImageId: initialData?.previewImageId || null,
    backgroundImageId: initialData?.backgroundImageId || null,
    description: initialData?.description || '',
    rules: initialData?.rules || '',
    safety: initialData?.safety || '',
    extraServices: initialData?.extraServices || '',
    extraPlayerPrice: initialData?.extraPlayerPrice || 0,
    galleryPhotoIds: initialData?.galleryPhotos?.map(p => p.imageId) || [],
  });

  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>(
    initialData?.galleryPhotos?.map(p => getMediaUrl(p.image.url)) || []
  );
  
  // Schedule slots (only for new quests)
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
  }, []);

  const handleChange = (field: keyof CreateQuestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CreateQuestData, value: string) => {
    const num = parseInt(value) || 0;
    handleChange(field, num);
  };

  const handlePreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewImageFile(file);
    }
  };

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      galleryPhotoIds: prev.galleryPhotoIds?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = { ...formData };

    // Upload preview image if changed
    if (previewImageFile) {
      try {
        const media = await uploadMedia(previewImageFile);
        submitData.previewImageId = media.id;
      } catch (error) {
        console.error('Failed to upload preview image:', error);
        alert('Ошибка загрузки превью изображения');
        return;
      }
    }

    // Upload background image if changed
    if (backgroundImageFile) {
      try {
        const media = await uploadMedia(backgroundImageFile);
        submitData.backgroundImageId = media.id;
      } catch (error) {
        console.error('Failed to upload background image:', error);
        alert('Ошибка загрузки фонового изображения');
        return;
      }
    }

    // Upload new gallery images
    if (galleryImageFiles.length > 0) {
      try {
        const uploadedIds = await Promise.all(
          galleryImageFiles.map(file => uploadMedia(file).then((media: Media) => media.id))
        );
        submitData.galleryPhotoIds = [...(submitData.galleryPhotoIds || []), ...uploadedIds];
      } catch (error) {
        console.error('Failed to upload gallery images:', error);
        alert('Ошибка загрузки галереи');
        return;
      }
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
            value={formData.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
          >
            {DIFFICULTY_OPTIONS.map(opt => (
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
          <label htmlFor="durationMinutes">Длительность (мин)</label>
          <input
            id="durationMinutes"
            type="number"
            min={15}
            step={15}
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
      </div>

      <div className={styles.field}>
        <label htmlFor="address">Адрес</label>
        <input
          id="address"
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>

      <div className={styles.imagesSection}>
        <h3>Изображения</h3>
        
        <div className={styles.imageUploads}>
          <div className={styles.imageField}>
            <label>Превью изображение</label>
            <div className={styles.imagePreview}>
              {(previewImageFile || initialData?.previewImage) && (
                <img 
                  src={previewImageFile ? URL.createObjectURL(previewImageFile) : getMediaUrl(initialData?.previewImage?.url)} 
                  alt="Preview" 
                />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePreviewImageChange}
            />
          </div>

          <div className={styles.imageField}>
            <label>Фоновое изображение</label>
            <div className={styles.imagePreview}>
              {(backgroundImageFile || initialData?.backgroundImage) && (
                <img 
                  src={backgroundImageFile ? URL.createObjectURL(backgroundImageFile) : getMediaUrl(initialData?.backgroundImage?.url)} 
                  alt="Background" 
                />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundImageChange}
            />
          </div>
        </div>

        <div className={styles.gallerySection}>
          <label>Галерея фотографий</label>
          <div className={styles.galleryGrid}>
            {galleryPreviews.map((url, index) => (
              <div key={index} className={styles.galleryItem}>
                <img src={url} alt={`Gallery ${index + 1}`} />
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
          </div>
        </div>
      </div>

      <div className={styles.textareas}>
        <div className={styles.field}>
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="rules">Правила</label>
          <textarea
            id="rules"
            rows={3}
            value={formData.rules}
            onChange={(e) => handleChange('rules', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="safety">Безопасность</label>
          <textarea
            id="safety"
            rows={3}
            value={formData.safety}
            onChange={(e) => handleChange('safety', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="extraServices">Доп. услуги</label>
          <textarea
            id="extraServices"
            rows={3}
            value={formData.extraServices}
            onChange={(e) => handleChange('extraServices', e.target.value)}
          />
        </div>
      </div>

      {/* Schedule Editor - only for new quests */}
      {!initialData && (
        <QuestScheduleEditor
          slots={scheduleSlots}
          onChange={setScheduleSlots}
        />
      )}

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

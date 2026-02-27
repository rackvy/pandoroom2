import { useState } from 'react';
import styles from './ItemSelectorModal.module.css';

export interface SelectableItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
}

interface ItemSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SelectableItem, extraData: Record<string, any>) => void;
  title: string;
  items: SelectableItem[];
  extraFields?: {
    name: string;
    label: string;
    type: 'text' | 'number' | 'time';
    defaultValue?: string | number;
    required?: boolean;
  }[];
}

export default function ItemSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title,
  items,
  extraFields = [],
}: ItemSelectorModalProps) {
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  const [extraData, setExtraData] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: SelectableItem) => {
    setSelectedItem(item);
    // Initialize extra fields with defaults
    const defaults: Record<string, any> = {};
    extraFields.forEach(field => {
      defaults[field.name] = field.defaultValue ?? (field.type === 'number' ? 1 : '');
    });
    setExtraData(defaults);
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    onSelect(selectedItem, extraData);
    setSelectedItem(null);
    setExtraData({});
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelectedItem(null);
    setExtraData({});
    setSearch('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {!selectedItem ? (
          <div className={styles.itemsList}>
            {filteredItems.length === 0 ? (
              <div className={styles.empty}>Ничего не найдено</div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  className={styles.itemCard}
                  onClick={() => handleSelect(item)}
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
                  )}
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{item.name}</div>
                    {item.description && (
                      <div className={styles.itemDesc}>{item.description}</div>
                    )}
                    {item.price !== undefined && (
                      <div className={styles.itemPrice}>{item.price.toLocaleString()} ₽</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.detailsForm}>
            <div className={styles.selectedItem}>
              <strong>{selectedItem.name}</strong>
              {selectedItem.price !== undefined && (
                <span> — {selectedItem.price.toLocaleString()} ₽</span>
              )}
            </div>
            
            {extraFields.map(field => (
              <div key={field.name} className={styles.field}>
                <label>{field.label}</label>
                <input
                  type={field.type}
                  value={extraData[field.name] ?? ''}
                  onChange={e => setExtraData({
                    ...extraData,
                    [field.name]: field.type === 'number' 
                      ? parseFloat(e.target.value) || 0 
                      : e.target.value
                  })}
                  className={styles.input}
                />
              </div>
            ))}

            <div className={styles.actions}>
              <button className={styles.backBtn} onClick={() => setSelectedItem(null)}>
                ← Назад к списку
              </button>
              <button className={styles.confirmBtn} onClick={handleConfirm}>
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

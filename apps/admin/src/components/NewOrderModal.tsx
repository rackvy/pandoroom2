import { useState, useEffect } from 'react';
import { getBranches, getTablesSchedule, Table, TableZone, QuestSlot } from '../api/schedule';
import api from '../lib/axios';
import TableSelectorModal from './schedule/TableSelectorModal';
import QuestSelectorModal from './schedule/QuestSelectorModal';
import ItemSelectorModal, { SelectableItem } from './schedule/ItemSelectorModal';
import { toast } from './ui/Toast';
import styles from './NewOrderModal.module.css';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

interface SelectedTable {
  tableId: string;
  tableTitle: string;
  zoneName: string;
  startTime: string;
  endTime: string;
}

interface SelectedQuest {
  questId: string;
  questName: string;
  startTime: string;
}

interface SelectedCake {
  cakeId: string;
  cakeName: string;
  weightKg: number;
  inscription: string;
}

interface SelectedDecoration {
  decorationId: string;
  decorationName: string;
  quantity: number;
}

interface SelectedFood {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  servingTime: string;
}

interface SelectedExtra {
  showProgramId?: string;
  showProgramName?: string;
  supplierId?: string;
  supplierName?: string;
  startTime: string;
  endTime: string;
}

export default function NewOrderModal({ isOpen, onClose, onSuccess }: NewOrderModalProps) {
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('10:00');
  
  // Selector modals
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showQuestSelector, setShowQuestSelector] = useState(false);
  
  // Client info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [birthdayPersonAge, setBirthdayPersonAge] = useState('');
  const [guestsKids, setGuestsKids] = useState('');
  const [guestsAdults, setGuestsAdults] = useState('');
  const [comment, setComment] = useState('');
  
  // Selected items
  const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
  const [selectedQuests, setSelectedQuests] = useState<SelectedQuest[]>([]);
  const [selectedCakes, setSelectedCakes] = useState<SelectedCake[]>([]);
  const [selectedDecorations, setSelectedDecorations] = useState<SelectedDecoration[]>([]);
  const [selectedFood, setSelectedFood] = useState<SelectedFood[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  
  // Available options
  const [availableCakes, setAvailableCakes] = useState<any[]>([]);
  const [availableDecorations, setAvailableDecorations] = useState<any[]>([]);
  const [availableFood, setAvailableFood] = useState<any[]>([]);
  const [availableShowPrograms, setAvailableShowPrograms] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      loadCatalogData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBranch && eventDate) {
      loadTables();
    }
  }, [selectedBranch, eventDate]);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadCatalogData = async () => {
    try {
      const [, cakesRes, decorRes, foodRes, showRes, suppliersRes] = await Promise.all([
        api.get('/api/admin/catalog/quests'),
        api.get('/api/admin/catalog/cakes'),
        api.get('/api/admin/catalog/decorations'),
        api.get('/api/admin/catalog/food-menu'),
        api.get('/api/admin/catalog/show-programs'),
        api.get('/api/admin/catalog/suppliers'),
      ]);
      // Quests loaded via selector modal
      setAvailableCakes(cakesRes.data);
      setAvailableDecorations(decorRes.data);
      setAvailableFood(foodRes.data);
      setAvailableShowPrograms(showRes.data);
      setAvailableSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    }
  };

  const loadTables = async () => {
    if (!selectedBranch || !eventDate) return;
    try {
      // Tables loaded via selector modals
      await getTablesSchedule(selectedBranch, eventDate);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const handleAddTable = () => {
    if (!selectedBranch || !eventDate) {
      return;
    }
    setShowTableSelector(true);
  };
  
  const handleTableSelected = (table: Table, zone: TableZone, startTime: string, endTime: string) => {
    setSelectedTables([...selectedTables, {
      tableId: table.id,
      tableTitle: table.title,
      zoneName: zone.name,
      startTime,
      endTime,
    }]);
  };

  const handleRemoveTable = (index: number) => {
    setSelectedTables(selectedTables.filter((_, i) => i !== index));
  };

  const handleAddQuest = () => {
    if (!selectedBranch || !eventDate) {
      return;
    }
    setShowQuestSelector(true);
  };
  
  const handleQuestSelected = (questId: string, questName: string, slot: QuestSlot) => {
    setSelectedQuests([...selectedQuests, {
      questId,
      questName,
      startTime: slot.startTime,
    }]);
  };

  const handleRemoveQuest = (index: number) => {
    setSelectedQuests(selectedQuests.filter((_, i) => i !== index));
  };

  const [showCakeSelector, setShowCakeSelector] = useState(false);
  
  const handleAddCake = () => {
    setShowCakeSelector(true);
  };
  
  const handleCakeSelected = (item: SelectableItem, extraData: Record<string, any>) => {
    setSelectedCakes([...selectedCakes, {
      cakeId: item.id,
      cakeName: item.name,
      weightKg: extraData.weightKg || 2,
      inscription: extraData.inscription || '',
    }]);
  };

  const handleRemoveCake = (index: number) => {
    setSelectedCakes(selectedCakes.filter((_, i) => i !== index));
  };

  const [showDecorationSelector, setShowDecorationSelector] = useState(false);
  
  const handleAddDecoration = () => {
    setShowDecorationSelector(true);
  };
  
  const handleDecorationSelected = (item: SelectableItem, extraData: Record<string, any>) => {
    setSelectedDecorations([...selectedDecorations, {
      decorationId: item.id,
      decorationName: item.name,
      quantity: extraData.quantity || 1,
    }]);
  };

  const handleRemoveDecoration = (index: number) => {
    setSelectedDecorations(selectedDecorations.filter((_, i) => i !== index));
  };

  const [showFoodSelector, setShowFoodSelector] = useState(false);
  
  const handleAddFood = () => {
    setShowFoodSelector(true);
  };
  
  const handleFoodSelected = (item: SelectableItem, extraData: Record<string, any>) => {
    setSelectedFood([...selectedFood, {
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: extraData.quantity || 1,
      servingTime: extraData.servingTime || '15:00',
    }]);
  };

  const handleRemoveFood = (index: number) => {
    setSelectedFood(selectedFood.filter((_, i) => i !== index));
  };

  const [showShowSelector, setShowShowSelector] = useState(false);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);
  
  const handleAddShow = () => {
    setShowShowSelector(true);
  };
  
  const handleShowSelected = (item: SelectableItem, extraData: Record<string, any>) => {
    setSelectedExtras([...selectedExtras, {
      showProgramId: item.id,
      showProgramName: item.name,
      startTime: extraData.startTime || '15:00',
      endTime: extraData.endTime || '16:00',
    }]);
  };
  
  const handleAddSupplier = () => {
    setShowSupplierSelector(true);
  };
  
  const handleSupplierSelected = (item: SelectableItem, extraData: Record<string, any>) => {
    setSelectedExtras([...selectedExtras, {
      supplierId: item.id,
      supplierName: item.name,
      startTime: extraData.startTime || '15:00',
      endTime: extraData.endTime || '16:00',
    }]);
  };

  const handleRemoveExtra = (index: number) => {
    setSelectedExtras(selectedExtras.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedBranch || !eventDate || !clientName) {
      toast.error('Заполните обязательные поля: филиал, дата, имя клиента');
      return;
    }
    
    if (selectedTables.length === 0 && selectedQuests.length === 0) {
      toast.error('Добавьте хотя бы один стол или квест');
      return;
    }
    
    setSaving(true);
    try {
      // Create booking
      const bookingRes = await api.post('/api/admin/bookings', {
        branchId: selectedBranch,
        eventDate,
        clientName,
        clientPhone,
        birthdayPersonName: birthdayPersonName || null,
        birthdayPersonAge: birthdayPersonAge ? parseInt(birthdayPersonAge) : null,
        guestsKids: guestsKids ? parseInt(guestsKids) : null,
        guestsAdults: guestsAdults ? parseInt(guestsAdults) : null,
        depositRub: 0,
        commentClient: comment,
        status: 'draft',
      });
      
      const bookingId = bookingRes.data.id;
      
      // Add tables
      for (const table of selectedTables) {
        await api.post(`/api/admin/bookings/${bookingId}/table-slots`, {
          tableId: table.tableId,
          startTime: table.startTime,
          endTime: table.endTime,
        });
      }
      
      // Add quests
      for (const quest of selectedQuests) {
        await api.post(`/api/admin/bookings/${bookingId}/quest-slots`, {
          questId: quest.questId,
          startTime: quest.startTime,
        });
      }
      
      // Add cakes
      for (const cake of selectedCakes) {
        await api.post(`/api/admin/bookings/${bookingId}/cakes`, {
          cakeId: cake.cakeId,
          weightKg: cake.weightKg,
          inscription: cake.inscription || null,
        });
      }
      
      // Add decorations
      for (const decor of selectedDecorations) {
        await api.post(`/api/admin/bookings/${bookingId}/decorations`, {
          decorationId: decor.decorationId,
          quantity: decor.quantity,
        });
      }
      
      // Add food
      for (const food of selectedFood) {
        await api.post(`/api/admin/bookings/${bookingId}/food`, {
          menuItemId: food.menuItemId,
          menuItemName: food.menuItemName,
          title: food.menuItemName,
          quantity: food.quantity,
          servingTime: food.servingTime,
        });
      }
      
      // Add extras
      for (const extra of selectedExtras) {
        await api.post(`/api/admin/bookings/${bookingId}/extra-slots`, {
          showProgramId: extra.showProgramId || null,
          supplierId: extra.supplierId || null,
          startTime: extra.startTime,
          endTime: extra.endTime,
        });
      }
      
      toast.success('Заказ успешно создан');
      onSuccess(bookingId);
      resetForm();
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      toast.error(error.response?.data?.message || 'Ошибка создания заказа');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBranch('');
    setEventDate('');
    setClientName('');
    setClientPhone('');
    setBirthdayPersonName('');
    setBirthdayPersonAge('');
    setGuestsKids('');
    setGuestsAdults('');
    setComment('');
    setSelectedTables([]);
    setSelectedQuests([]);
    setSelectedCakes([]);
    setSelectedDecorations([]);
    setSelectedFood([]);
    setSelectedExtras([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Новый заказ</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className={styles.step}>
              <h3>1. Основная информация</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Филиал *</label>
                  <select 
                    value={selectedBranch} 
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    <option value="">Выберите филиал</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Дата мероприятия *</label>
                  <input 
                    type="date" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className={styles.formGroupSmall}>
                  <label>Время начала *</label>
                  <select
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).flatMap(h => 
                      [0, 30].map(m => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
                    ).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Имя клиента *</label>
                  <input 
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Анжелика"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Телефон</label>
                  <input 
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+7 984 123 45 67"
                  />
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Именинник</label>
                  <input 
                    type="text"
                    value={birthdayPersonName}
                    onChange={(e) => setBirthdayPersonName(e.target.value)}
                    placeholder="Иван"
                  />
                </div>
                <div className={styles.formGroupSmall}>
                  <label>Возраст</label>
                  <input 
                    type="number"
                    value={birthdayPersonAge}
                    onChange={(e) => setBirthdayPersonAge(e.target.value)}
                    placeholder="7"
                  />
                </div>
                <div className={styles.formGroupSmall}>
                  <label>Детей</label>
                  <input 
                    type="number"
                    value={guestsKids}
                    onChange={(e) => setGuestsKids(e.target.value)}
                    placeholder="12"
                  />
                </div>
                <div className={styles.formGroupSmall}>
                  <label>Взрослых</label>
                  <input 
                    type="number"
                    value={guestsAdults}
                    onChange={(e) => setGuestsAdults(e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Комментарий</label>
                <textarea 
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Часть гостей придет сразу, часть через час..."
                />
              </div>
              
              <div className={styles.stepActions}>
                <button 
                  className={styles.nextButton}
                  onClick={() => setStep(2)}
                  disabled={!selectedBranch || !eventDate || !clientName}
                >
                  Далее →
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Tables & Quests */}
          {step === 2 && (
            <div className={styles.step}>
              <h3>2. Столы и квесты</h3>
              
              <div className={styles.section}>
                <h4>Столы</h4>
                {selectedTables.map((table, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>{table.zoneName} / {table.tableTitle}</span>
                    <span className={styles.itemTime}>{table.startTime} — {table.endTime}</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveTable(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addButton} onClick={handleAddTable}>
                  + добавить стол
                </button>
              </div>
              
              <div className={styles.section}>
                <h4>Квесты</h4>
                {selectedQuests.map((quest, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>{quest.questName}</span>
                    <span className={styles.itemTime}>{quest.startTime}</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveQuest(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addButton} onClick={handleAddQuest}>
                  + добавить квест
                </button>
              </div>
              
              <div className={styles.stepActions}>
                <button className={styles.backButton} onClick={() => setStep(1)}>
                  ← Назад
                </button>
                <button 
                  className={styles.nextButton}
                  onClick={() => setStep(3)}
                  disabled={selectedTables.length === 0 && selectedQuests.length === 0}
                >
                  Далее →
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Add-ons */}
          {step === 3 && (
            <div className={styles.step}>
              <h3>3. Дополнения</h3>
              
              <div className={styles.section}>
                <h4>Торты</h4>
                {selectedCakes.map((cake, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>{cake.cakeName} {cake.weightKg} кг</span>
                    {cake.inscription && <span className={styles.itemDetail}>"{cake.inscription}"</span>}
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveCake(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addButton} onClick={handleAddCake}>
                  + добавить торт
                </button>
              </div>
              
              <div className={styles.section}>
                <h4>Украшения зала</h4>
                {selectedDecorations.map((decor, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>{decor.decorationName}</span>
                    <span className={styles.itemDetail}>{decor.quantity} шт</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveDecoration(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addButton} onClick={handleAddDecoration}>
                  + добавить украшение
                </button>
              </div>
              
              <div className={styles.section}>
                <h4>Еда и напитки</h4>
                {selectedFood.map((food, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>{food.menuItemName}</span>
                    <span className={styles.itemDetail}>{food.quantity} шт в {food.servingTime}</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveFood(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addButton} onClick={handleAddFood}>
                  + добавить блюдо
                </button>
              </div>
              
              <div className={styles.section}>
                <h4>Доп. развлечения</h4>
                {selectedExtras.map((extra, idx) => (
                  <div key={idx} className={styles.selectedItem}>
                    <span className={styles.itemTag}>
                      {extra.showProgramName || extra.supplierName}
                    </span>
                    <span className={styles.itemTime}>{extra.startTime} — {extra.endTime}</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveExtra(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className={styles.addButtonsRow}>
                  <button className={styles.addButton} onClick={handleAddShow}>
                    + шоу-программа
                  </button>
                  <button className={styles.addButton} onClick={handleAddSupplier}>
                    + поставщик
                  </button>
                </div>
              </div>
              
              <div className={styles.stepActions}>
                <button className={styles.backButton} onClick={() => setStep(2)}>
                  ← Назад
                </button>
                <button 
                  className={styles.saveButton}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? 'Создание...' : 'Создать заказ'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selector Modals */}
        <TableSelectorModal
          isOpen={showTableSelector}
          onClose={() => setShowTableSelector(false)}
          onSelect={handleTableSelected}
          branchId={selectedBranch}
          eventDate={eventDate}
          startTime={eventStartTime}
        />
        
        <QuestSelectorModal
          isOpen={showQuestSelector}
          onClose={() => setShowQuestSelector(false)}
          onSelect={handleQuestSelected}
          branchId={selectedBranch}
          eventDate={eventDate}
          startTime={eventStartTime}
        />
        
        <ItemSelectorModal
          isOpen={showCakeSelector}
          onClose={() => setShowCakeSelector(false)}
          onSelect={handleCakeSelected}
          title="Выберите торт"
          items={availableCakes.map((c: any) => ({ id: c.id, name: c.name, price: c.basePrice }))}
          extraFields={[
            { name: 'weightKg', label: 'Вес (кг)', type: 'number', defaultValue: 2 },
            { name: 'inscription', label: 'Надпись', type: 'text' },
          ]}
        />
        
        <ItemSelectorModal
          isOpen={showDecorationSelector}
          onClose={() => setShowDecorationSelector(false)}
          onSelect={handleDecorationSelected}
          title="Выберите украшение"
          items={availableDecorations.map((d: any) => ({ id: d.id, name: d.name, price: d.price }))}
          extraFields={[
            { name: 'quantity', label: 'Количество', type: 'number', defaultValue: 1 },
          ]}
        />
        
        <ItemSelectorModal
          isOpen={showFoodSelector}
          onClose={() => setShowFoodSelector(false)}
          onSelect={handleFoodSelected}
          title="Выберите блюдо"
          items={availableFood.map((f: any) => ({ id: f.id, name: f.name, price: f.price }))}
          extraFields={[
            { name: 'quantity', label: 'Количество', type: 'number', defaultValue: 1 },
            { name: 'servingTime', label: 'Время подачи', type: 'time', defaultValue: '15:00' },
          ]}
        />
        
        <ItemSelectorModal
          isOpen={showShowSelector}
          onClose={() => setShowShowSelector(false)}
          onSelect={handleShowSelected}
          title="Выберите шоу-программу"
          items={availableShowPrograms.map((s: any) => ({ id: s.id, name: s.name, price: s.price }))}
          extraFields={[
            { name: 'startTime', label: 'Время начала', type: 'time', defaultValue: '15:00' },
            { name: 'endTime', label: 'Время окончания', type: 'time', defaultValue: '16:00' },
          ]}
        />
        
        <ItemSelectorModal
          isOpen={showSupplierSelector}
          onClose={() => setShowSupplierSelector(false)}
          onSelect={handleSupplierSelected}
          title="Выберите поставщика"
          items={availableSuppliers.map((s: any) => ({ id: s.id, name: s.name }))}
          extraFields={[
            { name: 'startTime', label: 'Время начала', type: 'time', defaultValue: '15:00' },
            { name: 'endTime', label: 'Время окончания', type: 'time', defaultValue: '16:00' },
          ]}
        />
      </div>
    </div>
  );
}

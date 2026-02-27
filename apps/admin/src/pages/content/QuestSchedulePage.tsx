import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quest, getQuests } from '../../api/catalog';
import {
  QuestScheduleSlot,
  DAY_NAMES,
  getQuestScheduleSlots,
  createQuestScheduleSlot,
  updateQuestScheduleSlot,
  deleteQuestScheduleSlot,
  createSpecialPrice,
  deleteSpecialPrice,
  getPublicQuestSchedule,
} from '../../api/questSchedule';
import { toast } from '../../components/ui/Toast';
import { confirm } from '../../components/ui/ConfirmDialog';
import styles from './QuestSchedulePage.module.css';

const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00'
];

export default function QuestSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string>(id || '');
  const [slots, setSlots] = useState<QuestScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSpecialPriceModal, setShowSpecialPriceModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<QuestScheduleSlot | null>(null);
  
  // Form states
  const [newSlotDay, setNewSlotDay] = useState(0);
  const [newSlotTime, setNewSlotTime] = useState('10:00');
  const [newSlotPrice, setNewSlotPrice] = useState(2500);
  
  const [specialDate, setSpecialDate] = useState('');
  const [specialPrice, setSpecialPrice] = useState(0);
  
  // Special dates management
  const [showSpecialDatesSection, setShowSpecialDatesSection] = useState(false);
  const [selectedSpecialDate, setSelectedSpecialDate] = useState('');
  const [specialDateSlots, setSpecialDateSlots] = useState<any[]>([]);
  const [loadingSpecialDate, setLoadingSpecialDate] = useState(false);
  const [editingSlotPrice, setEditingSlotPrice] = useState<{slotId: string, price: number} | null>(null);

  // Load quests on mount
  useEffect(() => {
    getQuests().then(setQuests).catch(console.error);
  }, []);

  // Load schedule when quest changes
  useEffect(() => {
    if (selectedQuestId) {
      loadSchedule(selectedQuestId);
    }
  }, [selectedQuestId]);

  const loadSchedule = async (questId: string) => {
    try {
      setIsLoading(true);
      const data = await getQuestScheduleSlots(questId);
      setSlots(data);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const slotsByDay = useMemo(() => {
    const grouped: Record<number, QuestScheduleSlot[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    slots.forEach(slot => {
      if (grouped[slot.dayOfWeek]) {
        grouped[slot.dayOfWeek].push(slot);
      }
    });
    // Sort each day by startTime
    Object.keys(grouped).forEach(day => {
      grouped[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [slots]);

  const handleAddSlot = async () => {
    if (!selectedQuestId) return;
    
    try {
      await createQuestScheduleSlot({
        questId: selectedQuestId,
        dayOfWeek: newSlotDay,
        startTime: newSlotTime,
        basePrice: newSlotPrice,
        isActive: true,
      });
      setShowAddModal(false);
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to add slot:', error);
      toast.error('Ошибка добавления слота');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const confirmed = await confirm({
      title: 'Удаление слота',
      message: 'Вы уверены, что хотите удалить этот слот?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    
    try {
      await deleteQuestScheduleSlot(slotId);
      toast.success('Слот удален');
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to delete slot:', error);
      toast.error('Ошибка удаления слота');
    }
  };

  const handleToggleSlot = async (slot: QuestScheduleSlot) => {
    try {
      await updateQuestScheduleSlot(slot.id, { isActive: !slot.isActive });
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to toggle slot:', error);
    }
  };

  const handleAddSpecialPrice = async () => {
    if (!selectedSlot || !specialDate) return;
    
    try {
      await createSpecialPrice({
        slotId: selectedSlot.id,
        specialDate,
        specialPrice,
        isAvailable: true,
      });
      setShowSpecialPriceModal(false);
      setSelectedSlot(null);
      setSpecialDate('');
      setSpecialPrice(0);
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to add special price:', error);
      toast.error('Ошибка добавления специальной цены');
    }
  };

  const handleDeleteSpecialPrice = async (priceId: string) => {
    const confirmed = await confirm({
      title: 'Удаление специальной цены',
      message: 'Вы уверены, что хотите удалить специальную цену?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    
    try {
      await deleteSpecialPrice(priceId);
      toast.success('Специальная цена удалена');
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to delete special price:', error);
      toast.error('Ошибка удаления');
    }
  };

  const openSpecialPriceModal = (slot: QuestScheduleSlot) => {
    setSelectedSlot(slot);
    setSpecialPrice(slot.basePrice);
    setShowSpecialPriceModal(true);
  };

  // Load special date schedule
  const handleLoadSpecialDate = async () => {
    if (!selectedQuestId || !selectedSpecialDate) return;
    
    try {
      setLoadingSpecialDate(true);
      const data = await getPublicQuestSchedule(selectedQuestId, selectedSpecialDate);
      setSpecialDateSlots(data);
    } catch (error) {
      console.error('Failed to load special date schedule:', error);
    } finally {
      setLoadingSpecialDate(false);
    }
  };

  // Handle set special price for specific date
  const handleSetSpecialPriceForDate = async (slotId: string, price: number) => {
    if (!selectedSpecialDate) return;
    
    try {
      await createSpecialPrice({
        slotId,
        specialDate: selectedSpecialDate,
        specialPrice: price,
        isAvailable: true,
      });
      setEditingSlotPrice(null);
      // Reload both special date view and all slots
      handleLoadSpecialDate();
      loadSchedule(selectedQuestId);
    } catch (error) {
      console.error('Failed to set special price:', error);
      alert('Ошибка установки специальной цены');
    }
  };

  // Get all special prices across all slots for this quest
  const allSpecialPrices = useMemo(() => {
    const prices: Array<{
      id: string;
      slotId: string;
      dayOfWeek: number;
      startTime: string;
      specialDate: string;
      specialPrice: number;
      isAvailable: boolean;
    }> = [];
    
    slots.forEach(slot => {
      slot.specialPrices.forEach(sp => {
        prices.push({
          id: sp.id,
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          specialDate: sp.specialDate,
          specialPrice: sp.specialPrice,
          isAvailable: sp.isAvailable,
        });
      });
    });
    
    // Sort by date
    return prices.sort((a, b) => a.specialDate.localeCompare(b.specialDate));
  }, [slots]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Расписание квестов</h1>
        <div className={styles.questSelector}>
          <select
            value={selectedQuestId}
            onChange={(e) => {
              setSelectedQuestId(e.target.value);
              if (e.target.value) {
                navigate(`/content/quests/${e.target.value}/schedule`);
              }
            }}
          >
            <option value="">Выберите квест</option>
            {quests.map(quest => (
              <option key={quest.id} value={quest.id}>{quest.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedQuestId ? (
        <>
          <div className={styles.actions}>
            <button
              className={styles.addButton}
              onClick={() => setShowAddModal(true)}
            >
              + Добавить слот
            </button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : (
            <div className={styles.scheduleGrid}>
              {DAY_NAMES.map((dayName, dayIndex) => (
                <div key={dayIndex} className={styles.dayColumn}>
                  <div className={styles.dayHeader}>{dayName}</div>
                  <div className={styles.slotsList}>
                    {slotsByDay[dayIndex].length === 0 ? (
                      <div className={styles.noSlots}>Нет слотов</div>
                    ) : (
                      slotsByDay[dayIndex].map(slot => (
                        <div
                          key={slot.id}
                          className={`${styles.slot} ${!slot.isActive ? styles.inactive : ''}`}
                        >
                          <div className={styles.slotTime}>{slot.startTime}</div>
                          <div className={styles.slotPrice}>{slot.basePrice} ₽</div>
                          <div className={styles.slotActions}>
                            <button
                              className={styles.toggleButton}
                              onClick={() => handleToggleSlot(slot)}
                              title={slot.isActive ? 'Выключить' : 'Включить'}
                            >
                              {slot.isActive ? '✓' : '○'}
                            </button>
                            <button
                              className={styles.specialPriceButton}
                              onClick={() => openSpecialPriceModal(slot)}
                              title="Специальная цена"
                            >
                              ₽
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => handleDeleteSlot(slot.id)}
                              title="Удалить"
                            >
                              ×
                            </button>
                          </div>
                          
                          {/* Special prices */}
                          {slot.specialPrices.length > 0 && (
                            <div className={styles.specialPrices}>
                              {slot.specialPrices.map(sp => (
                                <div key={sp.id} className={styles.specialPrice}>
                                  <span>{sp.specialDate}</span>
                                  <span>{sp.specialPrice} ₽</span>
                                  <button
                                    onClick={() => handleDeleteSpecialPrice(sp.id)}
                                    title="Удалить"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Dates Section */}
          <div className={styles.specialDatesSection}>
            <h3 
              className={styles.specialDatesHeader}
              onClick={() => setShowSpecialDatesSection(!showSpecialDatesSection)}
            >
              Специальные даты {showSpecialDatesSection ? '▼' : '▶'}
            </h3>
            
            {showSpecialDatesSection && (
              <div className={styles.specialDatesContent}>
                {/* Check schedule for specific date */}
                <div className={styles.specialDateCheck}>
                  <h4>Проверить расписание на дату</h4>
                  <div className={styles.specialDateForm}>
                    <input
                      type="date"
                      value={selectedSpecialDate}
                      onChange={(e) => setSelectedSpecialDate(e.target.value)}
                    />
                    <button 
                      className={styles.checkButton}
                      onClick={handleLoadSpecialDate}
                      disabled={!selectedSpecialDate || loadingSpecialDate}
                    >
                      {loadingSpecialDate ? 'Загрузка...' : 'Показать'}
                    </button>
                  </div>
                  
                  {specialDateSlots.length > 0 && (
                    <div className={styles.specialDateSlots}>
                      <h5>Расписание на {selectedSpecialDate}:</h5>
                      <div className={styles.specialSlotsList}>
                        {specialDateSlots.map(slot => (
                          <div 
                            key={slot.id} 
                            className={`${styles.specialSlot} ${!slot.isAvailable ? styles.unavailable : ''}`}
                          >
                            <span className={styles.specialSlotTime}>{slot.startTime}</span>
                            <span className={styles.specialSlotPrice}>
                              {slot.hasSpecialPrice ? (
                                <>
                                  <span className={styles.oldPrice}>{slot.basePrice} ₽</span>
                                  <span className={styles.newPrice}>{slot.finalPrice} ₽</span>
                                </>
                              ) : (
                                <>{slot.finalPrice} ₽</>
                              )}
                            </span>
                            <span className={styles.specialSlotStatus}>
                              {slot.hasSpecialPrice ? 'Спец. цена' : slot.isAvailable ? 'Доступно' : 'Недоступно'}
                            </span>
                            
                            {/* Edit price button or input */}
                            {editingSlotPrice?.slotId === slot.id ? (
                              <div className={styles.quickPriceEdit}>
                                <input
                                  type="number"
                                  value={editingSlotPrice?.price || 0}
                                  onChange={(e) => setEditingSlotPrice(prev => prev ? {...prev, price: Number(e.target.value)} : null)}
                                  min={0}
                                  step={100}
                                  autoFocus
                                />
                                <button 
                                  className={styles.savePriceButton}
                                  onClick={() => editingSlotPrice && handleSetSpecialPriceForDate(slot.id, editingSlotPrice.price)}
                                >
                                  ✓
                                </button>
                                <button 
                                  className={styles.cancelPriceButton}
                                  onClick={() => setEditingSlotPrice(null)}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button 
                                className={styles.setPriceButton}
                                onClick={() => setEditingSlotPrice({slotId: slot.id, price: slot.basePrice})}
                                title={slot.hasSpecialPrice ? 'Изменить спец. цену' : 'Установить спец. цену'}
                              >
                                {slot.hasSpecialPrice ? '✎' : '+ ₽'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* All special prices list */}
                {allSpecialPrices.length > 0 && (
                  <div className={styles.allSpecialPrices}>
                    <h4>Все специальные цены</h4>
                    <table className={styles.specialPricesTable}>
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Время</th>
                          <th>Цена</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSpecialPrices.map(sp => (
                          <tr key={sp.id}>
                            <td>{sp.specialDate}</td>
                            <td>{DAY_NAMES[sp.dayOfWeek]} {sp.startTime}</td>
                            <td>{sp.specialPrice} ₽</td>
                            <td>
                              <button
                                className={styles.deleteButton}
                                onClick={() => handleDeleteSpecialPrice(sp.id)}
                                title="Удалить"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>Выберите квест для управления расписанием</p>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Добавить слот</h3>
            
            <div className={styles.formField}>
              <label>День недели</label>
              <select value={newSlotDay} onChange={(e) => setNewSlotDay(Number(e.target.value))}>
                {DAY_NAMES.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label>Время начала</label>
              <select value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)}>
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label>Базовая цена (₽)</label>
              <input
                type="number"
                value={newSlotPrice}
                onChange={(e) => setNewSlotPrice(Number(e.target.value))}
                min={0}
                step={100}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleAddSlot}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special Price Modal */}
      {showSpecialPriceModal && selectedSlot && (
        <div className={styles.modalOverlay} onClick={() => setShowSpecialPriceModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Специальная цена</h3>
            <p className={styles.modalSubtitle}>
              {DAY_NAMES[selectedSlot.dayOfWeek]} {selectedSlot.startTime} (обычная цена: {selectedSlot.basePrice} ₽)
            </p>
            
            <div className={styles.formField}>
              <label>Дата</label>
              <input
                type="date"
                value={specialDate}
                onChange={(e) => setSpecialDate(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label>Специальная цена (₽)</label>
              <input
                type="number"
                value={specialPrice}
                onChange={(e) => setSpecialPrice(Number(e.target.value))}
                min={0}
                step={100}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowSpecialPriceModal(false)}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleAddSpecialPrice}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

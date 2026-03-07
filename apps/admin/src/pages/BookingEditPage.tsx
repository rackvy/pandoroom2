import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookingFullDetails, getBookingFull, updateBookingBasic, getBranches, type Branch } from '../api/schedule';
import TableSelector from '../components/booking/TableSelector';
import QuestSelector from '../components/booking/QuestSelector';
import api from '../lib/axios';
import { toast } from '../components/ui/Toast';
import { confirm } from '../components/ui/ConfirmDialog';
import styles from './BookingEditPage.module.css';

interface Cake {
  id: string;
  cakeId: string;
  cakeName: string;
  weightKg: number;
  inscription: string | null;
  comment: string | null;
}

interface DecorationItem {
  id: string;
  decorationId: string;
  decorationName: string;
  quantity: number;
  comment: string | null;
}

interface FoodItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  servingTime: string | null;
  comment: string | null;
}

interface ExtraSlot {
  id: string;
  showProgramId: string | null;
  showProgramName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  startTime: string;
  endTime: string;
  comment: string | null;
}

export default function BookingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    birthdayPersonName: '',
    birthdayPersonAge: '',
    guestsKids: '',
    guestsAdults: '',
    depositRub: '',
    commentClient: '',
    commentInternal: '',
    managerId: '',
  });

  // Related data
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [extraSlots, setExtraSlots] = useState<ExtraSlot[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Get selected branch with zone flags
  const selectedBranch = branches.find(b => b.id === booking?.branch?.id);

  // Show/hide selectors state
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showQuestSelector, setShowQuestSelector] = useState(false);

  useEffect(() => {
    loadData();
    loadBranches();
    loadManagers();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBookingFull(id);
      setBooking(data);
      setFormData({
        clientName: data.clientName || '',
        clientPhone: data.clientPhone || '',
        birthdayPersonName: data.birthdayPersonName || '',
        birthdayPersonAge: data.birthdayPersonAge?.toString() || '',
        guestsKids: data.guestsKids?.toString() || '',
        guestsAdults: data.guestsAdults?.toString() || '',
        depositRub: data.depositRub?.toString() || '',
        commentClient: data.commentClient || '',
        commentInternal: data.commentInternal || '',
        managerId: data.managerId || '',
      });
      
      // Load related items
      setCakes(data.bookingCakes || []);
      setDecorations(data.decorationItems || []);
      setFoodItems(data.foodItems || []);
      setExtraSlots(data.extraSlots || []);
    } catch (error) {
      console.error('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await api.get('/api/admin/employees?role=MANAGER');
      setManagers(response.data);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleSaveBasic = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateBookingBasic(id, {
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        depositRub: Number(formData.depositRub) || 0,
        commentClient: formData.commentClient,
        commentInternal: formData.commentInternal,
        managerId: formData.managerId || undefined,
      });
      toast.success('Изменения сохранены');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCake = async () => {
    // Open modal or inline form to add cake
    const cakeId = prompt('ID торта:');
    if (!cakeId || !id) return;
    try {
      await api.post(`/api/admin/bookings/${id}/cakes`, {
        cakeId,
        weightKg: 2,
      });
      loadData();
    } catch (error) {
      alert('Ошибка добавления торта');
    }
  };

  const handleRemoveCake = async (cakeId: string) => {
    const confirmed = await confirm({
      title: 'Удаление торта',
      message: 'Вы уверены, что хотите удалить торт?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/bookings/cakes/${cakeId}`);
      toast.success('Торт удален');
      loadData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleAddDecoration = async () => {
    const decorationId = prompt('ID украшения:');
    if (!decorationId || !id) return;
    try {
      await api.post(`/api/admin/bookings/${id}/decorations`, {
        decorationId,
        quantity: 1,
      });
      loadData();
    } catch (error) {
      alert('Ошибка добавления украшения');
    }
  };

  const handleRemoveDecoration = async (itemId: string) => {
    const confirmed = await confirm({
      title: 'Удаление украшения',
      message: 'Вы уверены, что хотите удалить украшение?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/bookings/decorations/${itemId}`);
      toast.success('Украшение удалено');
      loadData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleAddFood = async () => {
    const menuItemId = prompt('ID блюда:');
    if (!menuItemId || !id) return;
    try {
      await api.post(`/api/admin/bookings/${id}/food`, {
        menuItemId,
        quantity: 1,
      });
      loadData();
    } catch (error) {
      alert('Ошибка добавления блюда');
    }
  };

  const handleRemoveFood = async (itemId: string) => {
    const confirmed = await confirm({
      title: 'Удаление блюда',
      message: 'Вы уверены, что хотите удалить блюдо?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/bookings/food/${itemId}`);
      toast.success('Блюдо удалено');
      loadData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleAddExtra = async () => {
    const showProgramId = prompt('ID шоу-программы (или оставьте пустым):');
    const supplierId = prompt('ID поставщика (или оставьте пустым):');
    if (!id) return;
    try {
      await api.post(`/api/admin/bookings/${id}/extra-slots`, {
        showProgramId: showProgramId || null,
        supplierId: supplierId || null,
        startTime: '15:00',
        endTime: '16:00',
      });
      loadData();
    } catch (error) {
      alert('Ошибка добавления развлечения');
    }
  };

  const handleRemoveExtra = async (slotId: string) => {
    const confirmed = await confirm({
      title: 'Удаление развлечения',
      message: 'Вы уверены, что хотите удалить развлечение?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/bookings/extra-slots/${slotId}`);
      toast.success('Развлечение удалено');
      loadData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleDeleteBooking = async () => {
    const confirmed = await confirm({
      title: 'Удаление бронирования',
      message: 'Вы уверены, что хотите удалить бронирование? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/bookings/${id}`);
      toast.success('Бронирование удалено');
      navigate('/registry');
    } catch (error) {
      toast.error('Ошибка удаления бронирования');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!booking) {
    return <div className={styles.error}>Бронирование не найдено</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iikoField}>
            <label>Номер чека в iiko</label>
            <div className={styles.iikoInput}>
              <input 
                type="text" 
                value={booking.id.slice(0, 8)} 
                readOnly 
                className={styles.shortInput}
              />
              <button className={styles.refreshBtn}>↻</button>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateField}>
            <label>Дата мероприятия</label>
            <input 
              type="date" 
              value={booking.eventDate} 
              readOnly 
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Column - Event Info */}
        <div className={styles.leftColumn}>
          <section className={styles.section}>
            <h3>1. Мероприятие</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>клиент</label>
                <input 
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>телефон</label>
                <input 
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>именинник</label>
                <input 
                  type="text"
                  value={formData.birthdayPersonName}
                  onChange={(e) => setFormData({...formData, birthdayPersonName: e.target.value})}
                />
              </div>
              <div className={styles.formGroupSmall}>
                <label>возраст</label>
                <input 
                  type="number"
                  value={formData.birthdayPersonAge}
                  onChange={(e) => setFormData({...formData, birthdayPersonAge: e.target.value})}
                />
              </div>
              <div className={styles.formGroupSmall}>
                <label>детей</label>
                <input 
                  type="number"
                  value={formData.guestsKids}
                  onChange={(e) => setFormData({...formData, guestsKids: e.target.value})}
                />
              </div>
              <div className={styles.formGroupSmall}>
                <label>взрослых</label>
                <input 
                  type="number"
                  value={formData.guestsAdults}
                  onChange={(e) => setFormData({...formData, guestsAdults: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Комментарий</label>
              <textarea 
                rows={2}
                value={formData.commentClient}
                onChange={(e) => setFormData({...formData, commentClient: e.target.value})}
                placeholder="Часть гостей придет сразу, часть через час..."
              />
            </div>

            {/* Tables - only show if branch has cafe, lounge or kids zone */}
            {(!selectedBranch || selectedBranch.hasCafe || selectedBranch.hasLounge || selectedBranch.hasKids) && (
              <div className={styles.subSection}>
                <h4>Столы</h4>
                {booking.tableReservations.map((res, idx) => (
                  <div key={res.id} className={styles.tableRow}>
                    <div className={styles.formGroup}>
                      <label>Стол {idx + 1}</label>
                      <div className={styles.tag}>{res.zoneName} / {res.tableTitle}</div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Время</label>
                      <div className={styles.timeDisplay}>
                        {res.startTime.slice(0, 5)} — {res.endTime.slice(0, 5)}
                      </div>
                    </div>
                    <div className={styles.duration}>
                      ({Math.round((new Date(`2000-01-01T${res.endTime}`).getTime() - 
                        new Date(`2000-01-01T${res.startTime}`).getTime()) / 60000 / 60)} ч)
                    </div>
                  </div>
                ))}
                
                {/* Table Selector */}
                {showTableSelector && booking?.branch?.id && (
                  <div className={styles.selectorContainer}>
                    <TableSelector
                      branchId={booking.branch.id}
                      eventDate={booking.eventDate}
                      onSelect={(_tableId, tableTitle, zoneName) => {
                        // TODO: Add table reservation via API
                        toast.success(`Выбран стол: ${zoneName} / ${tableTitle}`);
                        setShowTableSelector(false);
                      }}
                    />
                    <button 
                      className={styles.cancelButton}
                      onClick={() => setShowTableSelector(false)}
                    >
                      Отмена
                    </button>
                  </div>
                )}
                
                {!showTableSelector && (
                  <button 
                    className={styles.addButton}
                    onClick={() => setShowTableSelector(true)}
                  >
                    + добавить стол
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Payment Section */}
          <section className={styles.section}>
            <h3>3. Оплата</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Депозит</label>
                <input 
                  type="number"
                  value={formData.depositRub}
                  onChange={(e) => setFormData({...formData, depositRub: e.target.value})}
                />
              </div>
              <div className={styles.paymentType}>
                <button className={styles.paymentBtn}>Наличные</button>
                <button className={styles.paymentBtnActive}>Безнал</button>
              </div>
            </div>
          </section>

          {/* Manager Section */}
          <section className={styles.section}>
            <h3>4. Ответственный менеджер</h3>
            <div className={styles.formGroup}>
              <select 
                value={formData.managerId}
                onChange={(e) => setFormData({...formData, managerId: e.target.value})}
              >
                <option value="">Выберите менеджера</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Комментарий к заказу</label>
              <textarea 
                rows={3}
                value={formData.commentInternal}
                onChange={(e) => setFormData({...formData, commentInternal: e.target.value})}
                placeholder="Наши постоянные гости, уже 25-й раз у нас за месяц"
              />
            </div>
          </section>
        </div>

        {/* Right Column - Add-ons */}
        <div className={styles.rightColumn}>
          <section className={styles.section}>
            <h3>2. Дополнения</h3>
            
            {/* Quests - only show if branch has quests */}
            {(!selectedBranch || selectedBranch.hasQuests) && (
              <div className={styles.subSection}>
                <h4>2.1 Квест</h4>
                {booking.questReservations.map((res) => (
                  <div key={res.id} className={styles.addonRow}>
                    <div className={styles.tag}>{res.questName}</div>
                    <div className={styles.timeDisplay}>{res.startTime.slice(0, 5)}</div>
                    <button className={styles.iconBtn}>+ Аниматор</button>
                    <div className={styles.rowActions}>
                      <button className={styles.editBtn}>Изменить</button>
                      <button className={styles.deleteBtn}>🗑</button>
                    </div>
                  </div>
                ))}
                
                {/* Quest Selector */}
                {showQuestSelector && booking?.branch?.id && (
                  <div className={styles.selectorContainer}>
                    <QuestSelector
                      branchId={booking.branch.id}
                      eventDate={booking.eventDate}
                      onSelect={(_questId, questName) => {
                        // TODO: Add quest reservation via API
                        toast.success(`Выбран квест: ${questName}`);
                        setShowQuestSelector(false);
                      }}
                    />
                    <button 
                      className={styles.cancelButton}
                      onClick={() => setShowQuestSelector(false)}
                    >
                      Отмена
                    </button>
                  </div>
                )}
                
                {!showQuestSelector && (
                  <button 
                    className={styles.addButton}
                    onClick={() => setShowQuestSelector(true)}
                  >
                    + добавить квест
                  </button>
                )}
              </div>
            )}

            {/* Cakes */}
            <div className={styles.subSection}>
              <h4>2.2 Торт и украшения торта</h4>
              {cakes.map((cake) => (
                <div key={cake.id} className={styles.addonRow}>
                  <div className={styles.tag}>{cake.cakeName} {cake.weightKg} кг</div>
                  {cake.inscription && (
                    <div className={styles.inscription}>{cake.inscription}</div>
                  )}
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn}>Изменить</button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveCake(cake.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <div className={styles.buttonRow}>
                <button className={styles.addButton} onClick={handleAddCake}>
                  + добавить торт
                </button>
                <button className={styles.addButton}>
                  + добавить украшение торта
                </button>
              </div>
            </div>

            {/* Extra Entertainment */}
            <div className={styles.subSection}>
              <h4>2.3 Дополнительные развлечения</h4>
              {extraSlots.map((slot) => (
                <div key={slot.id} className={styles.addonRow}>
                  <div className={styles.tag}>
                    {slot.showProgramName || slot.supplierName || 'Развлечение'}
                  </div>
                  <div className={styles.timeDisplay}>
                    {slot.startTime.slice(0, 5)} — {slot.endTime.slice(0, 5)}
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn}>Изменить</button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveExtra(slot.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles.addButton} onClick={handleAddExtra}>
                + добавить доп. развлечение
              </button>
            </div>

            {/* Decorations */}
            <div className={styles.subSection}>
              <h4>2.4 Украшение зала</h4>
              {decorations.map((item) => (
                <div key={item.id} className={styles.addonRow}>
                  <div className={styles.tag}>{item.decorationName}</div>
                  <div className={styles.quantity}>{item.quantity} шт</div>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn}>Изменить</button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveDecoration(item.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles.addButton} onClick={handleAddDecoration}>
                + добавить украшение зала
              </button>
            </div>

            {/* Food */}
            <div className={styles.subSection}>
              <h4>2.5 Кухня / бар (состав чека из iiko)</h4>
              {foodItems.map((item) => (
                <div key={item.id} className={styles.foodRow}>
                  <div className={styles.foodName}>{item.menuItemName}</div>
                  <div className={styles.foodQty}>{item.quantity} шт</div>
                  <div className={styles.foodTime}>{item.servingTime?.slice(0, 5) || '—'}</div>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn}>Изменить</button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveFood(item.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles.addButton} onClick={handleAddFood}>
                + добавить позицию вручную
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <button 
            className={styles.saveBtn}
            onClick={handleSaveBasic}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
          <button className={styles.smsBtn}>СМС: "Не смогли дозвониться"</button>
          <button className={styles.smsBtn}>СМС: "Напоминание о предзаказе"</button>
        </div>
        <div className={styles.footerRight}>
          <button className={styles.refreshBtn}>обновить из iiko ↻</button>
          <button 
            className={styles.deleteBookingBtn}
            onClick={handleDeleteBooking}
          >
            Удалить бронирование
          </button>
        </div>
      </div>
    </div>
  );
}

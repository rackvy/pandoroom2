import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookingFullDetails, getBookingFull, updateBookingBasic, getBranches, type Branch } from '../api/schedule';
import TableSelector from '../components/booking/TableSelector';
import QuestSelector from '../components/booking/QuestSelector';
import api from '../lib/axios';
import { toast } from '../components/ui/Toast';
import { confirm } from '../components/ui/ConfirmDialog';
import { sendNotification } from '../api/notifications';
import { createPaymentLink, getPaymentStatus } from '../api/payments';
import { syncBookingToCalendar } from '../api/googleCalendar';
import { createIikoOrder, getIikoOrderStatus } from '../api/iiko';
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
  department: string | null;
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
  const branchHasCafe = !!(selectedBranch?.hasCafe || selectedBranch?.hasLounge || selectedBranch?.hasKids);
  const branchHasVR = !!selectedBranch?.hasVR;
  const branchHasQuests = !!selectedBranch?.hasQuests;

  // Show/hide selectors state
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showQuestSelector, setShowQuestSelector] = useState(false);
  const [selectedQuestForAdd, setSelectedQuestForAdd] = useState<{ questId: string; questName: string } | null>(null);
  const [availableSlotsForQuest, setAvailableSlotsForQuest] = useState<Array<{ slotId: string; startTime: string; finalPrice: number; isBooked: boolean }>>([]);
  const [newQuestTime, setNewQuestTime] = useState('');
  const [addingQuestReservation, setAddingQuestReservation] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'telegram' | 'max'>('sms');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [iikoLoading, setIikoLoading] = useState(false);
  const [iikoOrderId, setIikoOrderId] = useState<string | null>(null);
  const [iikoStatus, setIikoStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadBranches();
    loadManagers();
    loadPaymentStatus();
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
      setIikoOrderId(data.iikoOrderId || null);
      setIikoStatus(data.iikoOrderStatus || null);
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

  const loadPaymentStatus = async () => {
    if (!id) return;
    try {
      const data = await getPaymentStatus(id);
      setPaymentStatus(data.paymentStatus);
      setPaymentUrl(data.paymentUrl);
    } catch (error) {
      // Payment status may not exist yet, silently ignore
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!id || !booking) return;
    const amount = booking.depositRub || Number(formData.depositRub) || 0;
    if (amount <= 0) {
      toast.error('Укажите сумму депозита');
      return;
    }
    setPaymentLoading(true);
    try {
      const result = await createPaymentLink(id, amount);
      if (result.error) {
        toast.error(`Ошибка: ${result.error}`);
      } else if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setPaymentStatus('pending');
        toast.success('Ссылка на оплату сформирована');
      }
    } catch (error) {
      toast.error('Ошибка формирования ссылки');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyPaymentUrl = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      toast.success('Ссылка скопирована');
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
    const department = prompt('Цех (bar / pizza / hot_kitchen / cold_kitchen):') || null;
    try {
      await api.post(`/api/admin/bookings/${id}/food`, {
        menuItemId,
        quantity: 1,
        department,
      });
      loadData();
    } catch (error) {
      alert('Ошибка добавления блюда');
    }
  };

  const departmentLabels: Record<string, string> = {
    bar: 'Бар',
    pizza: 'Пицца',
    hot_kitchen: 'Горячий цех',
    cold_kitchen: 'Холодный цех',
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

  const handleSendNotification = async (templateKey: 'MISSED_CALL' | 'PREORDER_REMINDER') => {
    if (!id) return;
    setSendingNotification(true);
    try {
      const result = await sendNotification({
        bookingId: id,
        templateKey,
        channel: notificationChannel,
      });
      if (result.success) {
        toast.success('Уведомление отправлено');
      } else {
        toast.error(result.error || 'Ошибка отправки уведомления');
      }
    } catch (error) {
      toast.error('Ошибка отправки уведомления');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!id) return;
    setSyncingCalendar(true);
    try {
      const result = await syncBookingToCalendar(id);
      toast.success('Синхронизация с Google Calendar выполнена');
      // Update booking state with new googleEventId
      setBooking(prev => prev ? { ...prev, googleEventId: result.googleEventId } : prev);
    } catch (error) {
      toast.error('Ошибка синхронизации с Google Calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleRefreshIiko = async () => {
    if (!iikoOrderId) {
      toast.error('Заказ iiko не создан');
      return;
    }
    setIikoLoading(true);
    try {
      const result = await getIikoOrderStatus(iikoOrderId);
      setIikoStatus(result.status);
      toast.success(`Статус iiko: ${result.status}`);
    } catch (error) {
      toast.error('Ошибка получения статуса iiko');
    } finally {
      setIikoLoading(false);
    }
  };

  const handleCreateIikoOrder = async () => {
    if (!id) return;
    const items = foodItems.map((f) => ({
      name: f.menuItemName,
      qty: f.quantity,
      price: 0,
    }));
    if (items.length === 0) {
      toast.error('Добавьте блюда в заказ перед созданием чека iiko');
      return;
    }
    setIikoLoading(true);
    try {
      const result = await createIikoOrder(id, items);
      setIikoOrderId(result.iikoOrderId);
      setIikoStatus(result.status);
      toast.success(`Чек iiko создан: ${result.iikoOrderId}`);
    } catch (error) {
      toast.error('Ошибка создания чека iiko');
    } finally {
      setIikoLoading(false);
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

  // ==================== QUEST RESERVATION ADD/REMOVE ====================
  const handleQuestSelected = async (questId: string, questName: string) => {
    if (!booking) return;
    setSelectedQuestForAdd({ questId, questName });
    setShowQuestSelector(false);
    // Fetch available slots for this quest on this date
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/public/schedule/grid?date=${booking.eventDate}`);
      if (res.ok) {
        const data = await res.json();
        const questData = data.find((q: any) => q.questId === questId);
        setAvailableSlotsForQuest(questData?.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setAvailableSlotsForQuest([]);
    }
  };

  const handleAddQuestReservation = async () => {
    if (!id || !selectedQuestForAdd || !newQuestTime) return;
    setAddingQuestReservation(true);
    try {
      await api.post(`/api/admin/bookings/${id}/quest-reservations`, {
        questId: selectedQuestForAdd.questId,
        startTime: newQuestTime,
      });
      toast.success('Квест добавлен');
      setSelectedQuestForAdd(null);
      setAvailableSlotsForQuest([]);
      setNewQuestTime('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ошибка добавления квеста');
    } finally {
      setAddingQuestReservation(false);
    }
  };

  const handleRemoveQuestReservation = async (resId: string) => {
    const ok = await confirm({ title: 'Удалить квест', message: 'Удалить квест из брони?', type: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/api/admin/bookings/quest-reservations/${resId}`);
      toast.success('Квест удалён');
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ошибка удаления');
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
                value={iikoOrderId || '—'}
                readOnly
                className={styles.shortInput}
              />
              <button
                className={styles.refreshBtn}
                onClick={handleRefreshIiko}
                disabled={iikoLoading}
                title="Обновить статус из iiko"
              >
                {iikoLoading ? '...' : '↻'}
              </button>
            </div>
            {iikoStatus && (
              <span className={styles.syncBadge}>
                Статус: {iikoStatus}
              </span>
            )}
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

      {/* Branch info with feature badges */}
      {booking.branch && (
        <div className={styles.branchInfo}>
          <span className={styles.branchLabel}>Филиал:</span>
          <span className={styles.branchName}>{booking.branch.name}</span>
          <span className={styles.branchBadges}>
            <span className={styles.branchBadgeLabel}>Тип филиала:</span>
            {selectedBranch?.hasCafe && <span className={styles.badge}>Кафе</span>}
            {selectedBranch?.hasLounge && <span className={styles.badge}>Лаунж</span>}
            {selectedBranch?.hasKids && <span className={styles.badge}>Детская</span>}
            {selectedBranch?.hasQuests && <span className={styles.badge}>Квесты</span>}
            {selectedBranch?.hasVR && <span className={styles.badge}>VR</span>}
            {selectedBranch?.hasLava && <span className={styles.badge}>Лава</span>}
            {selectedBranch?.hasLaserTag && <span className={styles.badge}>Лазертаг</span>}
          </span>
        </div>
      )}

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
              <div className={styles.formGroup}>
                <label>Статус оплаты</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {paymentStatus === 'paid' && <span style={{ color: '#16a34a', fontWeight: 600 }}>Оплачено</span>}
                  {paymentStatus === 'pending' && <span style={{ color: '#d97706', fontWeight: 600 }}>Ожидает оплаты</span>}
                  {paymentStatus === 'failed' && <span style={{ color: '#dc2626', fontWeight: 600 }}>Ошибка</span>}
                  {paymentStatus === 'refunded' && <span style={{ color: '#6b7280', fontWeight: 600 }}>Возврат</span>}
                  {!paymentStatus && <span style={{ color: '#9ca3af' }}>—</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                className={styles.paymentBtn}
                onClick={handleCreatePaymentLink}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Формирование...' : 'Сформировать ссылку на оплату'}
              </button>
              {paymentUrl && (
                <button
                  className={styles.paymentBtn}
                  onClick={handleCopyPaymentUrl}
                  title={paymentUrl}
                >
                  Скопировать ссылку
                </button>
              )}
            </div>
            {paymentUrl && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', wordBreak: 'break-all' }}>
                {paymentUrl}
              </div>
            )}
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
            {(!selectedBranch || branchHasQuests) && (
              <div className={styles.subSection}>
                <h4>2.1 Квест</h4>
                {booking.questReservations.map((res) => (
                  <div key={res.id} className={styles.addonRow}>
                    <div className={styles.tag}>{res.questName}</div>
                    <div className={styles.timeDisplay}>
                      {res.startTime.slice(0, 5)} – {res.endTime.slice(0, 5)}
                    </div>
                    {res.extraPlayers > 0 && (
                      <span className={styles.quantity}>+{res.extraPlayers} доп. ({res.extraPlayersPrice} ₽)</span>
                    )}
                    {res.animatorName && (
                      <span className={styles.quantity}>🎭 {res.animatorName}</span>
                    )}
                    <div className={styles.rowActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleRemoveQuestReservation(res.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add quest flow: step 1 — select quest */}
                {showQuestSelector && !selectedQuestForAdd && booking?.branch?.id && (
                  <div className={styles.selectorContainer}>
                    <QuestSelector
                      branchId={booking.branch.id}
                      eventDate={booking.eventDate}
                      onSelect={handleQuestSelected}
                    />
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowQuestSelector(false)}
                    >
                      Отмена
                    </button>
                  </div>
                )}

                {/* Add quest flow: step 2 — select time slot */}
                {selectedQuestForAdd && (
                  <div className={styles.selectorContainer}>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                      <strong>{selectedQuestForAdd.questName}</strong> — выберите время:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {availableSlotsForQuest.length > 0 ? (
                        availableSlotsForQuest.map((slot) => (
                          <button
                            key={slot.slotId}
                            className={newQuestTime === slot.startTime ? styles.paymentBtnActive : styles.paymentBtn}
                            onClick={() => setNewQuestTime(slot.startTime)}
                          >
                            {slot.startTime} ({slot.finalPrice} ₽)
                          </button>
                        ))
                      ) : (
                        <span style={{ color: '#999', fontSize: 13 }}>Нет свободных слотов</span>
                      )}
                    </div>
                    {newQuestTime && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button
                          className={styles.addButton}
                          onClick={handleAddQuestReservation}
                          disabled={addingQuestReservation}
                        >
                          {addingQuestReservation ? 'Добавление...' : `Добавить на ${newQuestTime}`}
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => { setSelectedQuestForAdd(null); setNewQuestTime(''); setAvailableSlotsForQuest([]); }}
                        >
                          Отмена
                        </button>
                      </div>
                    )}
                    {!newQuestTime && (
                      <button
                        className={styles.cancelButton}
                        style={{ marginTop: 8 }}
                        onClick={() => { setSelectedQuestForAdd(null); setAvailableSlotsForQuest([]); }}
                      >
                        Назад
                      </button>
                    )}
                  </div>
                )}

                {!showQuestSelector && !selectedQuestForAdd && (
                  <button
                    className={styles.addButton}
                    onClick={() => setShowQuestSelector(true)}
                  >
                    + добавить квест
                  </button>
                )}
              </div>
            )}

            {/* VR - only show if branch has VR */}
            {branchHasVR && (
              <div className={styles.subSection}>
                <h4>2.2 VR бронирования</h4>
                <div className={styles.vrPlaceholder}>
                  VR бронирования — управление через VR сетку
                </div>
              </div>
            )}

            {/* Cakes - only for cafe branches */}
            {(!selectedBranch || branchHasCafe) && (
              <div className={styles.subSection}>
                <h4>{branchHasVR ? '2.3' : '2.2'} Торт и украшения торта</h4>
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
            )}

            {/* Extra Entertainment */}
            <div className={styles.subSection}>
              <h4>2.4 Дополнительные развлечения</h4>
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

            {/* Decorations - only for cafe branches */}
            {(!selectedBranch || branchHasCafe) && (
              <div className={styles.subSection}>
                <h4>2.5 Украшение зала</h4>
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
            )}

            {/* Food */}
            <div className={styles.subSection}>
              <h4>2.6 Кухня / бар (состав чека из iiko)</h4>
              {foodItems.map((item) => (
                <div key={item.id} className={styles.foodRow}>
                  <div className={styles.foodName}>{item.menuItemName}</div>
                  <div className={styles.foodDept}>
                    {item.department ? (departmentLabels[item.department] || item.department) : '—'}
                  </div>
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
          <select
            className={styles.smsBtn}
            value={notificationChannel}
            onChange={(e) => setNotificationChannel(e.target.value as 'sms' | 'telegram' | 'max')}
          >
            <option value="sms">SMS</option>
            <option value="telegram">Telegram</option>
            <option value="max">MAX</option>
          </select>
          <button
            className={styles.smsBtn}
            onClick={() => handleSendNotification('MISSED_CALL')}
            disabled={sendingNotification}
          >
            {sendingNotification ? 'Отправка...' : '"Не смогли дозвониться"'}
          </button>
          <button
            className={styles.smsBtn}
            onClick={() => handleSendNotification('PREORDER_REMINDER')}
            disabled={sendingNotification}
          >
            {sendingNotification ? 'Отправка...' : '"Напоминание о предзаказе"'}
          </button>
          <button
            className={styles.smsBtn}
            onClick={handleSyncCalendar}
            disabled={syncingCalendar}
          >
            {syncingCalendar ? 'Синхронизация...' : 'Google Calendar'}
          </button>
          {booking.googleEventId && (
            <span className={styles.syncBadge}>Событие синхронизировано</span>
          )}
        </div>
        <div className={styles.footerRight}>
          <button
            className={styles.smsBtn}
            onClick={handleCreateIikoOrder}
            disabled={iikoLoading}
          >
            {iikoLoading ? 'Создание...' : 'Создать чек в iiko'}
          </button>
          <button
            className={styles.refreshBtn}
            onClick={handleRefreshIiko}
            disabled={iikoLoading || !iikoOrderId}
          >
            {iikoLoading ? 'Загрузка...' : 'обновить из iiko ↻'}
          </button>
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

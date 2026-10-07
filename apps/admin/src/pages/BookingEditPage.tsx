import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookingFullDetails,
  getBookingFull,
  updateBookingBasic,
  getBranches,
  getQuestScheduleGrid,
  type Branch,
  type QuestSlot,
} from '../api/schedule';
import TableSelector from '../components/booking/TableSelector';
import QuestSelector from '../components/booking/QuestSelector';
import ItemSelectorModal, { type SelectableItem } from '../components/schedule/ItemSelectorModal';
import {
  BOOKING_STATUSES,
  BOOKING_TYPE_LABELS,
  addTableReservationToBooking,
  bookingApiError,
  confirmBooking,
  partyEndTime,
} from '../api/bookings';
import { getCakes, getDecorations, getShowPrograms } from '../api/content';
import { getIikoMenu, type IikoMenuItem } from '../api/iiko';
import { getVRHalls, createVRReservation, cancelVRReservation, type VRHall } from '../api/vrSchedule';
import api from '../lib/axios';
import { toast } from '../components/ui/Toast';
import { confirm } from '../components/ui/ConfirmDialog';
import { sendNotification } from '../api/notifications';
import { createPaymentLink, getPaymentStatus } from '../api/payments';
import { syncBookingToCalendar } from '../api/googleCalendar';
import { createIikoOrder, getIikoOrderStatus } from '../api/iiko';
import BookingChat from '../components/booking/BookingChat';
import styles from './BookingEditPage.module.css';

type CatalogKind = 'cake' | 'decoration' | 'food' | 'show';

/** SelectableItem плюс цех: модальный выбор возвращает объект позиции целиком. */
type CatalogItem = SelectableItem & { department?: string | null };

type Cake = BookingFullDetails['bookingCakes'][number];
type DecorationItem = BookingFullDetails['decorationItems'][number];
type FoodItem = BookingFullDetails['foodItems'][number];
type ExtraSlot = BookingFullDetails['extraSlots'][number];

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
  const [availableSlotsForQuest, setAvailableSlotsForQuest] = useState<QuestSlot[]>([]);
  const [newQuestTime, setNewQuestTime] = useState('');
  const [addingQuestReservation, setAddingQuestReservation] = useState(false);
  const [addAnimatorToQuest, setAddAnimatorToQuest] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'telegram' | 'max'>('sms');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [iikoLoading, setIikoLoading] = useState(false);
  const [iikoOrderId, setIikoOrderId] = useState<string | null>(null);
  const [iikoStatus, setIikoStatus] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Стол предлагается выбрать на конкретное время — без него нельзя проверить свободен ли он
  const [tableStartTime, setTableStartTime] = useState('');
  const [addingTable, setAddingTable] = useState(false);

  const [confirming, setConfirming] = useState(false);

  // Позиции берутся из справочников: id вручную менеджер не знает
  const [catalog, setCatalog] = useState<Record<CatalogKind, CatalogItem[]>>({
    cake: [],
    decoration: [],
    food: [],
    show: [],
  });
  const [picker, setPicker] = useState<CatalogKind | null>(null);

  const [vrHalls, setVrHalls] = useState<VRHall[]>([]);
  const [showVrForm, setShowVrForm] = useState(false);
  const [vrForm, setVrForm] = useState({ hallId: '', startTime: '', endTime: '', guestsCount: '2' });

  useEffect(() => {
    loadData();
    loadBranches();
    loadManagers();
    loadCatalogs();
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
      setBookingStatus(data.status || 'draft');
      setTableStartTime(
        data.tableReservations[0]?.startTime ??
          data.tableSlots[0]?.startTime ??
          data.questReservations[0]?.startTime ??
          data.questSlots[0]?.startTime ??
          '16:00',
      );
      if (data.branch?.id) {
        loadVrHalls(data.branch.id);
      }
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

  const departmentLabels: Record<string, string> = {
    bar: 'Бар',
    pizza: 'Пицца',
    hot_kitchen: 'Горячий цех',
    cold_kitchen: 'Холодный цех',
  };

  const loadCatalogs = async () => {
    try {
      const [cakes, decorations, shows, menu] = await Promise.all([
        getCakes(),
        getDecorations(),
        getShowPrograms(),
        getIikoMenu(),
      ]);
      setCatalog({
        cake: cakes.map((cake) => ({
          id: cake.id,
          name: cake.name,
          description: `${Math.round(cake.weightGrams / 100) / 10} кг`,
          price: cake.priceRub,
          imageUrl: cake.image?.url,
        })),
        decoration: decorations.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.priceRub,
          imageUrl: item.image?.url,
        })),
        show: shows.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.priceRub,
          imageUrl: item.image?.url,
        })),
        food: menu
          .filter((item) => item.isActive)
          .map((item: IikoMenuItem) => ({
            id: item.iikoId,
            name: item.name,
            description: [item.category, item.department ? departmentLabels[item.department] ?? item.department : null]
              .filter(Boolean)
              .join(' · '),
            price: item.price,
            imageUrl: item.imageUrl ?? undefined,
            department: item.department,
          })),
      });
    } catch (error) {
      console.error('Не удалось загрузить справочники:', error);
    }
  };

  const loadVrHalls = async (branchId: string) => {
    try {
      setVrHalls(await getVRHalls(branchId));
    } catch (error) {
      console.error('Не удалось загрузить VR-залы:', error);
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
        birthdayPersonName: formData.birthdayPersonName,
        birthdayPersonAge: formData.birthdayPersonAge === '' ? null : Number(formData.birthdayPersonAge),
        guestsKids: formData.guestsKids === '' ? null : Number(formData.guestsKids),
        guestsAdults: formData.guestsAdults === '' ? null : Number(formData.guestsAdults),
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

  const PICKER_TITLES: Record<CatalogKind, string> = {
    cake: 'Торт из справочника',
    decoration: 'Украшение зала',
    food: 'Позиция из меню iiko',
    show: 'Доп. развлечение',
  };

  const pickerFields = (kind: CatalogKind) => {
    if (kind === 'cake') {
      return [{ name: 'inscription', label: 'Надпись на торте', type: 'text' as const }];
    }
    if (kind === 'decoration') {
      return [{ name: 'quantity', label: 'Количество, шт', type: 'number' as const, defaultValue: 1 }];
    }
    if (kind === 'food') {
      return [
        { name: 'quantity', label: 'Количество, шт', type: 'number' as const, defaultValue: 1 },
        { name: 'servingTime', label: 'Время подачи', type: 'time' as const, defaultValue: tableStartTime },
      ];
    }
    const defaultEnd = partyEndTime(tableStartTime || '16:00', 60);
    return [
      { name: 'startTime', label: 'Начало', type: 'time' as const, defaultValue: tableStartTime },
      { name: 'endTime', label: 'Конец', type: 'time' as const, defaultValue: defaultEnd },
    ];
  };

  const handleCatalogPick = async (kind: CatalogKind, item: SelectableItem, extra: Record<string, any>) => {
    if (!id) return;
    const catalogItem = item as CatalogItem;
    const priceRub = catalogItem.price ?? 0;
    try {
      if (kind === 'cake') {
        await api.post(`/api/admin/bookings/${id}/cakes`, {
          cakeId: catalogItem.id,
          inscription: extra.inscription || null,
          priceRub,
        });
      } else if (kind === 'decoration') {
        await api.post(`/api/admin/bookings/${id}/decorations`, {
          decorationId: catalogItem.id,
          quantity: Number(extra.quantity) || 1,
          priceRub,
        });
      } else if (kind === 'food') {
        await api.post(`/api/admin/bookings/${id}/food`, {
          menuItemId: catalogItem.id,
          quantity: Number(extra.quantity) || 1,
          priceRub,
          department: catalogItem.department || undefined,
          servingTime: extra.servingTime || undefined,
        });
      } else {
        await api.post(`/api/admin/bookings/${id}/extra-slots`, {
          showProgramId: catalogItem.id,
          startTime: extra.startTime || undefined,
          endTime: extra.endTime || undefined,
          priceRub,
        });
      }
      toast.success(`Добавлено: ${catalogItem.name}`);
      await loadData();
    } catch (error) {
      toast.error(bookingApiError(error, 'Не удалось добавить позицию'));
    }
  };

  const handleAddTable = async (tableId: string, tableTitle: string, zoneName: string) => {
    if (!id || !tableStartTime) return;
    setAddingTable(true);
    try {
      await addTableReservationToBooking(id, { tableId, startTime: tableStartTime });
      toast.success(`Стол «${zoneName} / ${tableTitle}» занят с ${tableStartTime}`);
      setShowTableSelector(false);
      await loadData();
    } catch (error) {
      toast.error(bookingApiError(error, 'Не удалось занять стол'));
    } finally {
      setAddingTable(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await confirmBooking(id);
      toast.success('Заявка подтверждена, столы и квесты заняты');
      await loadData();
    } catch (error) {
      toast.error(bookingApiError(error, 'Не удалось подтвердить заявку'));
    } finally {
      setConfirming(false);
    }
  };

  const handleAddVr = async () => {
    if (!id || !booking || !vrForm.hallId || !vrForm.startTime || !vrForm.endTime) {
      toast.error('Выберите зал и время VR-сеанса');
      return;
    }
    try {
      await createVRReservation({
        hallId: vrForm.hallId,
        date: booking.eventDate,
        startTime: vrForm.startTime,
        endTime: vrForm.endTime,
        type: 'open_slot',
        guestsCount: Number(vrForm.guestsCount) || 1,
        bookingId: id,
        clientId: booking.clientId ?? undefined,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
      });
      toast.success('VR-бронь добавлена');
      setShowVrForm(false);
      setVrForm({ hallId: '', startTime: '', endTime: '', guestsCount: '2' });
      await loadData();
    } catch (error) {
      toast.error(bookingApiError(error, 'Не удалось добавить VR-бронь'));
    }
  };

  const handleRemoveVr = async (resId: string) => {
    const confirmed = await confirm({
      title: 'Отмена VR-брони',
      message: 'Отменить эту VR-бронь?',
      confirmText: 'Отменить бронь',
      cancelText: 'Назад',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await cancelVRReservation(resId);
      toast.success('VR-бронь отменена');
      await loadData();
    } catch (error) {
      toast.error(bookingApiError(error, 'Ошибка отмены'));
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

  const handleStatusChange = async (newStatus: string) => {
    setSavingStatus(true);
    try {
      await api.patch(`/api/admin/bookings/${id}`, { status: newStatus });
      setBookingStatus(newStatus);
      toast.success('Статус обновлён');
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Ошибка смены статуса');
      // Revert on error
      loadData();
    } finally {
      setSavingStatus(false);
    }
  };

  // ==================== QUEST RESERVATION ADD/REMOVE ====================
  const handleQuestSelected = async (questId: string, questName: string) => {
    if (!booking) return;
    setSelectedQuestForAdd({ questId, questName });
    setShowQuestSelector(false);
    try {
      const grid = await getQuestScheduleGrid(booking.eventDate, booking.branch.id);
      const quest = grid.find((item) => item.questId === questId);
      setAvailableSlotsForQuest((quest?.slots || []).filter((slot) => slot.isAvailable));
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
        addAnimator: addAnimatorToQuest || undefined,
      });
      toast.success('Квест добавлен');
      setSelectedQuestForAdd(null);
      setAvailableSlotsForQuest([]);
      setNewQuestTime('');
      setAddAnimatorToQuest(false);
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
            <label>Статус брони</label>
            <select
              className={styles.statusSelect}
              value={bookingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
            >
              {Object.entries(BOOKING_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {bookingStatus === 'draft' && (
            <div className={styles.dateField}>
              <label>Занятость</label>
              <button
                className={styles.paymentBtn}
                onClick={handleConfirmBooking}
                disabled={confirming}
                title="Столы и квесты из заявки становятся бронями расписания"
              >
                {confirming ? 'Проверка…' : 'Подтвердить заявку'}
              </button>
            </div>
          )}
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
          <span className={styles.branchLabel}>Тип:</span>
          <span className={styles.badge}>{BOOKING_TYPE_LABELS[booking.type] ?? booking.type}</span>
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

                {booking.tableSlots.map((slot) => (
                  <div key={slot.id} className={styles.tableRow}>
                    <div className={styles.formGroup}>
                      <label>Запрошен</label>
                      <div className={styles.tag}>
                        {slot.tableTitle ? `${slot.zoneName} / ${slot.tableTitle}` : slot.title}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Время</label>
                      <div className={styles.timeDisplay}>
                        {slot.startTime} — {slot.endTime}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Выбор стола: свободны только столы на конкретное время, поэтому время нужно до списка */}
                {showTableSelector && booking?.branch?.id && (
                  <div className={styles.selectorContainer}>
                    <div className={styles.formGroupSmall}>
                      <label>Начало праздника</label>
                      <input
                        type="time"
                        value={tableStartTime}
                        onChange={(e) => setTableStartTime(e.target.value)}
                      />
                    </div>
                    <TableSelector
                      branchId={booking.branch.id}
                      eventDate={booking.eventDate}
                      startTime={tableStartTime}
                      onSelect={handleAddTable}
                    />
                    <button 
                      className={styles.cancelButton}
                      onClick={() => setShowTableSelector(false)}
                      disabled={addingTable}
                    >
                      {addingTable ? 'Занятие стола…' : 'Отмена'}
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
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={addAnimatorToQuest}
                            onChange={(e) => setAddAnimatorToQuest(e.target.checked)}
                          />
                          🎭 Добавить аниматора
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className={styles.addButton}
                          onClick={handleAddQuestReservation}
                          disabled={addingQuestReservation}
                        >
                          {addingQuestReservation ? 'Добавление...' : `Добавить на ${newQuestTime}`}
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => { setSelectedQuestForAdd(null); setNewQuestTime(''); setAvailableSlotsForQuest([]); setAddAnimatorToQuest(false); }}
                        >
                          Отмена
                        </button>
                      </div>
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

            {/* VR - только если в филиале есть VR-залы */}
            {branchHasVR && (
              <div className={styles.subSection}>
                <h4>2.2 VR бронирования</h4>
                {booking.vrReservations.map((res) => (
                  <div key={res.id} className={styles.addonRow}>
                    <div className={styles.tag}>{res.hallName || 'VR-зал'}</div>
                    <div className={styles.timeDisplay}>
                      {res.startTime} — {res.endTime}
                    </div>
                    <div className={styles.quantity}>{res.guestsCount} чел</div>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleRemoveVr(res.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}

                {showVrForm && (
                  <div className={styles.selectorContainer}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Зал</label>
                        <select
                          value={vrForm.hallId}
                          onChange={(e) => setVrForm({ ...vrForm, hallId: e.target.value })}
                        >
                          <option value="">Выберите зал</option>
                          {vrHalls.map((hall) => (
                            <option key={hall.id} value={hall.id}>
                              {hall.name} (до {hall.maxCapacity} чел)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroupSmall}>
                        <label>Начало</label>
                        <input
                          type="time"
                          value={vrForm.startTime}
                          onChange={(e) =>
                            setVrForm({
                              ...vrForm,
                              startTime: e.target.value,
                              endTime: partyEndTime(e.target.value, 60),
                            })
                          }
                        />
                      </div>
                      <div className={styles.formGroupSmall}>
                        <label>Конец</label>
                        <input
                          type="time"
                          value={vrForm.endTime}
                          onChange={(e) => setVrForm({ ...vrForm, endTime: e.target.value })}
                        />
                      </div>
                      <div className={styles.formGroupSmall}>
                        <label>Игроков</label>
                        <input
                          type="number"
                          min={1}
                          value={vrForm.guestsCount}
                          onChange={(e) => setVrForm({ ...vrForm, guestsCount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.buttonRow}>
                      <button
                        className={styles.addButton}
                        onClick={handleAddVr}
                        disabled={!vrForm.hallId || !vrForm.startTime || !vrForm.endTime}
                      >
                        Забронировать VR
                      </button>
                      <button
                        className={styles.cancelButton}
                        onClick={() => setShowVrForm(false)}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {!showVrForm && (
                  <button
                    className={styles.addButton}
                    onClick={() => setShowVrForm(true)}
                  >
                    + добавить VR-сеанс
                  </button>
                )}
              </div>
            )}

            {/* Cakes - only for cafe branches */}
            {(!selectedBranch || branchHasCafe) && (
              <div className={styles.subSection}>
                <h4>{branchHasVR ? '2.3' : '2.2'} Торт</h4>
              {cakes.map((cake) => (
                <div key={cake.id} className={styles.addonRow}>
                  <div className={styles.tag}>{cake.cakeName} {cake.weightKg} кг</div>
                  {cake.inscription && (
                    <div className={styles.inscription}>{cake.inscription}</div>
                  )}
                  <div className={styles.rowActions}>
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
                <button className={styles.addButton} onClick={() => setPicker('cake')}>
                  + добавить торт из справочника
                </button>
              </div>
              </div>
            )}

            {/* Extra Entertainment */}
            <div className={styles.subSection}>
              <h4>2.4 Дополнительные развлечения</h4>
              {extraSlots.map((slot) => (
                <div key={slot.id} className={styles.addonRow}>
                  <div className={styles.tag}>{slot.title || 'Развлечение'}</div>
                  {slot.startTime && slot.endTime && (
                    <div className={styles.timeDisplay}>
                      {slot.startTime} — {slot.endTime}
                    </div>
                  )}
                  {slot.priceRub > 0 && (
                    <div className={styles.quantity}>{slot.priceRub} ₽</div>
                  )}
                  <div className={styles.rowActions}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveExtra(slot.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles.addButton} onClick={() => setPicker('show')}>
                + добавить доп. развлечение
              </button>
            </div>

            {/* Decorations - only for cafe branches */}
            {(!selectedBranch || branchHasCafe) && (
              <div className={styles.subSection}>
                <h4>2.5 Украшение зала и оформление торта</h4>
                {decorations.map((item) => (
                  <div key={item.id} className={styles.addonRow}>
                    <div className={styles.tag}>{item.decorationName}</div>
                    <div className={styles.quantity}>{item.quantity} шт</div>
                    {item.priceRub > 0 && (
                      <div className={styles.quantity}>{item.priceRub} ₽</div>
                    )}
                    <div className={styles.rowActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleRemoveDecoration(item.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                <button className={styles.addButton} onClick={() => setPicker('decoration')}>
                  + добавить украшение из справочника
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
                  {item.priceRub > 0 && (
                    <div className={styles.foodTime}>{item.priceRub} ₽</div>
                  )}
                  <div className={styles.rowActions}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveFood(item.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles.addButton} onClick={() => setPicker('food')}>
                + добавить позицию из меню iiko
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Booking Chat */}
      <BookingChat
        bookingId={booking.id}
        clientId={booking.clientId}
        clientName={booking.clientName}
      />

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

      <ItemSelectorModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        title={picker ? PICKER_TITLES[picker] : ''}
        items={picker ? catalog[picker] : []}
        extraFields={picker ? pickerFields(picker) : []}
        onSelect={(item, extra) => {
          if (!picker) return;
          void handleCatalogPick(picker, item, extra);
        }}
      />
    </div>
  );
}

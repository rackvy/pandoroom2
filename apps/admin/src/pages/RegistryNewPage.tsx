import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchSelection } from '../hooks/useBranchSelection';
import ClientPicker, { type ClientPickerValue } from '../components/booking/ClientPicker';
import {
  BOOKING_TYPES,
  BOOKING_TYPE_LABELS,
  DEFAULT_PARTY_DURATION_MINUTES,
  bookingApiError,
  createBooking,
  getFreeQuests,
  getFreeTables,
  partyEndTime,
  type FreeQuest,
  type FreeTableZone,
} from '../api/bookings';
import { toast } from '../components/ui/Toast';
import styles from './RegistryNewPage.module.css';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function RegistryNewPage() {
  const navigate = useNavigate();
  const { branches, branchId, setBranchId } = useBranchSelection();

  const [type, setType] = useState('party');
  const [eventDate, setEventDate] = useState(todayISO);
  const [startTime, setStartTime] = useState('');
  const [client, setClient] = useState<ClientPickerValue>({
    clientId: null,
    clientName: '',
    clientPhone: '',
  });
  const [guestsKids, setGuestsKids] = useState('');
  const [guestsAdults, setGuestsAdults] = useState('');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [birthdayPersonAge, setBirthdayPersonAge] = useState('');
  const [commentClient, setCommentClient] = useState('');
  const [commentInternal, setCommentInternal] = useState('');

  const [freeTables, setFreeTables] = useState<FreeTableZone[]>([]);
  const [freeQuests, setFreeQuests] = useState<FreeQuest[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const endTime = startTime ? partyEndTime(startTime) : '';
  const showsTables = type !== 'vr';
  const canLoadAvailability = !!branchId && !!eventDate && !!startTime;

  const loadAvailability = useCallback(async () => {
    if (!canLoadAvailability) {
      setFreeTables([]);
      setFreeQuests([]);
      return;
    }
    setIsLoadingAvailability(true);
    try {
      const params = { branchId, date: eventDate, startTime, endTime };
      const [tables, quests] = await Promise.all([
        showsTables ? getFreeTables(params) : Promise.resolve([]),
        getFreeQuests(params),
      ]);
      setFreeTables(tables);
      setFreeQuests(quests);
      // Выбор, ставший занятым после смены времени, снимается — иначе создастся
      // заявка со столом, который менеджер уже кому-то отдал.
      const stillFreeTables = new Set(tables.flatMap((zone) => zone.tables.map((t) => t.id)));
      setSelectedTableIds((ids) => ids.filter((id) => stillFreeTables.has(id)));
      const stillFreeQuests = new Set(quests.map((q) => q.questId));
      setSelectedQuestIds((ids) => ids.filter((id) => stillFreeQuests.has(id)));
    } catch (err) {
      toast.error(bookingApiError(err, 'Не удалось загрузить свободные слоты'));
      setFreeTables([]);
      setFreeQuests([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [canLoadAvailability, showsTables, branchId, eventDate, startTime, endTime]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const tableTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of freeTables) {
      for (const table of zone.tables) map.set(table.id, `${zone.name} · ${table.title}`);
    }
    return map;
  }, [freeTables]);

  const questNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const quest of freeQuests) map.set(quest.questId, quest.questName);
    return map;
  }, [freeQuests]);

  const toggleTable = (id: string) => {
    setSelectedTableIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const toggleQuest = (id: string) => {
    setSelectedQuestIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleCreate = async () => {
    if (!branchId) {
      toast.error('Выберите филиал');
      return;
    }
    if (!client.clientName.trim() || !client.clientPhone.trim()) {
      toast.error('Укажите имя и телефон клиента');
      return;
    }
    if (!eventDate) {
      toast.error('Укажите дату');
      return;
    }
    if ((selectedTableIds.length || selectedQuestIds.length) && !startTime) {
      toast.error('Укажите время начала — по нему подобраны столы и квесты');
      return;
    }

    setSaving(true);
    try {
      const booking = await createBooking({
        branchId,
        eventDate,
        type,
        clientName: client.clientName.trim(),
        clientPhone: client.clientPhone.trim(),
        clientId: client.clientId ?? undefined,
        startTime: startTime || undefined,
        tableIds: selectedTableIds.length ? selectedTableIds : undefined,
        questIds: selectedQuestIds.length ? selectedQuestIds : undefined,
        birthdayPersonName: birthdayPersonName.trim() || undefined,
        birthdayPersonAge: birthdayPersonAge ? Number(birthdayPersonAge) : undefined,
        guestsKids: guestsKids ? Number(guestsKids) : undefined,
        guestsAdults: guestsAdults ? Number(guestsAdults) : undefined,
        commentClient: commentClient.trim() || undefined,
        commentInternal: commentInternal.trim() || undefined,
      });
      toast.success('Бронь создана');
      navigate(`/registry/${booking.id}`);
    } catch (err) {
      toast.error(bookingApiError(err, 'Не удалось создать бронь'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <button className={styles.backBtn} onClick={() => navigate('/registry')}>
            ← Назад в реестр
          </button>
          <h1>Новое бронирование</h1>
        </div>
        <div className={styles.headerActions}>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={styles.branchSelect}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className={styles.submitBtn} onClick={handleCreate} disabled={saving}>
            {saving ? 'Создание...' : 'Создать бронь'}
          </button>
        </div>
      </div>

      <section className={styles.section}>
        <h3>Основное</h3>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Тип брони</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {BOOKING_TYPES.map((value) => (
                <option key={value} value={value}>
                  {BOOKING_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Дата</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Начало</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              step={300}
            />
          </div>
          <div className={styles.hint}>
            {startTime
              ? `Праздник занимает стол до ${endTime} (${DEFAULT_PARTY_DURATION_MINUTES} минут)`
              : 'Время начала нужно, чтобы предложить свободные столы и квесты.'}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3>Клиент</h3>
        <ClientPicker value={client} onChange={setClient} />
      </section>

      <section className={styles.section}>
        <h3>Гости</h3>
        <div className={styles.row}>
          <div className={styles.smallField}>
            <label>Детей</label>
            <input type="number" min={0} value={guestsKids} onChange={(e) => setGuestsKids(e.target.value)} />
          </div>
          <div className={styles.smallField}>
            <label>Взрослых</label>
            <input type="number" min={0} value={guestsAdults} onChange={(e) => setGuestsAdults(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Именинник</label>
            <input
              type="text"
              value={birthdayPersonName}
              onChange={(e) => setBirthdayPersonName(e.target.value)}
              placeholder="Имя именинника"
            />
          </div>
          <div className={styles.smallField}>
            <label>Возраст</label>
            <input
              type="number"
              min={0}
              value={birthdayPersonAge}
              onChange={(e) => setBirthdayPersonAge(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label>Комментарий клиента</label>
          <textarea
            rows={2}
            value={commentClient}
            onChange={(e) => setCommentClient(e.target.value)}
            placeholder="Часть гостей придет сразу, часть через час..."
          />
        </div>
        <div className={styles.field}>
          <label>Внутренний комментарий</label>
          <textarea
            rows={2}
            value={commentInternal}
            onChange={(e) => setCommentInternal(e.target.value)}
            placeholder="Наши постоянные гости, уже 25-й раз у нас за месяц"
          />
        </div>
      </section>

      {showsTables && (
        <section className={styles.section}>
          <h3>Свободные столы</h3>
          {!canLoadAvailability && <p className={styles.note}>Укажите филиал, дату и время начала.</p>}
          {canLoadAvailability && isLoadingAvailability && <p className={styles.note}>Проверяем занятость…</p>}
          {canLoadAvailability && !isLoadingAvailability && freeTables.length === 0 && (
            <p className={styles.note}>На это время свободных столов нет — выберите другое время.</p>
          )}
          {freeTables.map((zone) => (
            <div key={zone.id} className={styles.zoneGroup}>
              <div className={styles.zoneTitle}>
                {zone.name}
                {zone.recommendedMaxAge != null && (
                  <span className={styles.ageBadge}>до {zone.recommendedMaxAge} лет</span>
                )}
              </div>
              <div className={styles.chips}>
                {zone.tables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    className={selectedTableIds.includes(table.id) ? styles.chipActive : styles.chip}
                    onClick={() => toggleTable(table.id)}
                  >
                    {table.title}
                    {table.capacity ? ` · ${table.capacity} мест` : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h3>Свободные квесты</h3>
        {!canLoadAvailability && <p className={styles.note}>Укажите филиал, дату и время начала.</p>}
        {canLoadAvailability && isLoadingAvailability && <p className={styles.note}>Проверяем расписание…</p>}
        {canLoadAvailability && !isLoadingAvailability && freeQuests.length === 0 && (
          <p className={styles.note}>Свободных квестов на это время нет.</p>
        )}
        <div className={styles.chips}>
          {freeQuests.map((quest) => (
            <button
              key={quest.questId}
              type="button"
              className={selectedQuestIds.includes(quest.questId) ? styles.chipActive : styles.chip}
              onClick={() => toggleQuest(quest.questId)}
              title={`Свободные начала: ${quest.slotTimes.join(', ')}`}
            >
              {quest.questName} · {quest.slotTimes[0]} ({quest.durationMinutes} мин)
            </button>
          ))}
        </div>
      </section>

      {(selectedTableIds.length > 0 || selectedQuestIds.length > 0) && (
        <section className={styles.section}>
          <h3>В заявке</h3>
          <ul className={styles.summary}>
            {selectedTableIds.map((id) => (
              <li key={id}>{tableTitles.get(id) ?? id}</li>
            ))}
            {selectedQuestIds.map((id) => (
              <li key={id}>{questNames.get(id) ?? id}</li>
            ))}
          </ul>
          <p className={styles.note}>
            Стол и квест ещё не заблокированы — занятость появится после подтверждения брони.
          </p>
        </section>
      )}

      <div className={styles.footer}>
        <button className={styles.submitBtn} onClick={handleCreate} disabled={saving}>
          {saving ? 'Создание...' : 'Создать бронь'}
        </button>
        <button className={styles.cancelBtn} onClick={() => navigate('/registry')} disabled={saving}>
          Отмена
        </button>
      </div>
    </div>
  );
}

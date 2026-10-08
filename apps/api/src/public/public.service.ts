import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { isValidPhone, normalizePhone } from '../client-auth/phone';
import { ClientsService } from '../clients/clients.service';
import { UnifiedChatService } from '../chat/unified-chat.service';
import {
  DEFAULT_PARTY_DURATION_MINUTES,
  addMinutesToSlotDate,
  slotDateToHHMM,
  slotDateToMinutes,
  stringToSlotDate,
} from '../common/slot-time';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Сколько минут считаем отправку той же заявки повтором (двойной клик, «Назад» в браузере). */
const LEAD_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export interface HolidayBookingRequest {
  name: string;
  phone: string;
  date: string;
  time: string;
  adults?: string | number;
  children?: string | number;
  birthdayName?: string;
  birthdayAge?: string | number;
  comment?: string;
  tableIds?: string[];
  questIds?: string[];
  cakeIds?: string[];
  showIds?: string[];
  cakeDecorIds?: Record<string, number>;
  decorIds?: Record<string, number>;
  menuIds?: Record<string, number>;
}

function distinctIds(ids?: string[]): string[] {
  return Array.from(new Set((ids || []).map((id) => String(id).trim()).filter(Boolean)));
}

function positiveQuantities(qty?: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [rawId, value] of Object.entries(qty || {})) {
    const id = String(rawId).trim();
    const count = Math.floor(Number(value) || 0);
    if (id && count > 0) result[id] = count;
  }
  return result;
}

function toOptionalInt(value?: string | number): number | null {
  const num = Math.floor(Number(value));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function compositionKey(tableIds: string[], questIds: string[]): string {
  return `${distinctIds(tableIds).sort().join(',')}|${distinctIds(questIds).sort().join(',')}`;
}

type CatalogItem = {
  name: string;
  price: string | number | { toNumber(): number } | null;
  iikoId: string;
  department: string | null;
};

function priceRub(item: CatalogItem): number {
  return Math.round(convertDecimalToNumber(item.price) ?? 0);
}

// Convert Prisma Decimal (or string) to plain number for JSON serialization
function convertDecimalToNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val);
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
  return Number(val);
}

function convertBranchDecimals(branch: any): any {
  if (!branch) return branch;
  return { ...branch, geoLat: convertDecimalToNumber(branch.geoLat), geoLng: convertDecimalToNumber(branch.geoLng) };
}

function convertResultDecimals(result: any): any {
  if (!result) return result;
  if (Array.isArray(result)) return result.map(convertBranchDecimals);
  return convertBranchDecimals(result);
}

// Deep-convert branch inside nested quest objects
function convertQuestBranch(quest: any): any {
  if (!quest) return quest;
  if (quest.branch) {
    return { ...quest, branch: convertBranchDecimals(quest.branch) };
  }
  return quest;
}

function convertQuestsResult(result: any): any {
  if (!result) return result;
  if (Array.isArray(result)) return result.map(convertQuestBranch);
  return convertQuestBranch(result);
}

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private clientsService: ClientsService,
    private chat: UnifiedChatService,
  ) {}

  async findAllBranches() {
    const branches = await this.prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return convertResultDecimals(branches);
  }

  async findOneBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { quests: { include: { previewImage: true } } },
    });
    if (!branch) throw new NotFoundException('Филиал не найден');
    return convertBranchDecimals(branch);
  }

  async findAllQuests(filters?: { hasActors?: string; ageRestriction?: string }) {
    const where: any = {};
    if (filters?.hasActors === 'true') {
      where.hasActors = true;
    } else if (filters?.hasActors === 'false') {
      where.hasActors = false;
    }
    if (filters?.ageRestriction) {
      where.ageRestriction = filters.ageRestriction;
    }
    const quests = await this.prisma.quest.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        branch: true,
        previewImage: true,
        backgroundImage: true,
      },
    });
    return convertQuestsResult(quests);
  }

  async findOneQuest(id: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id },
      include: {
        branch: true,
        previewImage: true,
        backgroundImage: true,
        galleryPhotos: {
          include: { image: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!quest) throw new NotFoundException('Квест не найден');
    return convertQuestBranch(quest);
  }

  async findAllNews() {
    return this.prisma.news.findMany({
      orderBy: { date: 'desc' },
      include: { image: true },
    });
  }

  async findOneNews(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: { image: true },
    });
    if (!news) throw new NotFoundException('Новость не найдена');
    return news;
  }

  async findAllBlog() {
    return this.prisma.blogPost.findMany({
      orderBy: { date: 'desc' },
      include: { image: true },
    });
  }

  async findOneBlog(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { image: true },
    });
    if (!post) throw new NotFoundException('Статья не найдена');
    return post;
  }

  async findAllReviews() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { source: { include: { icon: true } } },
    });
  }

  async findPageBlocks(pageKey: PageKey) {
    if (!pageKey) {
      throw new NotFoundException('Необходимо указать pageKey');
    }
    return this.prisma.pageBlock.findMany({
      where: { pageKey },
      orderBy: { sortOrder: 'asc' },
      include: { file: true, image: true },
    });
  }

  async findAllAboutFacts() {
    return this.prisma.aboutFact.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { icon: true },
    });
  }

  async getVRGames() {
    return this.prisma.vRGame.findMany({
      where: { isActive: true },
      include: {
        previewImage: true,
        backgroundImage: true,
        video: true,
        branch: true,
        galleryPhotos: { include: { image: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getVRGame(id: string) {
    const game = await this.prisma.vRGame.findUnique({
      where: { id },
      include: {
        previewImage: true,
        backgroundImage: true,
        video: true,
        branch: true,
        galleryPhotos: { include: { image: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!game) throw new NotFoundException('VR Game not found');
    return game;
  }

  // ==================== PUBLIC BOOKING ====================

  async createPublicBooking(data: {
    slotId: string;
    questId: string;
    eventDate: string;
    name: string;
    phone: string;
    extraPlayers?: number;
    addAnimator?: boolean;
  }) {
    // 1. Look up the schedule slot
    const scheduleSlot = await this.prisma.questScheduleSlot.findUnique({
      where: { id: data.slotId },
    });
    if (!scheduleSlot || !scheduleSlot.isActive) {
      throw new BadRequestException('Слот не найден или недоступен');
    }

    // 2. Get the quest
    const quest = await this.prisma.quest.findUnique({
      where: { id: data.questId },
    });
    if (!quest) {
      throw new NotFoundException('Квест не найден');
    }

    // 2.5 Validate extra players against maxExtraPlayers
    const maxExtra = quest.maxExtraPlayers || 0;
    const requestedExtra = Math.max(0, data.extraPlayers || 0);
    if (requestedExtra > maxExtra) {
      throw new BadRequestException(`Максимум ${maxExtra} доп. участник(ов) для этого квеста`);
    }

    // 3. Parse times
    const eventDate = new Date(data.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const [hours, minutes] = scheduleSlot.startTime.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + quest.durationMinutes * 60000);

    // 4. Check for existing reservation overlapping this quest run
    const sameDayReservations = await this.prisma.questReservation.findMany({
      where: {
        questId: data.questId,
        eventDate,
        status: { not: 'canceled' },
      },
    });
    const toMinutes = (time: Date) => time.getHours() * 60 + time.getMinutes();
    const requestedStart = hours * 60 + minutes;
    const requestedEnd = requestedStart + quest.durationMinutes;
    const conflict = sameDayReservations.find(
      r => toMinutes(r.startTime) < requestedEnd && toMinutes(r.endTime) > requestedStart,
    );
    if (conflict) {
      throw new BadRequestException('Это время уже забронировано. Выберите другое.');
    }

    // 5. Calculate extras
    const extraPlayers = Math.max(0, data.extraPlayers || 0);
    const extraPlayersPrice = extraPlayers * quest.extraPlayerPrice;
    const addAnimator = data.addAnimator && quest.allowAnimator;
    const animatorPrice = addAnimator ? quest.animatorPrice : 0;
    const basePrice = scheduleSlot.basePrice;
    const totalPrice = basePrice + extraPlayersPrice + animatorPrice;

    // 6. Build reservation title with extras
    const extras: string[] = [];
    if (extraPlayers > 0) extras.push(`+${extraPlayers} игрок(ов)`);
    if (addAnimator) extras.push('аниматор');
    const extrasStr = extras.length > 0 ? ` [${extras.join(', ')}]` : '';

    // 7. Find or create Client by phone, link booking to them
    const client = await this.clientsService.getOrCreate(data.phone, data.name);

    // 8. Create Booking + QuestReservation linked to Client
    const booking = await this.prisma.booking.create({
      data: {
        branchId: quest.branchId,
        clientId: client.id,
        eventDate,
        clientName: data.name,
        clientPhone: client.phone,
        status: 'draft',
        depositRub: 0,
        questReservations: {
          create: {
            branchId: quest.branchId,
            clientId: client.id,
            questId: data.questId,
            eventDate,
            startTime,
            endTime,
            title: `${data.name} — ${quest.name} ${scheduleSlot.startTime}${extrasStr}`,
            status: 'draft',
            extraPlayers,
            extraPlayersPrice,
            animatorName: addAnimator ? 'Аниматор' : null,
          },
        },
      },
      include: {
        questReservations: true,
      },
    });

    // Auto-enqueue booking confirmation notification
    const branch = await this.prisma.branch.findUnique({ where: { id: quest.branchId } });
    await this.notifications.enqueue({
      templateKey: 'BOOKING_CONFIRMED',
      variables: {
        clientName: data.name,
        questName: quest.name,
        eventDate: new Date(data.eventDate).toLocaleDateString('ru-RU'),
        time: scheduleSlot.startTime,
        sumRub: String(totalPrice),
        branchPhone: branch?.phone || '',
      },
      channel: 'sms',
      recipient: data.phone,
      bookingId: booking.id,
    });

    return {
      id: booking.id,
      questName: quest.name,
      date: data.eventDate,
      time: scheduleSlot.startTime,
      basePrice,
      extraPlayersPrice,
      animatorPrice,
      totalPrice,
      clientName: booking.clientName,
    };
  }

  /**
   * Заявка на праздник с витрины. Состав сохраняется как запрошенный:
   * TableReservation/QuestReservation появляются только после подтверждения
   * менеджером в реестре, поэтому заявка не блокирует столы и квесты.
   */
  async createHolidayBooking(data: HolidayBookingRequest) {
    const clientName = (data.name || '').trim();
    const phone = normalizePhone(data.phone || '');
    if (!clientName) throw new BadRequestException('Укажите имя');
    if (!isValidPhone(phone)) throw new BadRequestException('Укажите корректный номер телефона');
    if (!data.date || !data.time) throw new BadRequestException('Укажите дату и время праздника');

    const eventDate = new Date(data.date);
    if (Number.isNaN(eventDate.getTime())) throw new BadRequestException('Некорректная дата');
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate.getTime() < today.getTime()) {
      throw new BadRequestException('Эта дата уже прошла — выберите будущий день');
    }

    let startTime: Date;
    try {
      startTime = stringToSlotDate(data.time);
    } catch {
      throw new BadRequestException('Некорректное время, нужен формат ЧЧ:ММ');
    }
    const endTime = addMinutesToSlotDate(startTime, DEFAULT_PARTY_DURATION_MINUTES);

    const tableIds = distinctIds(data.tableIds);
    const questIds = distinctIds(data.questIds);
    const cakeIds = distinctIds(data.cakeIds);
    const showIds = distinctIds(data.showIds);
    const cakeDecorQty = positiveQuantities(data.cakeDecorIds);
    const decorQty = positiveQuantities(data.decorIds);
    const menuQty = positiveQuantities(data.menuIds);

    const catalogIds = distinctIds([
      ...cakeIds,
      ...showIds,
      ...Object.keys(cakeDecorQty),
      ...Object.keys(decorQty),
      ...Object.keys(menuQty),
    ]);
    const catalogItems = catalogIds.length
      ? await this.prisma.iikoMenuItem.findMany({ where: { id: { in: catalogIds }, isActive: true } })
      : [];
    const catalog = new Map(catalogItems.map((item) => [item.id, item]));
    if (catalogIds.some((id) => !catalog.has(id))) {
      throw new BadRequestException('Часть выбранных позиций больше недоступна — обновите страницу и повторите');
    }

    const tables = tableIds.length
      ? await this.prisma.table.findMany({
          where: { id: { in: tableIds }, isActive: true },
          include: { zone: true },
        })
      : [];
    if (tables.length !== tableIds.length) {
      throw new BadRequestException('Выбранные столы больше недоступны — обновите страницу и повторите');
    }

    const quests = questIds.length
      ? await this.prisma.quest.findMany({ where: { id: { in: questIds } } })
      : [];
    if (quests.length !== questIds.length) {
      throw new BadRequestException('Выбранные квесты больше недоступны — обновите страницу и повторите');
    }

    const fallbackZone = tables.length || quests.length
      ? null
      : await this.prisma.tableZone.findFirst({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { branchId: true },
        });
    const branchId = tables[0]?.branchId ?? quests[0]?.branchId ?? fallbackZone?.branchId;
    if (!branchId) throw new BadRequestException('Не удалось определить филиал — напишите нам по телефону');

    const foreignQuest = quests.find((quest) => quest.branchId !== branchId);
    if (foreignQuest) {
      throw new BadRequestException(
        `Квест «${foreignQuest.name}» в другом филиале — стол и квест нужно выбрать в одном филиале`,
      );
    }

    // Двойная отправка (второй клик, «Назад» в браузере) не плодит повторную заявку
    const requestedKey = compositionKey(tables.map((t) => t.id), quests.map((q) => q.id));
    const recentLeads = await this.prisma.booking.findMany({
      where: {
        clientPhone: phone,
        type: 'party',
        status: 'draft',
        eventDate,
        createdAt: { gte: new Date(Date.now() - LEAD_DEDUPE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { tableSlots: true, questSlots: true },
    });
    for (const lead of recentLeads) {
      const slots = lead.tableSlots.length ? lead.tableSlots : lead.questSlots;
      const sameTime = slots.some((slot) => slotDateToMinutes(slot.startTime) === slotDateToMinutes(startTime));
      const sameComposition =
        compositionKey(
          lead.tableSlots.map((slot) => slot.tableId).filter((id): id is string => Boolean(id)),
          lead.questSlots.map((slot) => slot.questId).filter((id): id is string => Boolean(id)),
        ) === requestedKey;
      if (sameTime && sameComposition) {
        return { ...(await this.buildLeadResponse(lead.id)), clientLinked: 'existing', duplicated: true };
      }
    }

    const knownClient = await this.clientsService.findByPhone(phone);
    const client = await this.clientsService.getOrCreate(phone, clientName);

    // Как в детализированном счёте на сайте: считаем порции, а не строки
    const sumQty = (map: Record<string, number>) => Object.values(map).reduce((sum, qty) => sum + qty, 0);
    const positionsCount =
      tables.length +
      quests.length +
      cakeIds.length +
      showIds.length +
      sumQty(cakeDecorQty) +
      sumQty(decorQty) +
      sumQty(menuQty);

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          branchId,
          clientId: client.id,
          eventDate,
          clientName,
          clientPhone: phone,
          birthdayPersonName: (data.birthdayName || '').trim() || null,
          birthdayPersonAge: toOptionalInt(data.birthdayAge),
          guestsAdults: toOptionalInt(data.adults),
          guestsKids: toOptionalInt(data.children),
          commentClient: (data.comment || '').trim() || null,
          status: 'draft',
          type: 'party',
          depositRub: 0,
        },
      });

      for (const table of tables) {
        await tx.bookingTableSlot.create({
          data: {
            bookingId: created.id,
            tableId: table.id,
            title: `${table.zone?.name || ''} ${table.title}`.trim(),
            startTime,
            endTime,
          },
        });
      }

      for (const quest of quests) {
        await tx.bookingQuestSlot.create({
          data: {
            bookingId: created.id,
            questId: quest.id,
            title: quest.name,
            startTime,
          },
        });
      }

      for (const id of cakeIds) {
        const item = catalog.get(id)!;
        await tx.bookingCake.create({
          data: { bookingId: created.id, title: item.name, priceRub: priceRub(item) },
        });
      }

      for (const [id, qty] of Object.entries(cakeDecorQty)) {
        const item = catalog.get(id)!;
        await tx.bookingDecorationItem.create({
          data: { bookingId: created.id, title: `Оформление торта: ${item.name}`, qty, priceRub: priceRub(item) },
        });
      }

      for (const [id, qty] of Object.entries(decorQty)) {
        const item = catalog.get(id)!;
        await tx.bookingDecorationItem.create({
          data: { bookingId: created.id, title: item.name, qty, priceRub: priceRub(item) },
        });
      }

      for (const id of showIds) {
        const item = catalog.get(id)!;
        await tx.bookingExtraSlot.create({
          data: { bookingId: created.id, type: 'show_program', title: item.name, priceRub: priceRub(item) },
        });
      }

      for (const [id, qty] of Object.entries(menuQty)) {
        const item = catalog.get(id)!;
        await tx.bookingFoodItem.create({
          data: {
            bookingId: created.id,
            iikoItemId: item.iikoId,
            title: item.name,
            qty,
            priceRub: priceRub(item),
            department: item.department,
          },
        });
      }

      return created;
    });

    // Уведомление пишем после коммита: изнутри транзакции событие в сокет уходит
    // раньше, чем заявка записана, и при откате клиент видит сообщение о брони,
    // которой не существует.
    if (positionsCount > 0) {
      try {
        await this.chat.appendMessage({
          clientId: client.id,
          bookingId: booking.id,
          direction: 'SYSTEM',
          text:
            `Заявка на праздник принята: ${eventDate.toLocaleDateString('ru-RU')}, ${slotDateToHHMM(startTime)}. ` +
            `Позиций: ${positionsCount}. Менеджер уточнит детали и стоимость в этом чате.`,
        });
      } catch (chatErr) {
        this.logger.error(`Не удалось поставить заявку в чат клиента ${client.id}`, chatErr);
      }
    }

    return {
      ...(await this.buildLeadResponse(booking.id)),
      clientLinked: knownClient ? 'existing' : ('created' as const),
      duplicated: false,
    };
  }

  /** Ответ витрине и реестру: что именно записано по заявке. */
  private async buildLeadResponse(bookingId: string) {
    const lead = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: true,
        tableSlots: true,
        questSlots: true,
        bookingCakes: true,
        decorationItems: true,
        extraSlots: true,
        foodItems: true,
      },
    });
    if (!lead) throw new NotFoundException('Заявка не найдена');

    const timeSlot = lead.tableSlots[0] ?? lead.questSlots[0];
    const catalogPositions =
      lead.bookingCakes.length +
      lead.decorationItems.reduce((sum, item) => sum + item.qty, 0) +
      lead.extraSlots.length +
      lead.foodItems.reduce((sum, item) => sum + item.qty, 0);

    return {
      id: lead.id,
      status: lead.status,
      type: lead.type,
      date: lead.eventDate,
      time: timeSlot ? slotDateToHHMM(timeSlot.startTime) : '',
      durationMinutes: DEFAULT_PARTY_DURATION_MINUTES,
      branchName: lead.branch?.name ?? '',
      positions: lead.tableSlots.length + lead.questSlots.length + catalogPositions,
      totalRub:
        lead.bookingCakes.reduce((sum, item) => sum + item.priceRub, 0) +
        lead.decorationItems.reduce((sum, item) => sum + item.priceRub * item.qty, 0) +
        lead.extraSlots.reduce((sum, item) => sum + item.priceRub, 0) +
        lead.foodItems.reduce((sum, item) => sum + item.priceRub * item.qty, 0),
    };
  }

  // ==================== HOLIDAY BOOKING DATA ====================

  async findPublicTables() {
    const zones = await this.prisma.tableZone.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { image: true },
        },
      },
    });
    return zones
      .map((zone) => ({
        id: zone.id,
        branchId: zone.branchId,
        key: zone.key,
        name: zone.name,
        recommendedMaxAge: zone.recommendedMaxAge,
        tables: zone.tables.map((table) => ({
          id: table.id,
          title: table.title,
          capacity: table.capacity,
          imageUrl: table.image?.url ?? null,
          imageAlt: table.image?.altText ?? null,
        })),
      }))
      .filter((zone) => zone.tables.length > 0);
  }

  async findPublicMenu() {
    const items = await this.prisma.iikoMenuItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      price: convertDecimalToNumber(item.price),
      imageUrl: item.imageUrl,
      weight: item.weight,
    }));
  }
}

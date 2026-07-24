import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
      include: { previewImage: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getVRGame(id: string) {
    const game = await this.prisma.vRGame.findUnique({
      where: { id },
      include: { previewImage: true },
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

    // 4. Check for existing reservation at this time
    const existingReservation = await this.prisma.questReservation.findFirst({
      where: {
        questId: data.questId,
        eventDate,
        startTime,
        status: { not: 'canceled' },
      },
    });
    if (existingReservation) {
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
    const phoneDigits = data.phone.replace(/\D/g, '');
    const existingClient = await this.prisma.client.findUnique({
      where: { phone: phoneDigits },
    });

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
      // Update name if it changed (e.g. user filled different name in booking form)
      if (existingClient.name !== data.name.trim()) {
        await this.prisma.client.update({
          where: { id: existingClient.id },
          data: { name: data.name.trim() },
        });
      }
    } else {
      const newClient = await this.prisma.client.create({
        data: {
          phone: phoneDigits,
          name: data.name.trim(),
        },
      });
      clientId = newClient.id;
    }

    // 8. Create Booking + QuestReservation linked to Client
    const booking = await this.prisma.booking.create({
      data: {
        branchId: quest.branchId,
        clientId,
        eventDate,
        clientName: data.name,
        clientPhone: phoneDigits,
        status: 'draft',
        depositRub: 0,
        questReservations: {
          create: {
            branchId: quest.branchId,
            clientId,
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
}

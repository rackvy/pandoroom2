import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PublicService, HolidayBookingRequest } from './public.service';
import { Public } from '../common/decorators/public.decorator';
import { QuestScheduleService } from '../quest-schedule/quest-schedule.service';
import { ScheduleService } from '../schedule/schedule.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  DEFAULT_PARTY_DURATION_MINUTES,
  DAY_END_MINUTES,
  partyEndHHMM,
} from '../common/slot-time';

@Controller('api/public')
@Public()
export class PublicController {
  constructor(
    private publicService: PublicService,
    private questScheduleService: QuestScheduleService,
    private scheduleService: ScheduleService,
    private waitlistService: WaitlistService,
  ) {}

  /** Окно праздника: старт + длительность (по умолчанию 120 минут), конец — не позже полуночи. */
  private partyWindow(date: string, time: string, durationMinutes?: string) {
    if (!date || !time) throw new BadRequestException('Укажите дату и время');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Некорректная дата');
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequestException('Некорректное время');
    const duration = durationMinutes ? Number(durationMinutes) : DEFAULT_PARTY_DURATION_MINUTES;
    if (!Number.isInteger(duration) || duration <= 0 || duration > DAY_END_MINUTES) {
      throw new BadRequestException('Некорректная длительность');
    }
    return { date, startTime: time, endTime: partyEndHHMM(time, duration) };
  }

  // ==================== AVAILABILITY ====================

  @Get('availability/tables')
  getFreeTables(
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('branchId') branchId?: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    const window = this.partyWindow(date, time, durationMinutes);
    return this.scheduleService.getFreeTables(
      branchId,
      window.date,
      window.startTime,
      window.endTime,
    );
  }

  @Get('availability/quests')
  getFreeQuests(
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('branchId') branchId?: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    const window = this.partyWindow(date, time, durationMinutes);
    return this.questScheduleService.getFreeQuests(
      branchId,
      window.date,
      window.startTime,
      window.endTime,
    );
  }

  @Get('branches')
  findAllBranches() {
    return this.publicService.findAllBranches();
  }

  @Get('branches/:id')
  findOneBranch(@Param('id') id: string) {
    return this.publicService.findOneBranch(id);
  }

  @Get('quests')
  findAllQuests(
    @Query('hasActors') hasActors?: string,
    @Query('ageRestriction') ageRestriction?: string,
  ) {
    return this.publicService.findAllQuests({ hasActors, ageRestriction });
  }

  @Get('quests/:id')
  findOneQuest(@Param('id') id: string) {
    return this.publicService.findOneQuest(id);
  }

  @Get('news')
  findAllNews() {
    return this.publicService.findAllNews();
  }

  @Get('news/:id')
  findOneNews(@Param('id') id: string) {
    return this.publicService.findOneNews(id);
  }

  @Get('blog')
  findAllBlog() {
    return this.publicService.findAllBlog();
  }

  @Get('blog/:id')
  findOneBlog(@Param('id') id: string) {
    return this.publicService.findOneBlog(id);
  }

  @Get('reviews')
  findAllReviews() {
    return this.publicService.findAllReviews();
  }

  @Get('content')
  findPageBlocks(@Query('pageKey') pageKey: PageKey) {
    return this.publicService.findPageBlocks(pageKey);
  }

  @Get('about-facts')
  findAllAboutFacts() {
    return this.publicService.findAllAboutFacts();
  }

  @Get('vr-games')
  getVRGames() {
    return this.publicService.getVRGames();
  }

  @Get('vr-games/:id')
  getVRGame(@Param('id') id: string) {
    return this.publicService.getVRGame(id);
  }

  // ==================== HOLIDAY BOOKING DATA ====================

  @Get('tables')
  findPublicTables() {
    return this.publicService.findPublicTables();
  }

  @Get('menu')
  findPublicMenu() {
    return this.publicService.findPublicMenu();
  }

  // ==================== PUBLIC SCHEDULE ====================

  @Get('schedule/grid')
  async getScheduleGrid(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const grid = await this.questScheduleService.getQuestSlotsForDate(date);

    // Strip sensitive booking info — only return slot availability
    return grid.map(quest => ({
      questId: quest.questId,
      questName: quest.questName,
      durationMinutes: quest.durationMinutes,
      minPlayers: quest.minPlayers,
      maxPlayers: quest.maxPlayers,
      maxExtraPlayers: quest.maxExtraPlayers,
      extraPlayerPrice: quest.extraPlayerPrice,
      allowAnimator: quest.allowAnimator,
      animatorPrice: quest.animatorPrice,
      slots: quest.slots
        .filter(s => s.isAvailable)
        .map(s => ({
          slotId: s.slotId,
          questId: quest.questId,
          startTime: s.startTime,
          finalPrice: s.finalPrice,
          // Пересечение с любой активной бронью — слот недоступен, даже если
          // бронь началась не по сетке слотов (например, в 15:30 при слоте 15:00)
          isBooked: !!s.reservation || !!s.conflict,
        })),
    }));
  }

  // ==================== PUBLIC BOOKING ====================

  @Post('bookings')
  async createPublicBooking(
    @Body() body: {
      slotId: string;
      questId: string;
      eventDate: string;
      name: string;
      phone: string;
      extraPlayers?: number;
      addAnimator?: boolean;
    },
  ) {
    if (!body.slotId || !body.questId || !body.eventDate || !body.name || !body.phone) {
      throw new BadRequestException('Заполните все поля');
    }
    return this.publicService.createPublicBooking(body);
  }

  /** Заявка на праздник: состав сохраняется, занятость появляется после подтверждения менеджером. */
  @Post('holiday-bookings')
  createHolidayBooking(@Body() body: HolidayBookingRequest) {
    return this.publicService.createHolidayBooking(body);
  }

  // ==================== PUBLIC WAITLIST ====================

  @Post('waitlist')
  async joinWaitlist(
    @Body() body: {
      questId: string;
      clientName: string;
      clientPhone: string;
      desiredDate?: string;
      desiredTime?: string;
    },
  ) {
    if (!body.questId || !body.clientName || !body.clientPhone) {
      throw new BadRequestException('Заполните обязательные поля');
    }
    return this.waitlistService.addToWaitlist(body);
  }
}

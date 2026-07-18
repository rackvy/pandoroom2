import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';
import { QuestScheduleService } from '../quest-schedule/quest-schedule.service';
import { WaitlistService } from '../waitlist/waitlist.service';

@Controller('api/public')
@Public()
export class PublicController {
  constructor(
    private publicService: PublicService,
    private questScheduleService: QuestScheduleService,
    private waitlistService: WaitlistService,
  ) {}

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
      maxPlayers: quest.maxPlayers,
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
          isBooked: !!s.reservation,
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

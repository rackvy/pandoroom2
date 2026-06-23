import { Controller, Get, Param, Query } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/public')
@Public()
export class PublicController {
  constructor(private publicService: PublicService) {}

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
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeRole, PageKey } from '@prisma/client';
import { ContentService } from './content.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.CONTENT)
export class ContentController {
  constructor(private contentService: ContentService) {}

  // ==================== NEWS ====================
  @Get('news')
  findAllNews() {
    return this.contentService.findAllNews();
  }

  @Get('news/:id')
  findOneNews(@Param('id') id: string) {
    return this.contentService.findOneNews(id);
  }

  @Post('news')
  createNews(@Body() dto: CreateNewsDto) {
    return this.contentService.createNews(dto);
  }

  @Patch('news/:id')
  updateNews(@Param('id') id: string, @Body() dto: Partial<CreateNewsDto>) {
    return this.contentService.updateNews(id, dto);
  }

  @Delete('news/:id')
  removeNews(@Param('id') id: string) {
    return this.contentService.removeNews(id);
  }

  // ==================== PAGE BLOCKS ====================
  @Get('page-blocks')
  findAllPageBlocks() {
    return this.contentService.findAllPageBlocks();
  }

  @Get('page-blocks/by-page')
  findPageBlocks(@Query('pageKey') pageKey: PageKey) {
    return this.contentService.findPageBlocks(pageKey);
  }

  @Get('page-blocks/:id')
  findOnePageBlock(@Param('id') id: string) {
    return this.contentService.findOnePageBlock(id);
  }

  @Post('page-blocks')
  createPageBlock(@Body() dto: CreatePageBlockDto) {
    return this.contentService.createPageBlock(dto);
  }

  @Patch('page-blocks/:id')
  updatePageBlock(@Param('id') id: string, @Body() dto: Partial<CreatePageBlockDto>) {
    return this.contentService.updatePageBlock(id, dto);
  }

  @Delete('page-blocks/:id')
  removePageBlock(@Param('id') id: string) {
    return this.contentService.removePageBlock(id);
  }

  // ==================== REVIEWS ====================
  @Get('reviews')
  findAllReviews() {
    return this.contentService.findAllReviews();
  }

  @Get('reviews/:id')
  findOneReview(@Param('id') id: string) {
    return this.contentService.findOneReview(id);
  }

  @Post('reviews')
  createReview(@Body() dto: CreateReviewDto) {
    return this.contentService.createReview(dto);
  }

  @Patch('reviews/:id')
  updateReview(@Param('id') id: string, @Body() dto: Partial<CreateReviewDto>) {
    return this.contentService.updateReview(id, dto);
  }

  @Delete('reviews/:id')
  removeReview(@Param('id') id: string) {
    return this.contentService.removeReview(id);
  }

  // ==================== ABOUT FACTS ====================
  @Get('about-facts')
  findAllAboutFacts() {
    return this.contentService.findAllAboutFacts();
  }

  @Get('about-facts/:id')
  findOneAboutFact(@Param('id') id: string) {
    return this.contentService.findOneAboutFact(id);
  }
}

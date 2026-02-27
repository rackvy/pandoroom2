import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PageKey } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ==================== NEWS ====================
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

  async createNews(dto: CreateNewsDto) {
    return this.prisma.news.create({
      data: dto,
      include: { image: true },
    });
  }

  async updateNews(id: string, dto: Partial<CreateNewsDto>) {
    await this.findOneNews(id);
    return this.prisma.news.update({
      where: { id },
      data: dto,
      include: { image: true },
    });
  }

  async removeNews(id: string) {
    await this.findOneNews(id);
    await this.prisma.news.delete({ where: { id } });
    return { message: 'Новость удалена' };
  }

  // ==================== PAGE BLOCKS ====================
  async findPageBlocks(pageKey: PageKey) {
    return this.prisma.pageBlock.findMany({
      where: { pageKey },
      orderBy: { sortOrder: 'asc' },
      include: { file: true, image: true },
    });
  }

  async findAllPageBlocks() {
    return this.prisma.pageBlock.findMany({
      orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }],
      include: { file: true, image: true },
    });
  }

  async findOnePageBlock(id: string) {
    const block = await this.prisma.pageBlock.findUnique({
      where: { id },
      include: { file: true, image: true },
    });
    if (!block) throw new NotFoundException('Блок не найден');
    return block;
  }

  async createPageBlock(dto: CreatePageBlockDto) {
    return this.prisma.pageBlock.create({
      data: dto,
      include: { file: true, image: true },
    });
  }

  async updatePageBlock(id: string, dto: Partial<CreatePageBlockDto>) {
    await this.findOnePageBlock(id);
    return this.prisma.pageBlock.update({
      where: { id },
      data: dto,
      include: { file: true, image: true },
    });
  }

  async removePageBlock(id: string) {
    await this.findOnePageBlock(id);
    await this.prisma.pageBlock.delete({ where: { id } });
    return { message: 'Блок удален' };
  }

  // ==================== REVIEWS ====================
  async findAllReviews() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { source: { include: { icon: true } } },
    });
  }

  async findOneReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { source: { include: { icon: true } } },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');
    return review;
  }

  async createReview(dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: dto,
      include: { source: { include: { icon: true } } },
    });
  }

  async updateReview(id: string, dto: Partial<CreateReviewDto>) {
    await this.findOneReview(id);
    return this.prisma.review.update({
      where: { id },
      data: dto,
      include: { source: { include: { icon: true } } },
    });
  }

  async removeReview(id: string) {
    await this.findOneReview(id);
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Отзыв удален' };
  }

  // ==================== ABOUT FACTS ====================
  async findAllAboutFacts() {
    return this.prisma.aboutFact.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { icon: true },
    });
  }

  async findOneAboutFact(id: string) {
    const fact = await this.prisma.aboutFact.findUnique({
      where: { id },
      include: { icon: true },
    });
    if (!fact) throw new NotFoundException('Факт не найден');
    return fact;
  }
}

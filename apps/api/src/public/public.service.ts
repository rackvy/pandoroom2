import { Injectable, NotFoundException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async findAllBranches() {
    return this.prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { quests: { include: { previewImage: true } } },
    });
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
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
    return this.prisma.quest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: true,
        previewImage: true,
        backgroundImage: true,
      },
    });
  }

  async findOneQuest(id: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id },
      include: {
        branch: true,
        previewImage: true,
        backgroundImage: true,
      },
    });
    if (!quest) throw new NotFoundException('Квест не найден');
    return quest;
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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PageKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

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
      orderBy: { createdAt: 'desc' },
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
}

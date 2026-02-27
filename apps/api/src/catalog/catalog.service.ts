import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Helper to convert BigInt to Number for JSON serialization
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertBigIntToNumber(value)])
    );
  }
  return obj;
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // ==================== BRANCHES ====================
  async findAllBranches() {
    return this.prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { quests: true },
    });
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }

  async createBranch(data: any) {
    return this.prisma.branch.create({ data });
  }

  async updateBranch(id: string, data: any) {
    await this.findOneBranch(id);
    return this.prisma.branch.update({ where: { id }, data });
  }

  async removeBranch(id: string) {
    await this.findOneBranch(id);
    await this.prisma.branch.delete({ where: { id } });
    return { message: 'Филиал удален' };
  }

  // ==================== QUESTS ====================
  async findAllQuests() {
    const quests = await this.prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
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
    return convertBigIntToNumber(quests);
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
    return convertBigIntToNumber(quest);
  }

  async createQuest(data: any) {
    const { galleryPhotoIds, ...questData } = data;
    
    const quest = await this.prisma.quest.create({
      data: {
        ...questData,
        galleryPhotos: galleryPhotoIds?.length ? {
          create: galleryPhotoIds.map((imageId: string, index: number) => ({
            imageId,
            sortOrder: index,
          })),
        } : undefined,
      },
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
    return convertBigIntToNumber(quest);
  }

  async updateQuest(id: string, data: any) {
    await this.findOneQuest(id);
    const { galleryPhotoIds, ...questData } = data;
    
    // If galleryPhotoIds is provided, replace all gallery photos
    if (galleryPhotoIds !== undefined) {
      // Delete existing gallery photos
      await this.prisma.questGalleryPhoto.deleteMany({
        where: { questId: id },
      });
      
      // Create new gallery photos
      if (galleryPhotoIds.length > 0) {
        await this.prisma.questGalleryPhoto.createMany({
          data: galleryPhotoIds.map((imageId: string, index: number) => ({
            questId: id,
            imageId,
            sortOrder: index,
          })),
        });
      }
    }
    
    const quest = await this.prisma.quest.update({
      where: { id },
      data: questData,
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
    return convertBigIntToNumber(quest);
  }

  async removeQuest(id: string) {
    await this.findOneQuest(id);
    await this.prisma.quest.delete({ where: { id } });
    return { message: 'Квест удален' };
  }

  // ==================== SUPPLIERS ====================
  async findAllSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { cakes: true, showPrograms: true },
    });
    if (!supplier) throw new NotFoundException('Поставщик не найден');
    return supplier;
  }

  async createSupplier(data: any) {
    return this.prisma.supplier.create({ data });
  }

  async updateSupplier(id: string, data: any) {
    await this.findOneSupplier(id);
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async removeSupplier(id: string) {
    await this.findOneSupplier(id);
    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Поставщик удален' };
  }

  // ==================== CAKES ====================
  async findAllCakes() {
    return this.prisma.cake.findMany({
      orderBy: { name: 'asc' },
      include: { image: true, supplier: true },
    });
  }

  async findOneCake(id: string) {
    const cake = await this.prisma.cake.findUnique({
      where: { id },
      include: { image: true, supplier: true },
    });
    if (!cake) throw new NotFoundException('Торт не найден');
    return cake;
  }

  async createCake(data: any) {
    return this.prisma.cake.create({
      data,
      include: { image: true, supplier: true },
    });
  }

  async updateCake(id: string, data: any) {
    await this.findOneCake(id);
    return this.prisma.cake.update({
      where: { id },
      data,
      include: { image: true, supplier: true },
    });
  }

  async removeCake(id: string) {
    await this.findOneCake(id);
    await this.prisma.cake.delete({ where: { id } });
    return { message: 'Торт удален' };
  }

  // ==================== SHOW PROGRAMS ====================
  async findAllShowPrograms() {
    return this.prisma.showProgram.findMany({
      orderBy: { name: 'asc' },
      include: { image: true, supplier: true },
    });
  }

  async findOneShowProgram(id: string) {
    const program = await this.prisma.showProgram.findUnique({
      where: { id },
      include: { image: true, supplier: true },
    });
    if (!program) throw new NotFoundException('Шоу-программа не найдена');
    return program;
  }

  async createShowProgram(data: any) {
    return this.prisma.showProgram.create({
      data,
      include: { image: true, supplier: true },
    });
  }

  async updateShowProgram(id: string, data: any) {
    await this.findOneShowProgram(id);
    return this.prisma.showProgram.update({
      where: { id },
      data,
      include: { image: true, supplier: true },
    });
  }

  async removeShowProgram(id: string) {
    await this.findOneShowProgram(id);
    await this.prisma.showProgram.delete({ where: { id } });
    return { message: 'Шоу-программа удалена' };
  }

  // ==================== DECORATIONS ====================
  async findAllDecorations() {
    return this.prisma.decoration.findMany({
      orderBy: { name: 'asc' },
      include: { image: true },
    });
  }

  async findOneDecoration(id: string) {
    const decoration = await this.prisma.decoration.findUnique({
      where: { id },
      include: { image: true },
    });
    if (!decoration) throw new NotFoundException('Декорация не найдена');
    return decoration;
  }

  async createDecoration(data: any) {
    return this.prisma.decoration.create({
      data,
      include: { image: true },
    });
  }

  async updateDecoration(id: string, data: any) {
    await this.findOneDecoration(id);
    return this.prisma.decoration.update({
      where: { id },
      data,
      include: { image: true },
    });
  }

  async removeDecoration(id: string) {
    await this.findOneDecoration(id);
    await this.prisma.decoration.delete({ where: { id } });
    return { message: 'Декорация удалена' };
  }

  // ==================== TABLE ZONES ====================
  async findZonesByBranch(branchId: string) {
    return this.prisma.tableZone.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createZone(data: any) {
    return this.prisma.tableZone.create({ data });
  }

  async updateZone(id: string, data: any) {
    return this.prisma.tableZone.update({ where: { id }, data });
  }

  async removeZone(id: string) {
    await this.prisma.tableZone.delete({ where: { id } });
    return { message: 'Зал удален' };
  }

  // ==================== TABLES ====================
  async findTablesByBranch(branchId: string) {
    return this.prisma.table.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' },
      include: { zone: true },
    });
  }

  async createTable(data: any) {
    return this.prisma.table.create({
      data,
      include: { zone: true },
    });
  }

  async updateTable(id: string, data: any) {
    return this.prisma.table.update({
      where: { id },
      data,
      include: { zone: true },
    });
  }

  async removeTable(id: string) {
    await this.prisma.table.delete({ where: { id } });
    return { message: 'Стол удален' };
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const VARIANT_SPECS = [
  { suffix: 'web', size: 1920, quality: 80 },
  { suffix: 'thumb', size: 640, quality: 75 },
] as const;

const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private uploadDir: string;
  private useS3: boolean;

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {
    this.useS3 = this.s3Service.isEnabled();
    
    // Use absolute path from project root (fallback for local storage)
    this.uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
    this.logger.log(`Upload directory: ${this.uploadDir}, S3 enabled: ${this.useS3}`);
    
    // Ensure upload directory exists (for local storage fallback)
    if (!this.useS3 && !fs.existsSync(this.uploadDir)) {
      this.logger.log('Creating uploads directory...');
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll() {
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Convert BigInt to number for JSON serialization
    return media.map(m => ({
      ...m,
      sizeBytes: Number(m.sizeBytes),
    }));
  }

  async upload(file: UploadedFile, altText?: string) {
    const id = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `${id}${ext}`;
    
    let url: string;
    const key = `uploads/${filename}`;

    if (this.useS3) {
      // Upload to S3
      url = await this.s3Service.uploadFile(key, file.buffer, file.mimetype);
      this.logger.log(`File uploaded to S3: ${url}`);
    } else {
      // Save file to local disk
      const filepath = path.join(this.uploadDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      url = `/uploads/${filename}`;
      this.logger.log(`File saved locally: ${url}`);
    }

    // Determine media type
    const type = file.mimetype.startsWith('image/') ? 'image' : 'file';

    let webUrl: string | null = null;
    let thumbUrl: string | null = null;
    if (RASTER_TYPES.includes(file.mimetype)) {
      try {
        const variants = await this.buildVariants(file.buffer, file.mimetype);
        for (const variant of variants) {
          const variantName = `${id}_${variant.suffix}${variant.ext}`;
          let variantUrl: string;
          if (this.useS3) {
            variantUrl = await this.s3Service.uploadFile(`uploads/${variantName}`, variant.buffer, variant.mimeType);
          } else {
            fs.writeFileSync(path.join(this.uploadDir, variantName), variant.buffer);
            variantUrl = `/uploads/${variantName}`;
          }
          if (variant.suffix === 'web') webUrl = variantUrl;
          else thumbUrl = variantUrl;
        }
        this.logger.log(`Variants generated for ${id}: web=${webUrl}, thumb=${thumbUrl}`);
      } catch (error) {
        this.logger.error(`Failed to generate variants for ${id}, keeping original only`, error);
      }
    }

    // Save to database
    const media = await this.prisma.media.create({
      data: {
        id,
        url,
        webUrl,
        thumbUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        type,
        altText: altText || null,
      },
    });

    // Convert BigInt to number for JSON serialization
    return {
      ...media,
      sizeBytes: Number(media.sizeBytes),
    };
  }

  private async buildVariants(buffer: Buffer, mimeType: string) {
    const isPng = mimeType === 'image/png';
    const ext = isPng ? '.png' : '.jpg';
    const outMime = isPng ? 'image/png' : 'image/jpeg';

    const variants: { suffix: 'web' | 'thumb'; buffer: Buffer; mimeType: string; ext: string }[] = [];
    for (const spec of VARIANT_SPECS) {
      let pipeline = sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: spec.size, height: spec.size, fit: 'inside', withoutEnlargement: true });
      pipeline = isPng
        ? pipeline.png({ compressionLevel: 9, palette: true })
        : pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: spec.quality, mozjpeg: true });
      variants.push({ suffix: spec.suffix, buffer: await pipeline.toBuffer(), mimeType: outMime, ext });
    }
    return variants;
  }

  async update(id: string, data: { altText?: string }) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const updated = await this.prisma.media.update({
      where: { id },
      data: {
        ...(data.altText !== undefined && { altText: data.altText || null }),
      },
    });

    return { ...updated, sizeBytes: Number(updated.sizeBytes) };
  }

  async getUsage(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const [
      questPreviews,
      questBackgrounds,
      questGallery,
      news,
      blog,
      aboutFacts,
      reviewSources,
      pageBlockFiles,
      pageBlockImages,
      cakes,
      showPrograms,
      decorations,
      vrPreviews,
      vrBackgrounds,
      vrVideos,
      vrGallery,
    ] = await Promise.all([
      this.prisma.quest.count({ where: { previewImageId: id } }),
      this.prisma.quest.count({ where: { backgroundImageId: id } }),
      this.prisma.questGalleryPhoto.count({ where: { imageId: id } }),
      this.prisma.news.count({ where: { imageId: id } }),
      this.prisma.blogPost.count({ where: { imageId: id } }),
      this.prisma.aboutFact.count({ where: { iconId: id } }),
      this.prisma.reviewSource.count({ where: { iconId: id } }),
      this.prisma.pageBlock.count({ where: { fileId: id } }),
      this.prisma.pageBlock.count({ where: { imageId: id } }),
      this.prisma.cake.count({ where: { imageId: id } }),
      this.prisma.showProgram.count({ where: { imageId: id } }),
      this.prisma.decoration.count({ where: { imageId: id } }),
      this.prisma.vRGame.count({ where: { previewImageId: id } }),
      this.prisma.vRGame.count({ where: { backgroundImageId: id } }),
      this.prisma.vRGame.count({ where: { videoId: id } }),
      this.prisma.vRGameGalleryPhoto.count({ where: { imageId: id } }),
    ]);

    const labels: [string, number][] = [
      ['Квесты (превью)', questPreviews],
      ['Квесты (фон)', questBackgrounds],
      ['Квесты (галерея)', questGallery],
      ['Новости', news],
      ['Блог', blog],
      ['О нас (факты)', aboutFacts],
      ['Источники отзывов', reviewSources],
      ['Страницы (файлы)', pageBlockFiles],
      ['Страницы (изображения)', pageBlockImages],
      ['Торты', cakes],
      ['Шоу-программы', showPrograms],
      ['Оформление', decorations],
      ['VR игры (превью)', vrPreviews],
      ['VR игры (фон)', vrBackgrounds],
      ['VR игры (видео)', vrVideos],
      ['VR игры (галерея)', vrGallery],
    ];

    const usages = labels
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({ label, count }));

    const total = labels.reduce((sum, [, count]) => sum + count, 0);

    return { usages, total };
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Block deletion if the file is referenced anywhere
    const { usages, total } = await this.getUsage(id);
    if (total > 0) {
      const where = usages.map((u) => `${u.label}: ${u.count}`).join(', ');
      throw new BadRequestException(
        `Файл используется (${where}). Сначала уберите его из этих разделов.`,
      );
    }

    if (this.useS3) {
      // Delete from S3
      const keys = [media.url, media.webUrl, media.thumbUrl]
        .map((u) => (u ? this.s3Service.extractKeyFromUrl(u) : null))
        .filter((k): k is string => Boolean(k));
      for (const key of keys) {
        try {
          await this.s3Service.deleteFile(key);
          this.logger.log(`File deleted from S3: ${key}`);
        } catch (error) {
          this.logger.error(`Failed to delete file from S3: ${key}`, error);
          // Continue to delete from database even if S3 deletion fails
        }
      }
    } else {
      // Delete file from local disk
      for (const u of [media.url, media.webUrl, media.thumbUrl]) {
        if (!u) continue;
        const filepath = path.join(this.uploadDir, path.basename(u));
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          this.logger.log(`File deleted locally: ${filepath}`);
        }
      }
    }

    // Delete from database
    await this.prisma.media.delete({
      where: { id },
    });

    return { message: 'Media deleted' };
  }
}

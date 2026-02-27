import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

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

  async upload(file: UploadedFile) {
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

    // Save to database
    const media = await this.prisma.media.create({
      data: {
        id,
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        type,
      },
    });

    // Convert BigInt to number for JSON serialization
    return {
      ...media,
      sizeBytes: Number(media.sizeBytes),
    };
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (this.useS3) {
      // Delete from S3
      const key = this.s3Service.extractKeyFromUrl(media.url);
      if (key) {
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
      const filename = path.basename(media.url);
      const filepath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        this.logger.log(`File deleted locally: ${filepath}`);
      }
    }

    // Delete from database
    await this.prisma.media.delete({
      where: { id },
    });

    return { message: 'Media deleted' };
  }
}

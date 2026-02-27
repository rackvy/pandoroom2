import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private endpoint: string | undefined;
  private useS3: boolean;

  constructor() {
    this.useS3 = process.env.S3_ENABLED === 'true';
    this.bucketName = process.env.S3_BUCKET_NAME || 'pandoroom-uploads';
    this.region = process.env.S3_REGION || 'us-east-1';
    this.endpoint = process.env.S3_ENDPOINT || undefined;

    if (this.useS3) {
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: !!this.endpoint, // Required for MinIO and other S3-compatible services
      });
      this.logger.log(`S3 initialized: bucket=${this.bucketName}, region=${this.region}`);
    } else {
      this.logger.log('S3 is disabled, using local storage');
    }
  }

  isEnabled(): boolean {
    return this.useS3;
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.useS3) {
      throw new Error('S3 is not enabled');
    }

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        },
      });

      await upload.done();
      this.logger.debug(`File uploaded to S3: ${key}`);
      
      return this.getFileUrl(key);
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.useS3) {
      throw new Error('S3 is not enabled');
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      this.logger.debug(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  getFileUrl(key: string): string {
    if (this.endpoint) {
      // For MinIO and other S3-compatible services
      return `${this.endpoint}/${this.bucketName}/${key}`;
    }
    // For AWS S3
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.useS3) {
      throw new Error('S3 is not enabled');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  extractKeyFromUrl(url: string): string | null {
    // Extract key from S3 URL
    if (this.endpoint && url.startsWith(this.endpoint)) {
      const prefix = `${this.endpoint}/${this.bucketName}/`;
      return url.startsWith(prefix) ? url.substring(prefix.length) : null;
    }
    
    // AWS S3 URL pattern
    const s3Pattern = new RegExp(`https://${this.bucketName}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
    const match = url.match(s3Pattern);
    return match ? match[1] : null;
  }
}

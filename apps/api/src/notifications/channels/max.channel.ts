import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MaxChannel {
  private readonly logger = new Logger(MaxChannel.name);

  constructor(private configService: ConfigService) {}

  async send(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    const token = this.configService.get<string>('MAX_BOT_TOKEN');
    if (!token) {
      this.logger.warn('MAX_BOT_TOKEN not configured, stub mode');
      this.logger.log(`[STUB] MAX → ${chatId}: ${text}`);
      return { success: true };
    }

    // MAX API stub — real implementation depends on MAX Bot API docs
    try {
      this.logger.log(`[STUB] MAX → ${chatId}: ${text}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramChannel {
  private readonly logger = new Logger(TelegramChannel.name);

  constructor(private configService: ConfigService) {}

  async send(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured, stub mode');
      this.logger.log(`[STUB] Telegram → ${chatId}: ${text}`);
      return { success: true };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      const data = await response.json();
      if (!data.ok) return { success: false, error: data.description };
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

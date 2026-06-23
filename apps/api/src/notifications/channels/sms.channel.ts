import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private configService: ConfigService) {}

  async send(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
    const provider = this.configService.get<string>('SMS_PROVIDER', 'stub');
    if (provider === 'stub') {
      this.logger.log(`[STUB] SMS → ${phone}: ${text}`);
      return { success: true };
    }

    const apiKey = this.configService.get<string>('SMS_API_KEY');
    if (!apiKey) {
      return { success: false, error: 'SMS_API_KEY not configured' };
    }

    try {
      const response = await fetch('https://sms.ru/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ api_id: apiKey, to: phone, msg: text, json: '1' }),
      });
      const data = await response.json();
      if (data.status !== 'OK') return { success: false, error: data.status_text };
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

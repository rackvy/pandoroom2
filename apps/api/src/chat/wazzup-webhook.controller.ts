import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import { WebhookContext } from '../integrations/channels/channel-driver.interface';
import { ChannelService } from './channel.service';

/**
 * Приём событий Wazzup. Публичный по необходимости — провайдер не знает наших
 * токенов, а подписи у его вебхука нет. Допуском работает ключ доступа,
 * который стоит в адресе вебхука (`?key=...`); заголовок Authorization
 * провайдер добавляет, только если у него есть наш crmKey.
 *
 * Тело читаем руками: глобальный пайп с forbidNonWhitelisted отбил бы 422 на
 * любое незнакомое поле чужого вебхука.
 */
@Public()
@Controller('api/webhooks')
export class WazzupWebhookController {
  private readonly logger = new Logger(WazzupWebhookController.name);

  constructor(
    private readonly registry: ChannelRegistry,
    private readonly channels: ChannelService,
  ) {}

  @Post('wazzup')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Query() query: Record<string, unknown>,
  ) {
    if (!(await this.registry.webhookSecretConfigured())) {
      throw new ServiceUnavailableException(
        'Ключ доступа вебхука Wazzup не задан — сверять запрос нечем, приём событий выключен',
      );
    }

    const ctx: WebhookContext = {
      body,
      headers: this.lowercase(headers),
      query: this.flatten(query),
    };

    const driver = await this.registry.driver();
    if (!driver.verifyWebhookAuth(ctx)) {
      this.logger.warn(`Отклонён вебхук Wazzup без верного ключа от ${req.ip}`);
      throw new UnauthorizedException('Ключ доступа вебхука не совпал');
    }

    // Проверочный запрос {test: true} при подключении вебхуков разбивается о
    // parseWebhook в ноль событий и уходит с 200 — именно его там и ждут.
    return this.channels.handleWebhook(ctx);
  }

  private lowercase(headers: Record<string, string | string[] | undefined>) {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(headers)) {
      out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
    return out;
  }

  private flatten(query: Record<string, unknown>) {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(query)) {
      const single = Array.isArray(value) ? value[0] : value;
      out[key] = typeof single === 'string' ? single : undefined;
    }
    return out;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import { WebhookContext } from '../integrations/channels/channel-driver.interface';
import { ChannelService } from './channel.service';

export const SIGNATURE_HEADER = 'x-wazzup-signature';

/** Тело читаем руками: глобальный пайп с forbidNonWhitelisted отбил бы 422 на любое незнакомое поле чужого вебхука. */
type RawRequest = Request & { rawBody?: Buffer };

/**
 * Приём событий Wazzup. Публичный по необходимости — провайдер не знает наших
 * токенов, поэтому единственным допуском работает подпись сырого тела.
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
    @Req() req: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    if (!(await this.registry.webhookSecretConfigured())) {
      throw new ServiceUnavailableException(
        'Секрет вебхука Wazzup не задан — проверять подпись нечем, приём событий выключен',
      );
    }
    if (!req.rawBody?.length) {
      throw new BadRequestException('Запрос без сырого тела: подпись проверить невозможно');
    }

    const ctx: WebhookContext = {
      rawBody: req.rawBody,
      body,
      headers: this.lowercase(headers),
    };

    const driver = await this.registry.driver();
    if (!driver.verifyWebhookSignature(ctx, ctx.headers[SIGNATURE_HEADER])) {
      this.logger.warn(`Отклонён вебхук с неверной подписью от ${req.ip}`);
      throw new UnauthorizedException('Подпись вебхука не совпала');
    }

    return this.channels.handleWebhook(ctx);
  }

  private lowercase(headers: Record<string, string | string[] | undefined>) {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(headers)) {
      out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
    return out;
  }
}

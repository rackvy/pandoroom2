import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChannelKind } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ChannelProbeService } from './channel-probe.service';
import { ChannelService } from './channel.service';
import { BulkChannelsDto } from './dto/bulk-channels.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UnifiedChatService } from './unified-chat.service';

/**
 * Чат со стороны команды. Доступны все сотрудники без разделения переписки —
 * поэтому непрочитанное тоже общее: прочитал один, бейдж погас у всех.
 *
 * Пометку о прочтении ставит сокет-событие `admin:message:read`, а не побочный
 * эффект чтения ленты: оверлей листает историю вверх, и каждый такой запрос не
 * должен гасить счётчик.
 */
@Controller('api/admin/chat')
export class StaffChatController {
  constructor(
    private readonly chat: UnifiedChatService,
    private readonly probes: ChannelProbeService,
    private readonly channels: ChannelService,
  ) {}

  @Get('unread')
  async getTotalUnread() {
    return { unread: await this.chat.unreadForStaff() };
  }

  @Get('inbox')
  getInbox(@Query() query: FeedQueryDto) {
    return this.chat.getInbox(query);
  }

  /**
   * Пачка по id для списков: чипы у телефонов на странице клиентов, в реестре
   * и в карточках брони берутся отсюда одним запросом, иначе таблица на сотню
   * строк делает сотню. Проб провайдера тут нет — только кэш.
   */
  @Post('channels/bulk')
  bulkChannels(@Body() dto: BulkChannelsDto) {
    return this.probes.bulk(dto.clientIds);
  }

  /** Только кэш: проверка номера платная, и рендер карточки не должен её дёргать. */
  @Get('channels/:clientId')
  getChannels(@Param('clientId') clientId: string) {
    return this.probes.list(clientId);
  }

  /**
   * Перепроверка у провайдера. Без `force` работает по TTL и не трогает
   * ручные пометки, `?force=1` — явная кнопка «Обновить» в карточке.
   */
  @Post('channels/:clientId/refresh')
  refreshChannels(@Param('clientId') clientId: string, @Query('force') force?: string) {
    return this.probes.resolveChannels(clientId, { force: force === '1' || force === 'true' });
  }

  @Get('feed/:clientId')
  getFeed(@Param('clientId') clientId: string, @Query() query: FeedQueryDto) {
    return this.chat.getFeed(clientId, query);
  }

  @Post(':clientId/system')
  sendSystemMessage(
    @Param('clientId') clientId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chat.appendMessage({
      clientId,
      text: dto.text,
      bookingId: dto.bookingId ?? null,
      direction: 'SYSTEM',
    });
  }

  @Post(':clientId')
  sendMessage(
    @Param('clientId') clientId: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channels.sendFromStaff({
      clientId,
      text: dto.text,
      channel: dto.channel ?? ChannelKind.INTERNAL,
      bookingId: dto.bookingId ?? null,
      authorId: user?.userId ?? null,
    });
  }
}

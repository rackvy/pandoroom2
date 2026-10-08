import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChannelKind, ChannelSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelRegistry } from '../integrations/channels/channel-registry';
import { EXTERNAL_CHANNELS } from '../integrations/channels/channel-driver.interface';
import { normalizePhone } from '../client-auth/phone';

/**
 * Проверка номера у провайдера платная и лимитированная, поэтому свежий ответ
 * живёт месяц, а список клиентов не дёргает провайдера вовсе.
 */
const PROBE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const CHANNEL_FIELDS = {
  channel: true,
  available: true,
  source: true,
  checkedAt: true,
  note: true,
} satisfies Prisma.ClientChannelSelect;

/** Те же поля плюс клиент: по нему группируем пачку. */
const BULK_FIELDS = { clientId: true, ...CHANNEL_FIELDS } satisfies Prisma.ClientChannelSelect;

type ChannelRow = Prisma.ClientChannelGetPayload<{ select: typeof CHANNEL_FIELDS }> & { id: string };

type BulkRow = Prisma.ClientChannelGetPayload<{ select: typeof BULK_FIELDS }>;

/**
 * Кэш доступности каналов клиента. Единственное место, которое пишет
 * ClientChannel: автоматическая проба, подтверждение из вебхука и отдача
 * списка в интерфейс.
 */
@Injectable()
export class ChannelProbeService {
  private readonly logger = new Logger(ChannelProbeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChannelRegistry,
  ) {}

  async list(clientId: string) {
    await this.assertClient(clientId);
    return this.readChannels(clientId);
  }

  /**
   * Пачка по id — для чипов у телефонов в таблицах. read-only по кэшу: проба
   * номера дорога, а строк на странице сотни, поэтому «Проверить номера»
   * остаётся явным действием в карточке, а не побочным эффектом рендера.
   *
   * Несуществующий id молча выпадает из ответа: удалённый клиент в ещё не
   * обновлённой таблице не должен ронять отрисовку всей страницы.
   */
  async bulk(clientIds: string[]) {
    const unique = [...new Set(clientIds)];
    const [known, rows, driver] = await Promise.all([
      this.prisma.client.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      }),
      this.prisma.clientChannel.findMany({
        where: { clientId: { in: unique } },
        orderBy: [{ clientId: 'asc' }, { channel: 'asc' }],
        select: BULK_FIELDS,
      }),
      this.registry.mode(),
    ]);

    const byClient = new Map<string, BulkRow[]>(known.map((c) => [c.id, []]));
    for (const row of rows) {
      byClient.get(row.clientId)?.push(row);
    }

    return {
      // Порядок — как в запросе, неизвестные id просто выпадают.
      items: unique.flatMap((id) => {
        const channels = byClient.get(id);
        return channels ? [{ clientId: id, channels, driver }] : [];
      }),
    };
  }

  /**
   * Обновить кэш, если он протух. `force` — явная кнопка «Обновить», она
   * обходит и TTL, и ручную пометку: менеджер мог задать канал руками
   * неправильно, и раз просит перепроверить — перепроверяем.
   */
  async resolveChannels(clientId: string, options: { force?: boolean } = {}) {
    const client = await this.assertClient(clientId);
    const phone = normalizePhone(client.phone || '');

    if (phone.length === 11) {
      const existing = await this.prisma.clientChannel.findMany({
        where: { clientId },
        select: { ...CHANNEL_FIELDS, id: true },
      });
      const byChannel = new Map(existing.map((row) => [row.channel, row]));
      const driver = await this.registry.driver();
      await Promise.all(
        EXTERNAL_CHANNELS.map((channel) =>
          this.probeOne(driver, client.id, channel, phone, byChannel.get(channel), !!options.force),
        ),
      );
    }

    return this.readChannels(clientId);
  }

  /** Несуществующий клиент — 404, а не пустой список: интерфейс отличает «каналов нет» от «клиента нет». */
  private async assertClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, phone: true },
    });
    if (!client) throw new NotFoundException(`Клиент ${clientId} не найден`);
    return client;
  }

  private async readChannels(clientId: string) {
    const channels = await this.prisma.clientChannel.findMany({
      where: { clientId },
      orderBy: { channel: 'asc' },
      select: CHANNEL_FIELDS,
    });
    return { clientId, channels, driver: await this.registry.mode() };
  }

  /**
   * Входящее сообщение — самое сильное доказательство, что канал живой: он
   * подтверждается самим фактом доставки, даже если проба раньше сказала «нет».
   */
  async registerInbound(clientId: string, channel: ChannelKind, externalId?: string) {
    if (channel === ChannelKind.INTERNAL) return null;
    return this.prisma.clientChannel.upsert({
      where: { clientId_channel: { clientId, channel } },
      create: {
        clientId,
        channel,
        externalId: externalId ?? null,
        available: true,
        source: ChannelSource.WEBHOOK,
        checkedAt: new Date(),
      },
      update: {
        available: true,
        source: ChannelSource.WEBHOOK,
        checkedAt: new Date(),
        ...(externalId ? { externalId } : {}),
      },
      select: CHANNEL_FIELDS,
    });
  }

  private async probeOne(
    driver: Awaited<ReturnType<ChannelRegistry['driver']>>,
    clientId: string,
    channel: ChannelKind,
    phone: string,
    row: ChannelRow | undefined,
    force: boolean,
  ) {
    const fresh =
      row?.checkedAt && Date.now() - row.checkedAt.getTime() < PROBE_TTL_MS;
    if (!force && row?.source === ChannelSource.MANUAL) return;
    if (!force && fresh) return;

    let result;
    try {
      result = await driver.probe(channel, phone);
    } catch (error) {
      // Сбой провайдера не должен превращать известный канал в недоступный
      // и не должен двигать checkedAt — иначе ошибка заморозит ответ на месяц.
      this.logger.warn(`Проба ${channel} для клиента ${clientId} не удалась: ${this.reason(error)}`);
      if (!row) {
        await this.prisma.clientChannel.create({
          data: {
            clientId,
            channel,
            available: false,
            source: ChannelSource.PROBE,
            note: `Проверка не удалась: ${this.reason(error)}`,
          },
        });
      } else {
        await this.prisma.clientChannel.update({
          where: { id: row.id },
          data: { note: `Проверка не удалась: ${this.reason(error)}` },
        });
      }
      return;
    }

    await this.prisma.clientChannel.upsert({
      where: { clientId_channel: { clientId, channel } },
      create: {
        clientId,
        channel,
        available: result.available,
        externalId: result.externalId ?? phone,
        source: ChannelSource.PROBE,
        checkedAt: new Date(),
        note: result.reason ?? null,
      },
      update: {
        available: result.available,
        source: ChannelSource.PROBE,
        checkedAt: new Date(),
        note: result.reason ?? null,
        ...(result.externalId ? { externalId: result.externalId } : {}),
      },
    });
  }

  private reason(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

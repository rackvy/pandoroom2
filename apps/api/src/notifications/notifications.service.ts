import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramChannel } from './channels/telegram.channel';
import { SmsChannel } from './channels/sms.channel';
import { MaxChannel } from './channels/max.channel';
import { renderTemplate, DEFAULT_TEMPLATES } from './templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** In-memory template cache: key → templateText */
  private templateCache: Map<string, string> = new Map();
  private cacheLoaded = false;

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramChannel,
    private sms: SmsChannel,
    private max: MaxChannel,
  ) {}

  /**
   * Load templates from DB into cache.
   * Falls back to DEFAULT_TEMPLATES if DB is empty or on error.
   */
  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded) return;
    try {
      const dbTemplates = await this.prisma.notificationTemplate.findMany({
        where: { isActive: true },
      });
      for (const t of dbTemplates) {
        this.templateCache.set(t.key, t.templateText);
      }
      this.cacheLoaded = true;
      this.logger.log(`Loaded ${dbTemplates.length} templates from DB`);
    } catch (err) {
      this.logger.warn(`Failed to load templates from DB, using defaults: ${err}`);
      this.cacheLoaded = true;
    }
  }

  /** Resolve template text from cache → DB → default fallback */
  private async resolveTemplateText(templateKey: string): Promise<string> {
    await this.ensureCacheLoaded();
    if (this.templateCache.has(templateKey)) {
      return this.templateCache.get(templateKey)!;
    }
    return DEFAULT_TEMPLATES[templateKey] || templateKey;
  }

  /** Refresh template cache (call after admin edits) */
  async refreshTemplateCache(): Promise<void> {
    this.cacheLoaded = false;
    this.templateCache.clear();
    await this.ensureCacheLoaded();
  }

  // ==================== TEMPLATE CRUD ====================

  async getTemplates() {
    const dbTemplates = await this.prisma.notificationTemplate.findMany({
      orderBy: { key: 'asc' },
    });
    // Merge with defaults: if a default key is missing in DB, include it as a hint
    const result = [...dbTemplates];
    const dbKeys = new Set(dbTemplates.map(t => t.key));
    for (const [key, text] of Object.entries(DEFAULT_TEMPLATES)) {
      if (!dbKeys.has(key)) {
        result.push({
          id: `__default__${key}`,
          key,
          name: key,
          trigger: 'Не настроен',
          templateText: text,
          description: null,
          channel: 'sms',
          isActive: false,
          updatedAt: new Date(),
        });
      }
    }
    return result;
  }

  async updateTemplate(id: string, data: { templateText?: string; name?: string; description?: string; channel?: string; isActive?: boolean }) {
    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
    // Refresh cache
    await this.refreshTemplateCache();
    return updated;
  }

  // ==================== SEND / ENQUEUE ====================

  async send(bookingId: string, templateKey: string, channel: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true },
    });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    const variables: Record<string, string> = {
      clientName: booking.clientName,
      eventDate: booking.eventDate.toLocaleDateString('ru-RU'),
      branchPhone: booking.branch.phone || '',
    };
    const templateText = await this.resolveTemplateText(templateKey);
    const text = renderTemplate(templateText, variables);

    return this.dispatch({
      bookingId,
      channel,
      template: templateKey,
      text,
      recipient: this.resolveRecipient(channel, booking.clientPhone, booking.client),
    });
  }

  /**
   * Send a notification without requiring a booking (e.g. waitlist, admin alerts).
   * Renders template with provided variables and dispatches to the channel.
   */
  async sendRaw(params: {
    templateKey: string;
    variables: Record<string, string>;
    channel: string;
    recipient: string;
    bookingId?: string;
    waitlistId?: string;
  }) {
    const templateText = await this.resolveTemplateText(params.templateKey);
    const text = renderTemplate(templateText, params.variables);
    return this.dispatch({
      bookingId: params.bookingId || null,
      waitlistId: params.waitlistId || null,
      channel: params.channel,
      template: params.templateKey,
      text,
      recipient: params.recipient,
    });
  }

  /**
   * Enqueue a notification for later delivery (when TG bot / ЛК are connected).
   * Logs as 'queued' status — no actual dispatch yet.
   */
  async enqueue(params: {
    templateKey: string;
    variables: Record<string, string>;
    channel: string;
    recipient: string;
    bookingId?: string;
    waitlistId?: string;
  }) {
    const templateText = await this.resolveTemplateText(params.templateKey);
    const text = renderTemplate(templateText, params.variables);
    await this.prisma.notificationLog.create({
      data: {
        bookingId: params.bookingId || null,
        waitlistId: params.waitlistId || null,
        channel: params.channel,
        template: params.templateKey,
        recipient: params.recipient,
        status: 'queued',
        errorText: `Pending delivery: ${text}`,
      },
    });
    this.logger.log(`Enqueued [${params.templateKey}] → ${params.recipient} (${params.channel})`);
    return { success: true, queued: true };
  }

  private async dispatch(params: {
    bookingId?: string | null;
    waitlistId?: string | null;
    channel: string;
    template: string;
    text: string;
    recipient: string;
  }) {
    let result: { success: boolean; error?: string };

    switch (params.channel) {
      case 'telegram':
        result = await this.telegram.send(params.recipient, params.text);
        break;
      case 'sms':
        result = await this.sms.send(params.recipient, params.text);
        break;
      case 'max':
        result = await this.max.send(params.recipient, params.text);
        break;
      default:
        result = { success: false, error: `Неизвестный канал: ${params.channel}` };
    }

    await this.prisma.notificationLog.create({
      data: {
        bookingId: params.bookingId || null,
        waitlistId: params.waitlistId || null,
        channel: params.channel,
        template: params.template,
        recipient: params.recipient,
        status: result.success ? 'sent' : 'failed',
        errorText: result.error || null,
      },
    });

    return result;
  }

  private resolveRecipient(channel: string, phone: string, client: any): string {
    switch (channel) {
      case 'telegram': return client?.telegramChatId || '';
      case 'sms': return phone;
      case 'max': return client?.maxChatId || '';
      default: return phone;
    }
  }

  async getLogsByBooking(bookingId: string) {
    return this.prisma.notificationLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

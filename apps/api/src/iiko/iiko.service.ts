import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IikoService {
  private readonly logger = new Logger(IikoService.name);
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getAccessToken(): Promise<string | null> {
    const apiLogin = this.configService.get<string>('IIKO_API_LOGIN');
    const apiUrl = this.configService.get<string>('IIKO_API_URL', 'https://api-ru.iiko.services');

    if (!apiLogin) {
      this.logger.warn('[STUB] IIKO_API_LOGIN not configured');
      return null;
    }

    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    try {
      const response = await fetch(`${apiUrl}/api/1/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiLogin }),
      });
      const data = await response.json();
      this.cachedToken = { token: data.token, expiresAt: Date.now() + 14 * 60 * 1000 }; // 14 min
      return data.token;
    } catch (error: any) {
      this.logger.error(`Failed to get iiko token: ${error.message}`);
      return null;
    }
  }

  async getMenu() {
    // Try to get cached menu items from DB
    const cachedItems = await this.prisma.iikoMenuItem.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    if (cachedItems.length > 0) return cachedItems;

    // If no cache, return stub data
    return [
      { id: '1', iikoId: 'stub-1', name: 'Лимонад', category: 'Напитки', department: 'bar', price: 250, isActive: true, updatedAt: new Date() },
      { id: '2', iikoId: 'stub-2', name: 'Пицца Маргарита', category: 'Пицца', department: 'pizza', price: 650, isActive: true, updatedAt: new Date() },
      { id: '3', iikoId: 'stub-3', name: 'Стейк', category: 'Горячее', department: 'hot_kitchen', price: 1200, isActive: true, updatedAt: new Date() },
    ];
  }

  async syncMenu() {
    const token = await this.getAccessToken();
    if (!token) {
      this.logger.log('[STUB] Menu sync skipped — no token');
      return { synced: 0, message: 'STUB: iiko API не настроен' };
    }

    const apiUrl = this.configService.get<string>('IIKO_API_URL', 'https://api-ru.iiko.services');
    const orgId = this.configService.get<string>('IIKO_ORGANIZATION_ID');
    if (!orgId) return { synced: 0, message: 'IIKO_ORGANIZATION_ID not configured' };

    try {
      const response = await fetch(`${apiUrl}/api/1/nomenclature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const data = await response.json();

      // Process and save menu items
      let synced = 0;
      for (const group of (data.productCategories || [])) {
        for (const product of (group.products || [])) {
          await this.prisma.iikoMenuItem.upsert({
            where: { iikoId: product.id },
            create: {
              iikoId: product.id,
              name: product.name,
              category: group.name,
              price: product.price || 0,
            },
            update: {
              name: product.name,
              category: group.name,
              price: product.price || 0,
            },
          });
          synced++;
        }
      }

      return { synced, message: `Синхронизировано ${synced} позиций` };
    } catch (error: any) {
      this.logger.error(`Menu sync failed: ${error.message}`);
      return { synced: 0, message: `Ошибка: ${error.message}` };
    }
  }

  async createOrder(bookingId: string, items: { name: string; qty: number; price: number }[]) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Бронирование не найдено');

    // Stub: generate fake iiko order ID
    const iikoOrderId = `iiko-stub-${Date.now()}`;
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { iikoOrderId, iikoOrderStatus: 'created' },
    });

    this.logger.log(`[STUB] iiko order created: ${iikoOrderId} with ${items.length} items`);
    return { iikoOrderId, status: 'created' };
  }

  async getOrderStatus(iikoOrderId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { iikoOrderId },
      select: { id: true, iikoOrderId: true, iikoOrderStatus: true, clientName: true },
    });
    if (!booking) throw new NotFoundException('Заказ iiko не найден');
    return { iikoOrderId, status: booking.iikoOrderStatus || 'unknown' };
  }

  async handleWebhook(payload: any) {
    this.logger.log(`iiko webhook: ${JSON.stringify(payload)}`);

    const orderId = payload.orderId || payload.order_id;
    const status = payload.status || payload.category;

    if (!orderId) return { ok: false, error: 'No orderId in payload' };

    const booking = await this.prisma.booking.findFirst({ where: { iikoOrderId: orderId } });
    if (!booking) {
      this.logger.warn(`iiko webhook: booking not found for iikoOrderId=${orderId}`);
      return { ok: false, error: 'Booking not found' };
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { iikoOrderStatus: status },
    });

    return { ok: true, bookingId: booking.id, status };
  }
}

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
    const items = await this.prisma.iikoMenuItem.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    if (items.length > 0) return items;

    // If no cache, return stub data
    return [
      { id: '1', iikoId: 'stub-1', name: 'Лимонад', category: 'Напитки', department: 'bar', price: 250, isActive: true, description: null, imageUrl: null, weight: null, updatedAt: new Date() },
      { id: '2', iikoId: 'stub-2', name: 'Пицца Маргарита', category: 'Пицца', department: 'pizza', price: 650, isActive: true, description: null, imageUrl: null, weight: null, updatedAt: new Date() },
      { id: '3', iikoId: 'stub-3', name: 'Стейк', category: 'Горячее', department: 'hot_kitchen', price: 1200, isActive: true, description: null, imageUrl: null, weight: null, updatedAt: new Date() },
    ];
  }

  async syncMenu() {
    const token = await this.getAccessToken();
    if (!token) {
      this.logger.log('[STUB] Menu sync skipped — no token');
      return { synced: 0, deactivated: 0, message: 'STUB: iiko API не настроен' };
    }

    const apiUrl = this.configService.get<string>('IIKO_API_URL', 'https://api-ru.iiko.services');
    const orgId = this.configService.get<string>('IIKO_ORGANIZATION_ID');
    if (!orgId) return { synced: 0, deactivated: 0, message: 'IIKO_ORGANIZATION_ID not configured' };

    try {
      const response = await fetch(`${apiUrl}/api/1/nomenclature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const data = await response.json();

      // Build category name lookup
      const catMap: Record<string, string> = {};
      for (const cat of (data.productCategories || [])) {
        catMap[cat.id] = cat.name;
      }

      // Products are in a flat array
      const products: any[] = data.products || [];
      const syncedIds = new Set<string>();
      let synced = 0;

      for (const product of products) {
        // Skip deleted products
        if (product.isDeleted) continue;

        // Get price from sizePrices
        let price = 0;
        if (product.sizePrices && product.sizePrices.length > 0) {
          const sp = product.sizePrices[0];
          price = sp?.price?.currentPrice || 0;
        }
        // Skip zero-price items (internal/stock items)
        if (price <= 0) continue;

        // Get category name
        const categoryName = catMap[product.productCategoryId] || 'Без категории';

        // Get image URL
        const imageUrl = (product.imageLinks && product.imageLinks.length > 0)
          ? product.imageLinks[0]
          : null;

        // Format weight
        let weight: string | null = null;
        if (product.weight && product.measureUnit) {
          weight = `${product.weight} ${product.measureUnit}`;
        }

        const iikoId = product.id;
        syncedIds.add(iikoId);

        await this.prisma.iikoMenuItem.upsert({
          where: { iikoId },
          create: {
            iikoId,
            name: product.name || 'Без названия',
            description: product.description || null,
            category: categoryName,
            price: price,
            imageUrl,
            weight,
            isActive: true,
          },
          update: {
            name: product.name || 'Без названия',
            description: product.description || null,
            category: categoryName,
            price: price,
            imageUrl,
            weight,
            isActive: true,
          },
        });
        synced++;
      }

      // Deactivate products no longer in iiko
      const deactivated = await this.prisma.iikoMenuItem.updateMany({
        where: {
          iikoId: { notIn: Array.from(syncedIds) },
          isActive: true,
        },
        data: { isActive: false },
      });

      return {
        synced,
        deactivated: deactivated.count,
        message: `Синхронизировано ${synced} позиций, деактивировано ${deactivated.count}`,
      };
    } catch (error: any) {
      this.logger.error(`Menu sync failed: ${error.message}`);
      return { synced: 0, deactivated: 0, message: `Ошибка: ${error.message}` };
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

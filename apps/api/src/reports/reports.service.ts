import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async getFoodReportByDate(date: string, branchId?: string) {
    const dateObj = new Date(date);

    const whereClause: any = {
      booking: {
        eventDate: dateObj,
        status: { not: 'canceled' },
      },
    };
    if (branchId) {
      whereClause.booking.branchId = branchId;
    }

    const foodItems = await this.prisma.bookingFoodItem.findMany({
      where: whereClause,
      include: {
        booking: {
          select: {
            clientName: true,
            eventDate: true,
            branch: { select: { name: true } },
          },
        },
      },
    });

    // Group by department
    const departments: Record<
      string,
      { name: string; items: Record<string, { name: string; totalQuantity: number }> }
    > = {};

    const departmentLabels: Record<string, string> = {
      bar: 'Бар',
      pizza: 'Пицца',
      hot_kitchen: 'Горячий цех',
      cold_kitchen: 'Холодный цех',
    };

    for (const item of foodItems) {
      const dept = item.department || 'other';
      if (!departments[dept]) {
        departments[dept] = {
          name: departmentLabels[dept] || 'Без цеха',
          items: {},
        };
      }
      const key = item.title.toLowerCase();
      if (!departments[dept].items[key]) {
        departments[dept].items[key] = { name: item.title, totalQuantity: 0 };
      }
      departments[dept].items[key].totalQuantity += item.qty;
    }

    // Convert to arrays
    const result = Object.entries(departments).map(([key, dept]) => ({
      key,
      name: dept.name,
      items: Object.values(dept.items).sort((a, b) => b.totalQuantity - a.totalQuantity),
      totalItems: Object.values(dept.items).reduce((sum, i) => sum + i.totalQuantity, 0),
    }));

    const totalItems = result.reduce((sum, d) => sum + d.totalItems, 0);

    return {
      date,
      branchId: branchId || null,
      departments: result.sort((a, b) => b.totalItems - a.totalItems),
      totalItems,
      totalBookings: new Set(foodItems.map((f) => f.bookingId)).size,
    };
  }
}

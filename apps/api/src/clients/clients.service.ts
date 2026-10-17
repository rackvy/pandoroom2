import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { isValidPhone, normalizePhone } from '../client-auth/phone';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/** Что доводка сделала с одной броней. */
export interface BookingLinkItem {
  bookingId: string;
  phone: string;
  action: 'linked' | 'client-created' | 'skipped-invalid';
  clientId: string | null;
}

export interface BookingLinkReport {
  dryRun: boolean;
  scanned: number;
  linked: number;
  clientCreated: number;
  skippedInvalid: number;
  /** Брони без телефона — привязывать нечем, их видно только здесь. */
  skippedNoPhone: number;
  /** Карточки с одинаковыми последними 10 цифрами: отчёт, склейка не здесь. */
  duplicateGroups: { key: string; clients: { id: string; phone: string; name: string }[] }[];
  items: BookingLinkItem[];
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    
    if (search) {
      const digits = search.replace(/\D/g, '');
      const phoneClause =
        digits.length >= 4
          ? { phone: { contains: digits.slice(-10) } }
          : { phone: { contains: search, mode: 'insensitive' as const } };

      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        phoneClause,
      ];
    }

    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              bookings: true,
              questReservations: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { eventDate: 'desc' },
          include: {
            branch: true,
            tableReservations: {
              include: { table: { include: { zone: true } } },
            },
            questReservations: {
              include: { quest: true },
            },
          },
        },
        questReservations: {
          orderBy: { eventDate: 'desc' },
          include: {
            quest: true,
            branch: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return client;
  }

  async findByPhone(rawPhone: string) {
    const phone = normalizePhone(rawPhone || '');
    if (!isValidPhone(phone)) return null;
    return this.findAnyByPhone(phone);
  }

  /**
   * Номера в базе записаны по-разному: «+7999…», «7999…», «8999…». Канон
   * нормализует ввод, но старые карточки остаются в своём формате, поэтому
   * после точного поиска добавляется совпадение по последним 10 цифрам —
   * иначе заявка с тем же номером заводит второго клиента.
   */
  private async findAnyByPhone(phone: string) {
    const exact = await this.prisma.client.findUnique({ where: { phone } });
    if (exact) return exact;
    if (phone.length < 10) return null;

    return this.prisma.client.findFirst({
      where: { phone: { endsWith: phone.slice(-10) } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: CreateClientDto) {
    const phone = normalizePhone(data.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException('Некорректный номер телефона');
    }

    // Check if phone already exists
    const existing = await this.findAnyByPhone(phone);

    if (existing) {
      throw new ConflictException('Клиент с таким телефоном уже существует');
    }

    return this.prisma.client.create({
      data: {
        ...data,
        phone,
        birthday: data.birthday ? new Date(data.birthday) : null,
      },
    });
  }

  async update(id: string, data: UpdateClientDto) {
    await this.findOne(id);

    // Check phone uniqueness if updating phone
    let phone: string | undefined;
    if (data.phone) {
      phone = normalizePhone(data.phone);
      if (!isValidPhone(phone)) {
        throw new BadRequestException('Некорректный номер телефона');
      }
      const existing = await this.findAnyByPhone(phone);

      if (existing && existing.id !== id) {
        throw new ConflictException('Клиент с таким телефоном уже существует');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...data,
        phone,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.delete({ where: { id } });
    return { message: 'Клиент удален' };
  }

  /**
   * Карточка клиента по номеру: точное совпадение с каноном, затем последние
   * 10 цифр, при промахе — создание. `strict` нужен публичной форме, где
   * невалидный номер — ошибка пользователя. Брони он ни к чему: городской или
   * добавочный номер не повод отменять заявку.
   */
  private async clientForPhone(
    rawPhone: string,
    name: string | undefined,
    strict: boolean,
  ): Promise<Client | null> {
    const phone = normalizePhone(rawPhone || '');
    if (!isValidPhone(phone)) {
      if (strict) throw new BadRequestException('Некорректный номер телефона');
      return null;
    }

    const trimmedName = (name || '').trim();
    const existing = await this.findAnyByPhone(phone);

    if (existing) {
      // Имя из новой заявки важнее сохранённого: гость мог указать другого ответственного
      if (trimmedName && trimmedName !== existing.name) {
        return this.prisma.client.update({
          where: { id: existing.id },
          data: { name: trimmedName },
        });
      }
      return existing;
    }

    try {
      return await this.prisma.client.create({
        data: { phone, name: trimmedName || 'Новый клиент' },
      });
    } catch (error) {
      // Заявка и первое входящее сообщение могут заводить карточку одновременно.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.findAnyByPhone(phone);
      }
      throw error;
    }
  }

  // Get or create client by phone (used when creating bookings)
  async getOrCreate(rawPhone: string, name: string) {
    const client = await this.clientForPhone(rawPhone, name, true);
    if (!client) throw new BadRequestException('Некорректный номер телефона');
    return client;
  }

  /**
   * То же правило совпадения, что у новой брони, но без падения на мусорном
   * номере: null означает «привязывать не к чему», а не «ошибка в данных».
   */
  async resolveForBooking(rawPhone: string, name?: string): Promise<string | null> {
    const client = await this.clientForPhone(rawPhone, name, false);
    return client?.id ?? null;
  }

  /**
   * Доводка старых броней: привязать карточку клиента по номеру. Совпадение
   * ищется тем же правилом, что при создании брони, иначе прогон и рантайм
   * разъедутся. Имена существующих карточек не перезаписываем — в отличие от
   * новой заявки здесь нет человека, который подтвердил бы другое имя.
   * Флаг dryRun ничего не пишет, но отчёт даёт тот же.
   */
  async backfillBookingLinks(
    options: { dryRun?: boolean; take?: number } = {},
  ): Promise<BookingLinkReport> {
    const dryRun = options.dryRun ?? true;
    const take = options.take ?? 500;

    const candidates = await this.prisma.booking.findMany({
      where: { clientId: null, NOT: { clientPhone: '' } },
      select: { id: true, clientPhone: true, clientName: true },
      orderBy: { id: 'asc' },
      take,
    });
    const skippedNoPhone = await this.prisma.booking.count({
      where: { clientId: null, clientPhone: '' },
    });

    const items: BookingLinkItem[] = [];
    let linked = 0;
    let clientCreated = 0;
    let skippedInvalid = 0;

    for (const booking of candidates) {
      const phone = normalizePhone(booking.clientPhone || '');
      if (!isValidPhone(phone)) {
        skippedInvalid += 1;
        items.push({
          bookingId: booking.id,
          phone: booking.clientPhone,
          action: 'skipped-invalid',
          clientId: null,
        });
        continue;
      }

      const found = await this.findAnyByPhone(phone);
      let clientId = found?.id ?? null;
      if (found) linked += 1;
      else clientCreated += 1;

      if (!found && !dryRun) {
        try {
          const created = await this.prisma.client.create({
            data: { phone, name: (booking.clientName || '').trim() || 'Новый клиент' },
          });
          clientId = created.id;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            clientId = (await this.findAnyByPhone(phone))?.id ?? null;
          } else {
            throw error;
          }
        }
      }

      if (clientId && !dryRun) {
        await this.prisma.booking.update({ where: { id: booking.id }, data: { clientId } });
      }

      items.push({
        bookingId: booking.id,
        phone,
        action: found ? 'linked' : 'client-created',
        // При пробном прогоне карточки ещё нет — не показываем id, которого не существует.
        clientId: dryRun && !found ? null : clientId,
      });
    }

    return {
      dryRun,
      scanned: candidates.length,
      linked,
      clientCreated,
      skippedInvalid,
      skippedNoPhone,
      duplicateGroups: await this.duplicatePhoneGroups(),
      items,
    };
  }

  /** Клиенты с одинаковыми последними 10 цифрами. Только отчёт, ничего не склеиваем. */
  async duplicatePhoneGroups(): Promise<BookingLinkReport['duplicateGroups']> {
    const rows = await this.prisma.client.findMany({
      select: { id: true, phone: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const byTail = new Map<string, { id: string; phone: string; name: string }[]>();
    for (const row of rows) {
      const canon = normalizePhone(row.phone || '');
      if (!isValidPhone(canon)) continue;
      const tail = canon.slice(-10);
      const list = byTail.get(tail) ?? [];
      list.push({ id: row.id, phone: row.phone, name: row.name });
      byTail.set(tail, list);
    }

    return [...byTail.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([key, clients]) => ({ key, clients }));
  }
}

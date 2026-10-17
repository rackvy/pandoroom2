/**
 * Отчёт о дублях Client.phone. Только чтение: ничего не меняет в базе.
 * Запуск: npx ts-node prisma/phone-dupes.report.ts
 * Основание для решения «склеиваем по последним 10 цифрам или чиним руками».
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ClientRow {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  notes: string | null;
  telegramChatId: string | null;
  maxChatId: string | null;
  preferredChannel: string | null;
  hasPassword: boolean;
  createdAt: Date;
}

interface ChildCounts {
  bookings: number;
  quests: number;
  vr: number;
  messages: number;
  channels: number;
}

/** Ключ сравнения: последние 10 цифр национального номера. */
function nationalKey(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

async function loadCounts(ids: string[]): Promise<Map<string, ChildCounts>> {
  const counts = new Map<string, ChildCounts>(
    ids.map((id) => [id, { bookings: 0, quests: 0, vr: 0, messages: 0, channels: 0 }]),
  );
  const bump = (
    rows: { _count: number; clientId: string | null }[],
    field: keyof ChildCounts,
  ) => {
    for (const row of rows) {
      if (!row.clientId) continue;
      const entry = counts.get(row.clientId);
      if (entry) entry[field] = row._count;
    }
  };

  const [bookings, quests, vr, messages, channels] = await Promise.all([
    prisma.booking.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: { id: true } }),
    prisma.questReservation.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: { id: true } }),
    prisma.vRReservation.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: { id: true } }),
    prisma.chatMessage.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: { id: true } }),
    prisma.clientChannel.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _count: { id: true } }),
  ]);

  bump(bookings.map((r) => ({ clientId: r.clientId, _count: r._count.id })), 'bookings');
  bump(quests.map((r) => ({ clientId: r.clientId, _count: r._count.id })), 'quests');
  bump(vr.map((r) => ({ clientId: r.clientId, _count: r._count.id })), 'vr');
  bump(messages.map((r) => ({ clientId: r.clientId, _count: r._count.id })), 'messages');
  bump(channels.map((r) => ({ clientId: r.clientId, _count: r._count.id })), 'channels');
  return counts;
}

function flagRow(client: ClientRow, counts: ChildCounts): string {
  const flags: string[] = [];
  if (client.hasPassword) flags.push('пароль');
  if (client.telegramChatId) flags.push('tg');
  if (client.maxChatId) flags.push('max');
  if (client.email) flags.push('email');
  if (client.notes) flags.push('заметки');
  const rel = `брони ${counts.bookings}, квесты ${counts.quests}, vr ${counts.vr}, сообщения ${counts.messages}, каналы ${counts.channels}`;
  return `    ${client.createdAt.toISOString().slice(0, 10)} | ${client.phone.padEnd(20)} | ${client.id} | ${client.name}` +
    ` | ${rel} | ${flags.length ? flags.join(',') : 'без дополнений'}`;
}

async function main() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      notes: true,
      telegramChatId: true,
      maxChatId: true,
      preferredChannel: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    ...c,
    hasPassword: Boolean(c.passwordHash),
  }));

  const groups = new Map<string, ClientRow[]>();
  const uncomparable: ClientRow[] = [];
  for (const row of rows) {
    const key = nationalKey(row.phone);
    if (!key) {
      uncomparable.push(row);
      continue;
    }
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const dupes = [...groups.entries()].filter(([, list]) => list.length > 1).sort();
  const counts = await loadCounts(rows.map((c) => c.id));

  console.log(`Клиентов в базе: ${rows.length}`);
  console.log(`Номеров, не сводимых к 10 цифрам (пропущены): ${uncomparable.length}`);
  console.log(`Групп по последним 10 цифрам: ${groups.size}`);
  console.log(`Групп с дублями: ${dupes.length}`);

  if (!dupes.length) {
    console.log('Дублей нет — можно нормализовать Client.phone без склейки.');
  }

  for (const [key, list] of dupes) {
    const names = new Set(list.map((c) => c.name.trim()));
    const passwordHolders = list.filter((c) => c.hasPassword).length;
    console.log('');
    console.log(`Группа ${key} — ${list.length} клиента`);
    if (names.size > 1) console.log(`    ВНИМАНИЕ: разные имена: ${[...names].join(' / ')}`);
    if (passwordHolders > 1) console.log(`    ВНИМАНИЕ: пароль задан у ${passwordHolders} строк — чужой хеш отдавать нельзя`);
    for (const client of list) console.log(flagRow(client, counts.get(client.id)!));
  }

  if (uncomparable.length) {
    console.log('');
    console.log('Номера короче 10 цифр (маска их не трогает, склейка невозможна):');
    for (const client of uncomparable) {
      console.log(`    ${client.phone} | ${client.id} | ${client.name}`);
    }
  }
}

main()
  .catch((err) => {
    console.error('Отчёт не собран:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

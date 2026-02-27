import { PrismaClient, EmployeeRole, Difficulty, BookingStatus, TableZoneKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем seed...');

  // 1. Создаем ADMIN сотрудника
  const adminPassword = await bcrypt.hash('Admin12345!', 10);
  
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@pandoroom.local' },
    update: {},
    create: {
      email: 'admin@pandoroom.local',
      passwordHash: adminPassword,
      fullName: 'Администратор',
      phone: '+7 (999) 999-99-99',
      position: 'Главный администратор',
      role: EmployeeRole.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Создан администратор:', admin.email);

  // 2. Создаем филиал
  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Pandoroom Central',
      geoLat: 55.7558,
      geoLng: 37.6173,
      phone: '+7 (495) 123-45-67',
      whatsapp: '+7 (495) 123-45-67',
      telegram: '@pandoroom',
    },
  });
  console.log('✅ Создан филиал:', branch.name);

  // 3. Создаем квест
  const quest = await prisma.quest.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      branchId: branch.id,
      name: 'Тайна заброшенного особняка',
      genre: 'Мистика',
      difficulty: Difficulty.medium,
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Вы попадаете в старый особняк, полный тайн и загадок. Сможете ли вы разгадать его секреты и выбраться за 60 минут?',
      rules: 'Запрещено использовать физическую силу. Нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
  });
  console.log('✅ Создан квест:', quest.name);

  // 4. Создаем источник отзывов
  const reviewSource = await prisma.reviewSource.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Яндекс.Карты',
    },
  });
  console.log('✅ Создан источник отзывов:', reviewSource.name);

  // 5. Создаем тестовый отзыв
  const review = await prisma.review.create({
    data: {
      name: 'Иван Петров',
      rating: 5,
      sourceId: reviewSource.id,
      text: 'Отличный квест! Очень атмосферно, загадки интересные. Обязательно придем еще!',
    },
  });
  console.log('✅ Создан отзыв от:', review.name);

  // 6. Создаем AboutFact
  const aboutFact = await prisma.aboutFact.create({
    data: {
      text: 'Более 10 000 довольных клиентов за 5 лет работы',
      sortOrder: 1,
    },
  });
  console.log('✅ Создан факт:', aboutFact.text.substring(0, 30) + '...');

  // 7. Создаем новость
  const news = await prisma.news.create({
    data: {
      title: 'Открытие нового квеста!',
      date: new Date(),
      content: 'Мы рады сообщить об открытии нового квеста "Тайна заброшенного особняка". Приходите и испытайте свои силы!',
    },
  });
  console.log('✅ Создана новость:', news.title);

  // 8. Создаем PageBlock для главной страницы
  const pageBlock = await prisma.pageBlock.create({
    data: {
      pageKey: 'HOME',
      blockKey: 'hero',
      title: 'Добро пожаловать в Pandoroom',
      text: 'Погрузитесь в мир захватывающих квестов и незабываемых эмоций',
      sortOrder: 1,
    },
  });
  console.log('✅ Создан блок страницы:', pageBlock.blockKey);

  // 9. Создаем поставщика
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Сладкий мир',
      contactName: 'Мария',
      phone: '+7 (999) 888-77-66',
      email: 'cakes@sweetworld.ru',
    },
  });
  console.log('✅ Создан поставщик:', supplier.name);

  // 10. Создаем торт
  const cake = await prisma.cake.create({
    data: {
      name: 'Шоколадный рай',
      priceRub: 3500,
      weightGrams: 2000,
      supplierId: supplier.id,
    },
  });
  console.log('✅ Создан торт:', cake.name);

  // 11. Создаем зоны столов
  const cafeZone = await prisma.tableZone.create({
    data: {
      branchId: branch.id,
      key: TableZoneKey.CAFE,
      name: 'Кафе',
      sortOrder: 1,
    },
  });
  console.log('✅ Создана зона:', cafeZone.name);

  const loungeZone = await prisma.tableZone.create({
    data: {
      branchId: branch.id,
      key: TableZoneKey.LOUNGE,
      name: 'Лаунж',
      sortOrder: 2,
    },
  });
  console.log('✅ Создана зона:', loungeZone.name);

  const kidsZone = await prisma.tableZone.create({
    data: {
      branchId: branch.id,
      key: TableZoneKey.KIDS,
      name: 'Детская зона',
      sortOrder: 3,
    },
  });
  console.log('✅ Создана зона:', kidsZone.name);

  // 12. Создаем столы для зоны CAFE
  const cafeTables = ['Плаха', 'Вход', 'Бар', '1', '2', '3', '4'];
  for (let i = 0; i < cafeTables.length; i++) {
    const table = await prisma.table.create({
      data: {
        branchId: branch.id,
        zoneId: cafeZone.id,
        title: cafeTables[i],
        sortOrder: i + 1,
        capacity: cafeTables[i].match(/^\d+$/) ? 4 : 6,
      },
    });
    console.log(`✅ Создан стол: ${table.title} (${cafeZone.name})`);
  }

  // 13. Создаем столы для зоны LOUNGE
  const loungeTables = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];
  for (let i = 0; i < loungeTables.length; i++) {
    const table = await prisma.table.create({
      data: {
        branchId: branch.id,
        zoneId: loungeZone.id,
        title: loungeTables[i],
        sortOrder: i + 1,
        capacity: 4,
      },
    });
    console.log(`✅ Создан стол: ${table.title} (${loungeZone.name})`);
  }

  // 14. Создаем столы для зоны KIDS
  const kidsTables = ['PS4 + T7', 'Игровая 1', 'Игровая 2'];
  for (let i = 0; i < kidsTables.length; i++) {
    const table = await prisma.table.create({
      data: {
        branchId: branch.id,
        zoneId: kidsZone.id,
        title: kidsTables[i],
        sortOrder: i + 1,
        capacity: kidsTables[i].includes('PS4') ? 2 : 6,
      },
    });
    console.log(`✅ Создан стол: ${table.title} (${kidsZone.name})`);
  }

  console.log('\n🎉 Seed завершен успешно!');
  console.log('\n📧 Данные для входа:');
  console.log('   Email: admin@pandoroom.local');
  console.log('   Password: Admin12345!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

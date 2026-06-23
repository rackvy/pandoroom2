import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Type for PageKey
type PageKeyType = 'HOME' | 'PARTY_GUIDE' | 'PARTY_GUIDE_KIDS' | 'PARTY_GUIDE_6_10' | 'PARTY_GUIDE_10_15' | 'CAFE' | 'CAFE_KAFE' | 'CAFE_LOUNGE' | 'CAFE_KIDS';

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
      role: 'ADMIN',
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

  // 3. Создаем квесты (idempotent: upsert preserves previewImageId/backgroundImageId)

  const questData = [
    // === Quests with actors (hasActors: true) ===
    {
      id: '00000000-0000-0000-0000-100000000001',
      branchId: branch.id,
      name: 'Гарри Поттер',
      subtitle: 'и Философский камень',
      genre: 'приключение',
      difficulty: 'medium' as const,
      hasActors: true,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Гарри Поттер — и Философский камень',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000002',
      branchId: branch.id,
      name: 'Чумной доктор',
      genre: 'мистический',
      difficulty: 'medium' as const,
      hasActors: true,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Чумной доктор',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000003',
      branchId: branch.id,
      name: 'Сокровища пиратов',
      genre: 'приключение',
      difficulty: 'easy' as const,
      hasActors: true,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Сокровища пиратов',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000004',
      branchId: branch.id,
      name: 'Resident Evil',
      genre: 'хоррор',
      difficulty: 'medium' as const,
      hasActors: true,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 80,
      description: 'Описание квеста Resident Evil',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000005',
      branchId: branch.id,
      name: 'Код Да Винчи',
      genre: 'приключение',
      difficulty: 'medium' as const,
      hasActors: true,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Код Да Винчи',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    // === Quests without actors (hasActors: false, ageRestriction NOT "0+") ===
    {
      id: '00000000-0000-0000-0000-100000000006',
      branchId: branch.id,
      name: 'Инквизиция',
      genre: 'мистический',
      difficulty: 'hard' as const,
      hasActors: false,
      ageRestriction: '14+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Инквизиция',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000007',
      branchId: branch.id,
      name: 'Silent Hill',
      genre: 'хоррор',
      difficulty: 'hard' as const,
      hasActors: false,
      ageRestriction: '16+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 80,
      description: 'Описание квеста Silent Hill',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000008',
      branchId: branch.id,
      name: 'Секретный эксперимент',
      genre: 'детектив',
      difficulty: 'hard' as const,
      hasActors: false,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 70,
      description: 'Описание квеста Секретный эксперимент',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000009',
      branchId: branch.id,
      name: 'Тайна старого театра',
      genre: 'мистический',
      difficulty: 'medium' as const,
      hasActors: false,
      ageRestriction: '12+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Тайна старого театра',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    {
      id: '00000000-0000-0000-0000-100000000010',
      branchId: branch.id,
      name: 'Охотники',
      genre: 'хоррор',
      difficulty: 'hard' as const,
      hasActors: false,
      ageRestriction: '14+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 60,
      description: 'Описание квеста Охотники',
      rules: 'Правила квеста: запрещено использовать физическую силу, нельзя ломать декорации.',
      safety: 'В комнате есть кнопка экстренного выхода. Следуйте инструкциям ведущего.',
      extraServices: 'Фото на память, чай/кофе после квеста',
      extraPlayerPrice: 500,
    },
    // === Kids quests (ageRestriction: "0+", hasActors: false) ===
    {
      id: '00000000-0000-0000-0000-100000000011',
      branchId: branch.id,
      name: 'Лазертаг',
      genre: 'детский',
      difficulty: 'easy' as const,
      hasActors: false,
      ageRestriction: '0+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 4,
      maxPlayers: 12,
      durationMinutes: 30,
      description: 'Описание квеста Лазертаг',
      rules: 'Правила квеста: следуйте инструкциям инструктора.',
      safety: 'Безопасное оборудование, мягкие препятствия. Родители могут наблюдать.',
      extraServices: 'Фото на память, сок/вода после игры',
      extraPlayerPrice: 300,
    },
    {
      id: '00000000-0000-0000-0000-100000000012',
      branchId: branch.id,
      name: 'Ограбление века',
      genre: 'детский',
      difficulty: 'medium' as const,
      hasActors: false,
      ageRestriction: '0+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 4,
      maxPlayers: 8,
      durationMinutes: 60,
      description: 'Описание квеста Ограбление века',
      rules: 'Правила квеста: следуйте инструкциям инструктора.',
      safety: 'Безопасная игровая среда. Родители могут наблюдать.',
      extraServices: 'Фото на память, сок/вода после игры',
      extraPlayerPrice: 300,
    },
    {
      id: '00000000-0000-0000-0000-100000000013',
      branchId: branch.id,
      name: 'Вий',
      genre: 'детский',
      difficulty: 'medium' as const,
      hasActors: false,
      ageRestriction: '0+',
      address: 'ул. Примерная, д. 1',
      minPlayers: 4,
      maxPlayers: 8,
      durationMinutes: 45,
      description: 'Описание квеста Вий',
      rules: 'Правила квеста: следуйте инструкциям инструктора.',
      safety: 'Безопасная игровая среда. Родители могут наблюдать.',
      extraServices: 'Фото на память, сок/вода после игры',
      extraPlayerPrice: 300,
    },
  ];

  for (const q of questData) {
    await prisma.quest.upsert({
      where: { id: q.id },
      update: {
        name: q.name,
        subtitle: q.subtitle,
        genre: q.genre,
        difficulty: q.difficulty,
        hasActors: q.hasActors,
        ageRestriction: q.ageRestriction,
        address: q.address,
        minPlayers: q.minPlayers,
        maxPlayers: q.maxPlayers,
        durationMinutes: q.durationMinutes,
        description: q.description,
        rules: q.rules,
        safety: q.safety,
        extraServices: q.extraServices,
        extraPlayerPrice: q.extraPlayerPrice,
      },
      create: q,
    });
    console.log('✅ Создан/обновлен квест:', q.name);
  }

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

  // 7. Создаем новости (idempotent: upsert preserves imageId)

  const newsData = [
    {
      id: '00000000-0000-0000-0000-200000000001',
      title: 'День рождения в квесте',
      date: new Date('2024-08-25'),
      content: 'Проведите день рождения в наших квестах со скидкой 20%',
      coverTitle: 'ДЕНЬ РОЖДЕНИЯ\nВ КВЕСТЕ',
      cardBg: 'linear-gradient(180deg, #1a2010 0%, #07080a 100%)',
    },
    {
      id: '00000000-0000-0000-0000-200000000002',
      title: 'Новый квест — Мумия',
      date: new Date('2024-11-01'),
      content: 'Скоро открытие нового квеста в египетском стиле',
      coverTitle: 'МУМИЯ',
      coverSub: 'СКОРО ОТКРЫТИЕ',
      cardBg: 'linear-gradient(180deg, #2a1a0a 0%, #0a0807 100%)',
    },
    {
      id: '00000000-0000-0000-0000-200000000003',
      title: 'Скидка 30% на «Тайна Теслы»',
      date: new Date('2024-08-19'),
      content: 'Специальное предложение на популярный квест',
      coverTitle: '30%',
      coverSub: 'на квест «Тайна Теслы»',
      coverVariant: 'discount',
      cardBg: 'linear-gradient(180deg, #0a1a2a 0%, #070a08 100%)',
    },
    {
      id: '00000000-0000-0000-0000-200000000004',
      title: 'Дарим квест весь май',
      date: new Date('2024-05-01'),
      content: 'Каждый день — новая история!',
      coverTitle: 'ДАРИМ\nКВЕСТ',
      coverSub: 'на весь май',
      cardBg: 'linear-gradient(180deg, #1a0a2a 0%, #08070a 100%)',
    },
  ];

  for (const n of newsData) {
    await prisma.news.upsert({
      where: { id: n.id },
      update: {
        title: n.title,
        date: n.date,
        content: n.content,
        coverTitle: n.coverTitle,
        coverSub: n.coverSub,
        coverVariant: n.coverVariant,
        cardBg: n.cardBg,
      },
      create: n,
    });
    console.log('✅ Создана/обновлена новость:', n.title);
  }

  // 8. Создаем PageBlock-и (idempotent: upsert preserves imageId/fileId)

  // HOME page blocks
  const homePageBlocks: {
    id: string;
    pageKey: PageKeyType;
    blockKey: string;
    title?: string;
    text?: string;
    extraJson?: any;
    sortOrder: number;
  }[] = [
    // Hero section
    {
      id: '00000000-0000-0000-0000-300000000001',
      pageKey: 'HOME',
      blockKey: 'hero_title',
      title: 'Самый большой квеструм и площадки для праздников во Владивостоке',
      sortOrder: 0,
    },
    {
      id: '00000000-0000-0000-0000-300000000002',
      pageKey: 'HOME',
      blockKey: 'hero_features',
      extraJson: [
        '16 разнообразных квестов для любой компании',
        'три зала кафе, площадью более 350 м²',
        'ваш праздник «под ключ»',
        'работаем с 2015 года',
      ],
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-300000000003',
      pageKey: 'HOME',
      blockKey: 'hero_cta_text',
      title: 'Забронируйте праздник прямо сейчас',
      sortOrder: 2,
    },
    // Holiday cards
    {
      id: '00000000-0000-0000-0000-300000000004',
      pageKey: 'HOME',
      blockKey: 'holiday_cards',
      extraJson: [
        { kicker: 'праздники', title: 'для малышей', poster: '/images/main/6.png' },
        { kicker: 'праздники для детей', title: '6 — 10 лет', poster: '/images/main/5.png' },
        { kicker: 'праздники для детей', title: '10 — 15 лет', poster: '/images/main/4.png' },
        { kicker: 'организовываем', title: 'Выпускные\nиз детсада', poster: '/images/main/3.png' },
        { kicker: 'отпразднуем', title: 'Поступление\nв школу', poster: '/images/main/2.png' },
        { kicker: 'устроим праздник', title: 'По любому\nповоду! :)', poster: '/images/main/1.png' },
      ],
      sortOrder: 3,
    },
    // Services
    {
      id: '00000000-0000-0000-0000-300000000005',
      pageKey: 'HOME',
      blockKey: 'services',
      extraJson: [
        { icon: '🛋️', title: 'Lounge' },
        { icon: '🎮', title: 'Игровая' },
        { icon: '☕', title: 'Кафе' },
        { icon: '🎭', title: 'Шоу-программы' },
        { icon: '🎲', title: 'Квесты' },
        { icon: '🎂', title: 'Торты' },
        { icon: '🎉', title: 'Праздники' },
      ],
      sortOrder: 4,
    },
  ];

  // Non-HOME page blocks (preserved from original seed)
  const otherPageBlocks: {
    id: string;
    pageKey: PageKeyType;
    blockKey: string;
    title: string;
    text: string;
    sortOrder: number;
  }[] = [
    // PARTY_GUIDE
    { id: '00000000-0000-0000-0000-300000000010', pageKey: 'PARTY_GUIDE', blockKey: 'hero', title: 'Гид по праздникам', text: 'Все, что нужно знать для идеального праздника', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000011', pageKey: 'PARTY_GUIDE', blockKey: 'steps', title: 'Этапы организации', text: 'Планирование, подготовка, проведение, воспоминания', sortOrder: 2 },
    { id: '00000000-0000-0000-0000-300000000012', pageKey: 'PARTY_GUIDE', blockKey: 'tips', title: 'Советы', text: 'Как сделать праздник незабываемым', sortOrder: 3 },
    // PARTY_GUIDE_KIDS
    { id: '00000000-0000-0000-0000-300000000020', pageKey: 'PARTY_GUIDE_KIDS', blockKey: 'hero', title: 'Детский праздник', text: 'Организация праздников для детей любого возраста', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000021', pageKey: 'PARTY_GUIDE_KIDS', blockKey: 'programs', title: 'Программы', text: 'Аниматоры, квесты, мастер-классы', sortOrder: 2 },
    // PARTY_GUIDE_6_10
    { id: '00000000-0000-0000-0000-300000000030', pageKey: 'PARTY_GUIDE_6_10', blockKey: 'hero', title: 'Праздник для 6-10 лет', text: 'Специальные программы для дошкольников и младших школьников', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000031', pageKey: 'PARTY_GUIDE_6_10', blockKey: 'activities', title: 'Развлечения', text: 'Игры, конкурсы, творческие задания', sortOrder: 2 },
    // PARTY_GUIDE_10_15
    { id: '00000000-0000-0000-0000-300000000040', pageKey: 'PARTY_GUIDE_10_15', blockKey: 'hero', title: 'Праздник для 10-15 лет', text: 'Квесты и активности для подростков', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000041', pageKey: 'PARTY_GUIDE_10_15', blockKey: 'quests', title: 'Подростковые квесты', text: 'Захватывающие сценарии для старшеклассников', sortOrder: 2 },
    // CAFE
    { id: '00000000-0000-0000-0000-300000000050', pageKey: 'CAFE', blockKey: 'hero', title: 'Наше кафе', text: 'Вкусная еда и уютная атмосфера', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000051', pageKey: 'CAFE', blockKey: 'menu', title: 'Меню', text: 'Блюда европейской и азиатской кухни', sortOrder: 2 },
    { id: '00000000-0000-0000-0000-300000000052', pageKey: 'CAFE', blockKey: 'booking', title: 'Бронирование', text: 'Забронируйте столик онлайн', sortOrder: 3 },
    // CAFE_KAFE
    { id: '00000000-0000-0000-0000-300000000060', pageKey: 'CAFE_KAFE', blockKey: 'hero', title: 'Кафе-зона', text: 'Основной зал для отдыха и общения', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000061', pageKey: 'CAFE_KAFE', blockKey: 'tables', title: 'Столы', text: 'Выберите подходящий столик', sortOrder: 2 },
    // CAFE_LOUNGE
    { id: '00000000-0000-0000-0000-300000000070', pageKey: 'CAFE_LOUNGE', blockKey: 'hero', title: 'Лаунж-зона', text: 'Уютное пространство для расслабленного отдыха', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000071', pageKey: 'CAFE_LOUNGE', blockKey: 'hookah', title: 'Кальяны', text: 'Большой выбор вкусов', sortOrder: 2 },
    // CAFE_KIDS
    { id: '00000000-0000-0000-0000-300000000080', pageKey: 'CAFE_KIDS', blockKey: 'hero', title: 'Детская зона', text: 'Безопасное пространство для детей', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-300000000081', pageKey: 'CAFE_KIDS', blockKey: 'games', title: 'Игры', text: 'PS4, настольные игры, игровая зона', sortOrder: 2 },
  ];

  const allPageBlocks = [...homePageBlocks, ...otherPageBlocks];
  for (const block of allPageBlocks) {
    await prisma.pageBlock.upsert({
      where: { id: block.id },
      update: {
        pageKey: block.pageKey,
        blockKey: block.blockKey,
        title: block.title,
        text: block.text,
        extraJson: block.extraJson,
        sortOrder: block.sortOrder,
      },
      create: block,
    });
    console.log('✅ Создан/обновлен блок:', block.pageKey, '-', block.blockKey);
  }

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
      key: 'CAFE',
      name: 'Кафе',
      sortOrder: 1,
    },
  });
  console.log('✅ Создана зона:', cafeZone.name);

  const loungeZone = await prisma.tableZone.create({
    data: {
      branchId: branch.id,
      key: 'LOUNGE',
      name: 'Лаунж',
      sortOrder: 2,
    },
  });
  console.log('✅ Создана зона:', loungeZone.name);

  const kidsZone = await prisma.tableZone.create({
    data: {
      branchId: branch.id,
      key: 'KIDS',
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

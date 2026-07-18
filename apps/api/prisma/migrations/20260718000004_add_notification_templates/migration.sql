-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "templateText" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'sms',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

-- CreateIndex
CREATE INDEX "NotificationTemplate_key_idx" ON "NotificationTemplate"("key");

-- SeedData: initial templates
INSERT INTO "NotificationTemplate" (id, key, name, trigger, "templateText", description, channel, "isActive", "updatedAt") VALUES
(gen_random_uuid(), 'BOOKING_CONFIRMED', 'Подтверждение бронирования', 'Создание брони через сайт',
'Здравствуйте, #NAME#!
Ваша заявка на квест #QUEST_NAME# на #DATE# в #TIME# принята. Мы свяжемся с вами для подтверждения. Тел: #BRANCH_PHONE#',
'Отправляется автоматически при создании бронирования через сайт. Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста, #DATE# — дата, #TIME# — время начала, #SUM_RUB# — сумма, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'BOOKING_REMINDER_24H', 'Напоминание за 24 часа', 'Автоматически за день до визита',
'Здравствуйте, #NAME#!
Напоминаем: завтра в #TIME# вас ждёт #QUEST_NAME# в Pandoroom. Адрес: #ADDRESS#. Тел: #BRANCH_PHONE#',
'Отправляется автоматически каждый день в 10:00 для броней на следующий день. Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста, #TIME# — время, #ADDRESS# — адрес филиала, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'BOOKING_CANCELLED', 'Отмена бронирования', 'Отмена квеста из брони',
'Здравствуйте, #NAME#!
Ваше бронирование квеста #QUEST_NAME# на #DATE# в #TIME# отменено. Если у вас есть вопросы, звоните: #BRANCH_PHONE#',
'Отправляется при отмене квеста из бронирования (админом или через расписание). Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста, #DATE# — дата, #TIME# — время, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'BOOKING_RESCHEDULED', 'Перенос бронирования', 'Перенос брони на другую дату/время',
'Здравствуйте, #NAME#!
Ваше бронирование перенесено на #NEW_DATE# в #NEW_TIME#. Квест: #QUEST_NAME#. Тел: #BRANCH_PHONE#',
'Отправляется при переносе бронирования на другую дату или время. Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста, #NEW_DATE# — новая дата, #NEW_TIME# — новое время, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'WAITLIST_JOINED', 'Запись в лист ожидания', 'Запись клиента в waitlist',
'Здравствуйте, #NAME#!
Вы записаны в лист ожидания на #QUEST_NAME#. Мы уведомим вас, когда освободится слот.',
'Отправляется при записи в лист ожидания. Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста',
'sms', true, NOW()),

(gen_random_uuid(), 'WAITLIST_SLOT_FREED', 'Слот освободился', 'Отмена брони → уведомление waitlist',
'Здравствуйте, #NAME#!
Освободился слот на #QUEST_NAME# (#DATE#, #TIME#). Позвоните для брони: #BRANCH_PHONE#',
'Отправляется первому в очереди при отмене бронирования. Переменные: #NAME# — имя клиента, #QUEST_NAME# — название квеста, #DATE# — дата, #TIME# — время, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'MISSED_CALL', 'Пропущенный звонок', 'Вручную администратором',
'Здравствуйте, #NAME#! Мы пытались связаться с вами по поводу бронирования на #DATE#. Пожалуйста, перезвоните нам: #BRANCH_PHONE#',
'Отправляется вручную администратором после пропущенного звонка. Переменные: #NAME# — имя клиента, #DATE# — дата бронирования, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'PREORDER_REMINDER', 'Напоминание о предзаказе', 'Вручную администратором',
'Здравствуйте, #NAME#! Напоминаем о вашем бронировании на #DATE#. Ждём вас в Pandoroom! Подробности: #BRANCH_PHONE#',
'Отправляется вручную администратором как напоминание. Переменные: #NAME# — имя клиента, #DATE# — дата, #BRANCH_PHONE# — телефон филиала',
'sms', true, NOW()),

(gen_random_uuid(), 'ORDER_READY', 'Заказ готов', 'Готовность заказа (еда)',
'Ваш заказ готов! Приятного аппетита в Pandoroom!',
'Статическое уведомление о готовности заказа. Без переменных.',
'sms', true, NOW()),

(gen_random_uuid(), 'ORDER_IN_PROGRESS', 'Заказ принят', 'Заказ в работе (еда)',
'Ваш заказ принят и готовится. Ожидайте ~#ESTIMATED_TIME# мин.',
'Отправляется при принятии заказа в работу. Переменные: #ESTIMATED_TIME# — примерное время готовности в минутах',
'sms', true, NOW());

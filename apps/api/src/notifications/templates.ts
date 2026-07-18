export const NOTIFICATION_TEMPLATES: Record<string, string> = {
  MISSED_CALL: 'Здравствуйте, {clientName}! Мы пытались связаться с вами по поводу бронирования на {eventDate}. Пожалуйста, перезвоните нам: {branchPhone}',
  PREORDER_REMINDER: 'Здравствуйте, {clientName}! Напоминаем о вашем бронировании на {eventDate}. Ждём вас в Pandoroom! Подробности: {branchPhone}',
  ORDER_READY: 'Ваш заказ готов! Приятного аппетита в Pandoroom!',
  ORDER_IN_PROGRESS: 'Ваш заказ принят и готовится. Ожидайте ~{estimatedTime} мин.',

  // Booking lifecycle
  BOOKING_CONFIRMED: 'Здравствуйте, {clientName}! Ваша заявка на «{questName}» ({eventDate}, {time}) принята. Мы свяжемся с вами для подтверждения. Тел: {branchPhone}',
  BOOKING_REMINDER_24H: 'Здравствуйте, {clientName}! Напоминаем: завтра в {time} вас ждёт «{questName}» в Pandoroom. Адрес: {address}. Тел: {branchPhone}',
  BOOKING_CANCELLED: 'Здравствуйте, {clientName}! Ваше бронирование на «{questName}» ({eventDate}, {time}) отменено. Если у вас есть вопросы, звоните: {branchPhone}',
  BOOKING_RESCHEDULED: 'Здравствуйте, {clientName}! Ваше бронирование перенесено на {newDate} в {newTime}. Квест: «{questName}». Тел: {branchPhone}',

  // Waitlist
  WAITLIST_JOINED: 'Здравствуйте, {clientName}! Вы записаны в лист ожидания на «{questName}». Мы уведомим вас, когда освободится слот.',
  WAITLIST_SLOT_FREED: 'Здравствуйте, {clientName}! Освободился слот на «{questName}» ({eventDate}, {time}). Позвоните для брони: {branchPhone}',
};

export type TemplateKey = keyof typeof NOTIFICATION_TEMPLATES;

export function renderTemplate(templateKey: string, variables: Record<string, string>): string {
  let text = NOTIFICATION_TEMPLATES[templateKey] || templateKey;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return text;
}

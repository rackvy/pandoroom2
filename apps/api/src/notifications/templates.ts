export const NOTIFICATION_TEMPLATES: Record<string, string> = {
  MISSED_CALL: 'Здравствуйте, {clientName}! Мы пытались связаться с вами по поводу бронирования на {eventDate}. Пожалуйста, перезвоните нам: {branchPhone}',
  PREORDER_REMINDER: 'Здравствуйте, {clientName}! Напоминаем о вашем бронировании на {eventDate}. Ждём вас в Pandoroom! Подробности: {branchPhone}',
  ORDER_READY: 'Ваш заказ готов! Приятного аппетита в Pandoroom!',
  ORDER_IN_PROGRESS: 'Ваш заказ принят и готовится. Ожидайте ~{estimatedTime} мин.',
};

export type TemplateKey = keyof typeof NOTIFICATION_TEMPLATES;

export function renderTemplate(templateKey: string, variables: Record<string, string>): string {
  let text = NOTIFICATION_TEMPLATES[templateKey] || templateKey;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return text;
}

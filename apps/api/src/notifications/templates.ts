/**
 * Notification templates — default fallback values.
 * Actual templates are loaded from the NotificationTemplate DB table
 * and can be edited by admins through the UI.
 */

export const DEFAULT_TEMPLATES: Record<string, string> = {
  MISSED_CALL:
    'Здравствуйте, #NAME#! Мы пытались связаться с вами по поводу бронирования на #DATE#. Пожалуйста, перезвоните нам: #BRANCH_PHONE#',
  PREORDER_REMINDER:
    'Здравствуйте, #NAME#! Напоминаем о вашем бронировании на #DATE#. Ждём вас в Pandoroom! Подробности: #BRANCH_PHONE#',
  ORDER_READY:
    'Ваш заказ готов! Приятного аппетита в Pandoroom!',
  ORDER_IN_PROGRESS:
    'Ваш заказ принят и готовится. Ожидайте ~#ESTIMATED_TIME# мин.',
  BOOKING_CONFIRMED:
    'Здравствуйте, #NAME#! Ваша заявка на квест #QUEST_NAME# на #DATE# в #TIME# принята. Мы свяжемся с вами для подтверждения. Тел: #BRANCH_PHONE#',
  BOOKING_REMINDER_24H:
    'Здравствуйте, #NAME#! Напоминаем: завтра в #TIME# вас ждёт #QUEST_NAME# в Pandoroom. Адрес: #ADDRESS#. Тел: #BRANCH_PHONE#',
  BOOKING_CANCELLED:
    'Здравствуйте, #NAME#! Ваше бронирование квеста #QUEST_NAME# на #DATE# в #TIME# отменено. Если у вас есть вопросы, звоните: #BRANCH_PHONE#',
  BOOKING_RESCHEDULED:
    'Здравствуйте, #NAME#! Ваше бронирование перенесено на #NEW_DATE# в #NEW_TIME#. Квест: #QUEST_NAME#. Тел: #BRANCH_PHONE#',
  WAITLIST_JOINED:
    'Здравствуйте, #NAME#! Вы записаны в лист ожидания на #QUEST_NAME#. Мы уведомим вас, когда освободится слот.',
  WAITLIST_SLOT_FREED:
    'Здравствуйте, #NAME#! Освободился слот на #QUEST_NAME# (#DATE#, #TIME#). Позвоните для брони: #BRANCH_PHONE#',
};

/**
 * Variable name → human-readable label for the admin UI.
 * Used to show descriptions under each template field.
 */
export const VARIABLE_LABELS: Record<string, string> = {
  '#NAME#': 'Имя клиента',
  '#QUEST_NAME#': 'Название квеста',
  '#DATE#': 'Дата события',
  '#TIME#': 'Время начала',
  '#NEW_DATE#': 'Новая дата (при переносе)',
  '#NEW_TIME#': 'Новое время (при переносе)',
  '#SUM_RUB#': 'Сумма визита (₽)',
  '#BRANCH_PHONE#': 'Телефон филиала',
  '#ADDRESS#': 'Адрес филиала',
  '#ESTIMATED_TIME#': 'Примерное время (мин)',
};

/**
 * Map legacy camelCase variable names (from callers) to #KEY# template tokens.
 * This way callers can keep passing { clientName: 'Иван' } and it'll match #NAME# in templates.
 */
const LEGACY_TO_HASH: Record<string, string> = {
  clientName: '#NAME#',
  questName: '#QUEST_NAME#',
  eventDate: '#DATE#',
  date: '#DATE#',
  time: '#TIME#',
  newDate: '#NEW_DATE#',
  newTime: '#NEW_TIME#',
  sumRub: '#SUM_RUB#',
  branchPhone: '#BRANCH_PHONE#',
  address: '#ADDRESS#',
  estimatedTime: '#ESTIMATED_TIME#',
};

function normalizeVariables(variables: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (LEGACY_TO_HASH[key]) {
      result[LEGACY_TO_HASH[key]] = value;
    } else if (!key.startsWith('#')) {
      result[`#${key.toUpperCase()}#`] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Render a template with variables.
 * Replaces all #KEY# placeholders with the corresponding variable values.
 * Accepts both legacy camelCase keys ({clientName}) and #KEY# style.
 */
export function renderTemplate(templateText: string, variables: Record<string, string>): string {
  const normalized = normalizeVariables(variables);
  let text = templateText;
  for (const [key, value] of Object.entries(normalized)) {
    text = text.replace(new RegExp(escapeRegex(key), 'g'), value);
  }
  // Also replace any leftover {key} patterns for backwards compat
  for (const [key, value] of Object.entries(variables)) {
    if (!key.startsWith('#') && !key.startsWith('{')) {
      text = text.replace(new RegExp(`\\{${escapeRegex(key)}\\}`, 'g'), value);
    }
  }
  return text;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { ChannelKind } from '@prisma/client';

/** Номер в международном виде без разделителей: 79000000001 */
export type DigitsPhone = string;

export interface InboundEvent {
  externalId: string;
  channel: ChannelKind;
  /**
   * Номер отправителя. Пустой — если мессенджер не раскрыл телефон контакта
   * (в Telegram это нормально), тогда привязка идёт по chatId.
   */
  from: string;
  /** Идентификатор собеседника в мессенджере: он же адресат для ответа. */
  chatId?: string;
  contactName?: string;
  text: string;
  at?: Date;
  /**
   * Сообщение отправил сотрудник (эхо провайдера): оно живёт в нашей ленте как
   * исходящее, иначе ответ из виджета Wazzup был бы виден только там.
   */
  fromStaff?: boolean;
  authorName?: string;
}

export interface StatusEvent {
  /** Идентификатор, который драйвер вернул при отправке. */
  externalId: string;
  /**
   * Канал известен не всегда: вебхук статусов приходит без него, и тогда
   * сообщение ищется по одному externalId.
   */
  channel?: ChannelKind;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorText?: string;
}

export interface ProbeResult {
  available: boolean;
  /** Идентификатор получателя у провайдера: номер или chatId. */
  externalId?: string;
  /** Почему нельзя написать — показываем менеджеру как подсказку. */
  reason?: string;
  /**
   * Провайдер про конкретный номер ничего не сказал (такого API у него нет).
   * По такому ответу нельзя понижать канал, подтверждённый входящим сообщением.
   */
  inconclusive?: boolean;
}

export interface WebhookContext {
  body: unknown;
  headers: Record<string, string | undefined>;
  /** Строка запроса вебхука: ключ доступа приезжает именно в ней. */
  query: Record<string, string | undefined>;
}

/** Значения группы `wazzup` из каталога интеграций. */
export interface ChannelConfig {
  apiBaseUrl: string;
  apiKey: string;
  /** Ключ доступа вебхука: подставляется в адрес как ?key= и сверяется с заголовком. */
  webhookSecret: string;
  /** Какое бы ни было «stub», живой ключ игнорируется: нужно же что-то тестировать. */
  driverMode: string;
  /** Какой из трёх мессенджеров какому экземпляру канала соответствует. */
  channelIds: Partial<Record<ChannelKind, string>>;
  stubFailPhone: string;
}

/**
 * Транспорт одного мессенджера. Интерфейс нужен затем, чтобы переписка не
 * знала про конкретного провайдера: боевой драйвер придёт вместе с ключом,
 * а до тех пор работает заглушка, и обе ленты — админская и клиентская —
 * ведут себя одинаково.
 *
 * Методы могут бросить исключение: вызывающий обязан отразить его в статусе
 * сообщения, а не ронять вебхук или отправку молча.
 */
export interface ChannelDriver {
  readonly kind: 'wazzup' | 'stub';

  send(channel: ChannelKind, to: DigitsPhone, text: string): Promise<{ externalId: string }>;

  probe(channel: ChannelKind, phone: DigitsPhone): Promise<ProbeResult>;

  /**
   * Допуск вебхука. Проверяется до разбора: событие от непонятного источника
   * не должно ни создавать клиента, ни писать в ленту.
   */
  verifyWebhookAuth(ctx: WebhookContext): boolean;

  /**
   * Что пришло от провайдера: новое сообщение или изменение статуса
   * отправленного. Событий может быть несколько — один запрос провайдер
   * иногда пачкует. Пустой массив означает «разобрали, но не наше».
   */
  parseWebhook(ctx: WebhookContext): Promise<Array<InboundEvent | StatusEvent>>;
}

export function isInboundEvent(event: InboundEvent | StatusEvent): event is InboundEvent {
  return typeof (event as InboundEvent).from === 'string';
}

/** Каналы, которые умеем носить наружу. INTERNAL — переписка внутри продукта. */
export const EXTERNAL_CHANNELS: ChannelKind[] = [
  ChannelKind.WHATSAPP,
  ChannelKind.TELEGRAM,
  ChannelKind.MAX,
];

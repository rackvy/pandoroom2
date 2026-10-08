import { ChannelKind } from '@prisma/client';

/** Номер в международном виде без разделителей: 79000000001 */
export type DigitsPhone = string;

export interface InboundEvent {
  externalId: string;
  channel: ChannelKind;
  /** Номер отправителя в том виде, как его прислал провайдер. */
  from: string;
  /** Имя контакта из адресной книги провайдера, если оно там есть. */
  contactName?: string;
  text: string;
  at?: Date;
}

export interface StatusEvent {
  /** Идентификатор, который драйвер вернул при отправке. */
  externalId: string;
  channel: ChannelKind;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorText?: string;
}

export interface ProbeResult {
  available: boolean;
  /** Идентификатор получателя у провайдера: номер или chatId. */
  externalId?: string;
  /** Почему нельзя написать — показываем менеджеру как подсказку. */
  reason?: string;
}

export interface WebhookContext {
  rawBody: Buffer;
  body: unknown;
  headers: Record<string, string | undefined>;
}

/** Значения группы `wazzup` из каталога интеграций. */
export interface ChannelConfig {
  apiBaseUrl: string;
  apiKey: string;
  webhookSecret: string;
  /** Какое бы ни было «stub», живой ключ игнорируется: нужно же что-то тестировать. */
  driverMode: string;
  /** Какой из трёх мессенджеров какому экземпляру канала соответствует. */
  channelIds: Partial<Record<ChannelKind, string>>;
  probePath: string;
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
   * Подпись сырого тела. Проверяется до разбора: событие от непонятного
   * источника не должно ни создавать клиента, ни писать в ленту.
   */
  verifyWebhookSignature(ctx: WebhookContext, header: string | undefined): boolean;

  /**
   * Что пришло от провайдера: новое сообщение или изменение статуса
   * отправленного. Событий может быть несколько — один запрос провайдер
   * иногда пачкует. Пустой массив означает «разобрали, но не наше».
   */
  parseWebhook(ctx: WebhookContext): Promise<Array<InboundEvent | StatusEvent>>;
}

export function isInboundEvent(event: InboundEvent | StatusEvent): event is InboundEvent {
  return (event as InboundEvent).from !== undefined;
}

/** Каналы, которые умеем носить наружу. INTERNAL — переписка внутри продукта. */
export const EXTERNAL_CHANNELS: ChannelKind[] = [
  ChannelKind.WHATSAPP,
  ChannelKind.TELEGRAM,
  ChannelKind.MAX,
];

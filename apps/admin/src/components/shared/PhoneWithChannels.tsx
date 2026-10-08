import { useChatOverlay } from '../../contexts/ChatOverlayContext';
import { useClientChannels } from '../../hooks/useBulkChannels';
import { channelHint, channelLabel, compareChannels } from '../../utils/channels';
import { formatPhone } from '../../utils/phone';
import styles from './PhoneWithChannels.module.css';

interface PhoneWithChannelsProps {
  /** Без клиента чипов не бывает: канал привязан к карточке, а не к номеру в поле. */
  clientId?: string | null;
  phone?: string | null;
  /** Чат из карточки брони: оверлей подставит броню тегом к первому сообщению. */
  bookingId?: string | null;
  /** В форме правки номер уже в поле ввода — там нужны только чипы. */
  showPhone?: boolean;
  className?: string;
}

/**
 * Номер клиента и те мессенджеры, где он точно живёт. Клик по чипу поднимает
 * оверлей сразу на этом канале — менеджер не ищет клиента в списке чата.
 *
 * Доступность берётся из кэша пачкой на страницу: проба номера у провайдера
 * платная, и рендер таблицы не имеет права её вызывать.
 */
export default function PhoneWithChannels({
  clientId,
  phone,
  bookingId,
  showPhone = true,
  className,
}: PhoneWithChannelsProps) {
  const { channels } = useClientChannels(clientId);
  const { openChat } = useChatOverlay();
  const ready = channels
    .filter((c) => c.available && c.channel !== 'INTERNAL')
    .sort(compareChannels);

  return (
    <span className={`${styles.wrap}${className ? ` ${className}` : ''}`}>
      {showPhone && <span className={styles.phone}>{formatPhone(phone)}</span>}
      {ready.map((c) => (
        <button
          key={c.channel}
          type="button"
          className={styles.chip}
          title={channelHint(c)}
          aria-label={`Открыть чат с клиентом в ${channelLabel(c.channel)}`}
          onClick={(event) => {
            // Строки таблиц кликабельны сами по себе — переход открывать не нужно.
            event.stopPropagation();
            if (clientId) openChat({ clientId, bookingId: bookingId ?? null, channel: c.channel });
          }}
        >
          {channelLabel(c.channel)}
        </button>
      ))}
    </span>
  );
}

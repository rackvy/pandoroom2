import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { caretAfterNationalDigits, countNationalDigits, formatPhone, formatPhoneDisplay } from '../../utils/phone';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  /** false — не клиентский номер: городской или добавочный печатается как есть, маска только оформляет его на blur. */
  strict?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const DEFAULT_PLACEHOLDER = '+7 (999) 123-45-67';

/** Телефонное поле: в state формы лежит маска, цифры берутся в phoneToDigits перед отправкой. */
export default function PhoneInput({
  value,
  onChange,
  strict = true,
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled,
  onFocus,
  onBlur,
}: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  // Каретку восстанавливаем после того, как форма приняла новое значение.
  const pendingCaret = useRef<{ text: string; digits: number } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    const el = ref.current;
    if (!pending || !el || pending.text !== value) return;
    pendingCaret.current = null;
    const pos = caretAfterNationalDigits(value, pending.digits);
    el.setSelectionRange(pos, pos);
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const typed = el.value;
    if (!strict) {
      onChange(typed);
      return;
    }

    const caret = el.selectionStart ?? typed.length;
    const digitsBeforeCaret = countNationalDigits(typed.slice(0, caret));
    let next = formatPhone(typed);

    if (next === value && caret > 0 && caret < value.length) {
      // Стёр разделитель, а не цифра: убираем цифру левее каретки, иначе поле «не реагирует».
      next = formatPhone(dropDigitBefore(typed, caret));
    }

    el.value = next;
    pendingCaret.current = { text: next, digits: digitsBeforeCaret };
    onChange(next);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (strict) {
      onBlur?.();
      return;
    }
    const formatted = formatPhoneDisplay(event.target.value);
    if (formatted !== event.target.value) onChange(formatted);
    onBlur?.();
  };

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={className}
      value={value}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

/** Индекс цифры прямо перед кареткой — её и убираем при удалении разделителя. */
function dropDigitBefore(value: string, caret: number): string {
  const chars = value.split('');
  for (let i = Math.min(caret, chars.length) - 1; i >= 0; i--) {
    if (chars[i] >= '0' && chars[i] <= '9') {
      chars.splice(i, 1);
      break;
    }
  }
  return chars.join('');
}

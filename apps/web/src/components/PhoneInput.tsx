'use client'

import { useLayoutEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { caretAfterNationalDigits, countNationalDigits, formatPhone } from '@/lib/phone'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
}

const DEFAULT_PLACEHOLDER = '+7 (999) 123-45-67'

/** Телефонное поле: в state формы лежит маска, цифры берутся в phoneToDigits перед отправкой. */
export default function PhoneInput({
  value,
  onChange,
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled,
  required,
  autoFocus,
}: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  // Каретку восстанавливаем после того, как форма приняла новое значение.
  const pendingCaret = useRef<{ text: string; digits: number } | null>(null)

  useLayoutEffect(() => {
    const pending = pendingCaret.current
    const el = ref.current
    if (!pending || !el || pending.text !== value) return
    pendingCaret.current = null
    const pos = caretAfterNationalDigits(value, pending.digits)
    el.setSelectionRange(pos, pos)
  }, [value])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const el = event.target
    const typed = el.value
    const caret = el.selectionStart ?? typed.length
    const digitsBeforeCaret = countNationalDigits(typed.slice(0, caret))
    let next = formatPhone(typed)

    if (next === value && caret > 0 && caret < value.length) {
      // Стёр разделитель, а не цифра: убираем цифру левее каретки, иначе поле «не реагирует».
      next = formatPhone(dropDigitBefore(typed, caret))
    }

    el.value = next
    pendingCaret.current = { text: next, digits: digitsBeforeCaret }
    onChange(next)
  }

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={className}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
    />
  )
}

/** Индекс цифры прямо перед кареткой — её и убираем при удалении разделителя. */
function dropDigitBefore(value: string, caret: number): string {
  const chars = value.split('')
  for (let i = Math.min(caret, chars.length) - 1; i >= 0; i--) {
    if (chars[i] >= '0' && chars[i] <= '9') {
      chars.splice(i, 1)
      break
    }
  }
  return chars.join('')
}

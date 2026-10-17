/**
 * Один телефон на весь сайт: в полях ввода и в показе +7 (999) 123-45-67,
 * на сервер и в базу — только цифры 79991234567.
 */

const NON_DIGITS = /\D/g

/**
 * 0–10 «национальных» цифр. Отформатированное значение содержит код страны,
 * поэтому он сначала приводится к ведущей 7 (8 → 7, отсутствия → подставляем),
 * а национальная часть — всё после него. Так 89991234567 и +7 (999) 123-45-67
 * дают один и тот же клиент.
 */
function nationalDigits(value: string): string {
  let digits = value.replace(NON_DIGITS, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (!digits.startsWith('7')) digits = `7${digits}`
  return digits.slice(1, 11)
}

/** Маска для поля ввода: значение, которое лежит в state формы. */
export function formatPhone(value: string | null | undefined): string {
  const d = nationalDigits(value ?? '')
  if (!d) return ''
  let out = `+7 (${d.slice(0, 3)}${d.length >= 3 ? ')' : ''}`
  // Скобка закрывается на трёх цифрах, дефисы появляются вместе с первой цифрой следующей
  // группы: висячие «) » и «-» ломали backspace — нажатие стирало разделитель, а не цифру.
  if (d.length > 3) out += ` ${d.slice(3, 6)}`
  if (d.length > 6) out += `-${d.slice(6, 8)}`
  if (d.length > 8) out += `-${d.slice(8, 10)}`
  return out
}

/** Ровно перед отправкой: канон базы — 7 и 10 цифр без разделителей. */
export function phoneToDigits(value: string | null | undefined): string {
  const d = nationalDigits(value ?? '')
  return d ? `7${d}` : ''
}

export function isPhoneComplete(value: string | null | undefined): boolean {
  return nationalDigits(value ?? '').length === 10
}

/**
 * Показ номера, который лежит в базе: city/короткий/иностранный печатается как есть,
 * цифры не выдумываем. Отсюда же читаемый номер в SMS.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  const digits = value.replace(NON_DIGITS, '')
  if (!digits || /[^\d\s()+\-.]/.test(value)) return value

  let national: string
  if (digits.length === 11) {
    if (digits[0] !== '7' && digits[0] !== '8') return value
    national = digits.slice(1)
  } else if (digits.length === 10) {
    national = digits
  } else {
    return value
  }

  return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8, 10)}`
}

export function telHref(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  const digits = value.replace(NON_DIGITS, '')
  if (digits.length === 10) return `tel:+7${digits}`
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `tel:+7${digits.slice(1)}`
  return `tel:${value.replace(/[\s()-]/g, '')}`
}

/** Сколько набрано национальных цифр: код страны (7, 8, ведущий +7) не считается. */
export function countNationalDigits(value: string): number {
  return nationalDigits(value).length
}

/** Позиция каретки после n-й национальной цифры — правка в середине не сбрасывает курсор в конец. */
export function caretAfterNationalDigits(value: string, national: number): number {
  if (national <= 0) return 0
  // в маске национальные цифры идут после префикса '+7 ('
  const from = value.startsWith('+7 (') ? 4 : 0
  let seen = 0
  for (let i = from; i < value.length; i++) {
    const char = value[i]
    if (char >= '0' && char <= '9') {
      seen++
      if (seen === national) return i + 1
    }
  }
  return value.length
}

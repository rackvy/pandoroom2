'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch, MessengerChannel, MESSENGER_LABELS } from '@/lib/lk-api'
import { isPhoneComplete, phoneToDigits } from '@/lib/phone'
import PhoneInput from '@/components/PhoneInput'
import styles from './page.module.css'

type LoginStep = 'phone' | 'code'
type EntryChannel = 'call' | 'sms'
type OtpChannel = EntryChannel | MessengerChannel

interface SendCodeResponse {
  expiresInSec?: number
  retryAfterSec?: number
  fallbackAfterSec?: number
  fallbackChannels?: MessengerChannel[]
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  // null — настройки ещё не пришли, поэтому кнопку не прячем
  const [entryChannels, setEntryChannels] = useState<EntryChannel[] | null>(null)
  const [sentChannel, setSentChannel] = useState<OtpChannel>('call')
  const [sendingChannel, setSendingChannel] = useState<OtpChannel | null>(null)
  const [messengers, setMessengers] = useState<MessengerChannel[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [expiresUntil, setExpiresUntil] = useState(0)
  const [fallbackUntil, setFallbackUntil] = useState(0)
  const [fallbackRevealed, setFallbackRevealed] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())
  const { login, client } = useAuth()
  const router = useRouter()
  const codeInputRef = useRef<HTMLInputElement>(null)

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (client) {
      router.push('/lk')
    }
  }, [client, router])

  // Focus code input when it appears
  useEffect(() => {
    if (step === 'code') {
      codeInputRef.current?.focus()
    }
  }, [step])

  // Настроен ли вход по звонку — чтобы не показывать кнопку в пустоту
  useEffect(() => {
    lkFetch<{ channels?: EntryChannel[] }>('/auth/channels')
      .then((data) => setEntryChannels(data?.channels || []))
      .catch(() => {
        // Сервер сам ответит понятной ошибкой при попытке отправки
      })
  }, [])

  // Один тикер на все обратные отсчёты
  useEffect(() => {
    if (!retryUntil && !expiresUntil && !fallbackUntil) return
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [retryUntil, expiresUntil, fallbackUntil])

  // Блок запасных способов показываем один раз и больше не прячем
  useEffect(() => {
    if (fallbackUntil && nowTs >= fallbackUntil) setFallbackRevealed(true)
  }, [fallbackUntil, nowTs])

  const retryIn = Math.max(0, Math.ceil((retryUntil - nowTs) / 1000))
  const expiresIn = Math.max(0, Math.ceil((expiresUntil - nowTs) / 1000))
  const fallbackIn = Math.max(0, Math.ceil((fallbackUntil - nowTs) / 1000))
  const callConfigured = entryChannels === null || entryChannels.includes('call')

  const deliverCode = async (nextChannel: OtpChannel) => {
    setError('')
    setNotice('')
    setSending(true)
    setSendingChannel(nextChannel)
    try {
      const res = await lkFetch<SendCodeResponse>('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ phone: phoneToDigits(phone), channel: nextChannel }),
      })
      const start = Date.now()
      setExpiresUntil(start + (res.expiresInSec || 300) * 1000)
      setRetryUntil(start + (res.retryAfterSec || 60) * 1000)
      setNowTs(start)
      setSentChannel(nextChannel)
      setMessengers(Array.isArray(res.fallbackChannels) ? res.fallbackChannels : [])
      // Таймер «ждём звонок» относится только к звонку и после мессенджера не перезапускается
      if (nextChannel === 'telegram' || nextChannel === 'max') {
        setFallbackUntil(0)
        setNotice(`Отправили новый код в ${MESSENGER_LABELS[nextChannel]}`)
      } else if (nextChannel === 'call') {
        setFallbackUntil(start + (res.fallbackAfterSec || 120) * 1000)
        setFallbackRevealed(false)
      }
      setCode('')
      setStep('code')
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить код')
    } finally {
      setSending(false)
      setSendingChannel(null)
    }
  }

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isPhoneComplete(phone)) {
      setError('Введите полный номер телефона')
      return
    }
    deliverCode('call')
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phoneToDigits(phone), code)
      router.push('/lk')
    } catch (err: any) {
      setError(err.message || 'Неверный код')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setCode('')
    setError('')
    setNotice('')
    setSentChannel('call')
    setFallbackUntil(0)
    setFallbackRevealed(false)
    setMessengers([])
  }

  const sendingText =
    sendingChannel === 'telegram' || sendingChannel === 'max'
      ? `Отправляем код в ${MESSENGER_LABELS[sendingChannel]}…`
      : `Звоним на ${phone}…`

  const sentTitle =
    sentChannel === 'telegram' || sentChannel === 'max'
      ? `Код отправлен в ${MESSENGER_LABELS[sentChannel]}`
      : `Звоним на ${phone} — робот продиктует код`

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>PANDOROOM</div>
        <p className={styles.subtitle}>Вход в личный кабинет</p>

        {error && <div className={styles.error}>{error}</div>}

        {sending && (
          <div className={styles.sendingState}>
            <div className={styles.sendingSpinner} />
            <p className={styles.sendingText}>{sendingText}</p>
          </div>
        )}

        {/* Шаг 1: номер телефона */}
        {!sending && step === 'phone' && (
          <form onSubmit={handleSendCode} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Номер телефона</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                className={styles.input}
                required
                autoFocus
              />
            </div>

            {callConfigured ? (
              <button type="submit" className={styles.button}>
                Получить код
              </button>
            ) : (
              <div className={styles.codeHint}>
                Вход по звонку сейчас недоступен — попробуйте позже.
              </div>
            )}
          </form>
        )}

        {/* Шаг 2: код */}
        {!sending && step === 'code' && (
          <form onSubmit={handleVerifyCode} className={styles.form}>
            <div className={styles.sentInfo}>
              <span className={styles.sentIcon}>✓</span>
              {sentTitle}
            </div>

            {notice && <div className={styles.codeHint}>{notice}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Код подтверждения</label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Введите код"
                className={styles.codeInput}
                required
                autoComplete="one-time-code"
              />
            </div>

            <div className={styles.codeHint}>
              {sentChannel === 'call' && !fallbackRevealed
                ? `Ждём звонок · ${formatSeconds(fallbackIn)}`
                : expiresIn > 0
                  ? `Код действителен ещё ${expiresIn} с`
                  : 'Код истёк — запросите новый'}
            </div>

            <button type="submit" className={styles.button} disabled={loading || code.length < 4}>
              {loading ? 'Проверяем...' : 'Войти'}
            </button>

            {fallbackRevealed && (
              <div className={styles.field}>
                <span className={styles.label}>Не дозвонились?</span>
                <div className={styles.channels}>
                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={() => deliverCode('call')}
                    disabled={retryIn > 0}
                  >
                    {retryIn > 0 ? `Повторить звонок через ${retryIn} с` : 'Повторить звонок'}
                  </button>
                  {messengers.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={styles.resendBtn}
                      onClick={() => deliverCode(item)}
                      disabled={retryIn > 0}
                    >
                      {retryIn > 0
                        ? `Отправить код в ${MESSENGER_LABELS[item]} через ${retryIn} с`
                        : `Отправить код в ${MESSENGER_LABELS[item]}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="button" className={styles.backBtn} onClick={handleBack}>
              ← Изменить номер
            </button>
          </form>
        )}

        <Link href="/" className={styles.backLink}>
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
}

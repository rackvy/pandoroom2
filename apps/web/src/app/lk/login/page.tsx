'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { lkFetch } from '@/lib/lk-api'
import styles from './page.module.css'

type LoginStep = 'phone' | 'code'
type Channel = 'call' | 'sms'

const CHANNEL_LABELS: Record<Channel, string> = {
  call: 'Позвоним и продиктуем',
  sms: 'СМС-сообщение',
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  const [channel, setChannel] = useState<Channel>('call')
  const [channels, setChannels] = useState<Channel[]>(['call'])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [expiresUntil, setExpiresUntil] = useState(0)
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

  // Какие каналы доставки реально настроены на сервере
  useEffect(() => {
    lkFetch('/auth/channels')
      .then((data: { channels?: Channel[] }) => {
        const available = data?.channels || []
        if (!available.length) return
        setChannels(available)
        if (!available.includes(channel)) setChannel(available[0])
      })
      .catch(() => {
        // Сервер сам ответит понятной ошибкой при попытке отправки
      })
  }, [])

  // Один тикер на оба обратных отсчёта
  useEffect(() => {
    if (!retryUntil && !expiresUntil) return
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [retryUntil, expiresUntil])

  const retryIn = Math.max(0, Math.ceil((retryUntil - nowTs) / 1000))
  const expiresIn = Math.max(0, Math.ceil((expiresUntil - nowTs) / 1000))

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 1) return '+7'
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    if (digits.length <= 11) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
  }

  const deliverCode = async () => {
    setError('')
    setSending(true)
    try {
      const res = await lkFetch('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      })
      const start = Date.now()
      setExpiresUntil(start + (res.expiresInSec || 300) * 1000)
      setRetryUntil(start + (res.retryAfterSec || 60) * 1000)
      setNowTs(start)
      setCode('')
      setStep('code')
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить код')
    } finally {
      setSending(false)
    }
  }

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) {
      setError('Введите полный номер телефона')
      return
    }
    deliverCode()
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, code)
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
  }

  const channelTitle =
    channel === 'sms' ? `Код отправлен СМС на ${phone}` : `Звоним на ${phone} — робот продиктует код`

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>PANDOROOM</div>
        <p className={styles.subtitle}>Вход в личный кабинет</p>

        {error && <div className={styles.error}>{error}</div>}

        {sending && (
          <div className={styles.sendingState}>
            <div className={styles.sendingSpinner} />
            <p className={styles.sendingText}>Отправляем код на {phone}</p>
          </div>
        )}

        {/* Шаг 1: номер телефона */}
        {!sending && step === 'phone' && (
          <form onSubmit={handleSendCode} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+7 (999) 123-45-67"
                className={styles.input}
                required
                autoFocus
              />
            </div>

            {channels.length > 1 && (
              <div className={styles.field}>
                <span className={styles.label}>Как получить код</span>
                <div className={styles.channels}>
                  {channels.map((item) => (
                    <label
                      key={item}
                      className={channel === item ? styles.channelActive : styles.channel}
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={item}
                        checked={channel === item}
                        onChange={() => setChannel(item)}
                      />
                      {CHANNEL_LABELS[item]}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className={styles.button}>
              Получить код
            </button>
          </form>
        )}

        {/* Шаг 2: код */}
        {!sending && step === 'code' && (
          <form onSubmit={handleVerifyCode} className={styles.form}>
            <div className={styles.sentInfo}>
              <span className={styles.sentIcon}>✓</span>
              {channelTitle}
            </div>

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
              {expiresIn > 0
                ? `Код действителен ещё ${expiresIn} с`
                : 'Код истёк — запросите новый'}
            </div>

            <button type="submit" className={styles.button} disabled={loading || code.length < 4}>
              {loading ? 'Проверяем...' : 'Войти'}
            </button>

            <button
              type="button"
              className={styles.resendBtn}
              onClick={deliverCode}
              disabled={retryIn > 0}
            >
              {retryIn > 0 ? `Отправить ещё раз через ${retryIn} с` : 'Отправить код ещё раз'}
            </button>

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

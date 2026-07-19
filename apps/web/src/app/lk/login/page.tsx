'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import styles from './page.module.css'

type LoginStep = 'phone' | 'sending' | 'code'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<LoginStep>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) {
      setError('Введите полный номер телефона')
      return
    }
    // Simulate sending SMS
    setStep('sending')
    setTimeout(() => {
      setStep('code')
    }, 1500)
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

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>PANDOROOM</div>
        <p className={styles.subtitle}>Вход в личный кабинет</p>

        {error && <div className={styles.error}>{error}</div>}

        {/* Step 1: Phone number */}
        {step === 'phone' && (
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
            <button type="submit" className={styles.button}>
              Получить код
            </button>
          </form>
        )}

        {/* Step 2: Sending animation */}
        {step === 'sending' && (
          <div className={styles.sendingState}>
            <div className={styles.sendingSpinner} />
            <p className={styles.sendingText}>Отправляем код на {phone}</p>
          </div>
        )}

        {/* Step 3: Code input */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className={styles.form}>
            <div className={styles.sentInfo}>
              <span className={styles.sentIcon}>✓</span>
              Код отправлен на <strong>{phone}</strong>
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
              Ваш код: <strong>2424</strong>
            </div>

            <button type="submit" className={styles.button} disabled={loading || code.length < 4}>
              {loading ? 'Проверяем...' : 'Войти'}
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

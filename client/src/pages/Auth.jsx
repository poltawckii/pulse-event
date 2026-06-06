import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './Auth.module.css'

function Auth() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    socialGroupId: '',
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const nextMode = searchParams.get('mode')
    if (nextMode === 'login' || nextMode === 'register') {
      setMode(nextMode)
      setStatus('idle')
      setMessage('')
    }
  }, [searchParams])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const payload = {
      email: form.email.trim(),
      password: form.password,
    }

    if (mode === 'register') {
      payload.fullName = form.fullName.trim() || undefined
      payload.socialGroupId = form.socialGroupId || undefined
    }

    try {
      const response = await fetch(
        `/api/auth/${mode === 'login' ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const rawText = await response.text()
      const data = rawText ? JSON.parse(rawText) : null

      if (!response.ok) {
        const serverMessage = data?.details || data?.error || rawText
        throw new Error(serverMessage || 'Ошибка авторизации')
      }

      if (mode === 'login') {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        window.dispatchEvent(new Event('auth-changed'))
        setStatus('success')
        setMessage('Вход выполнен.')
        navigate('/')
      } else {
        setStatus('registered')
        setMessage('Аккаунт создан — теперь войдите в систему.')
        setMode('login')
        setSearchParams({ mode: 'login' }, { replace: true })
        setForm((prev) => ({ ...prev, password: '', fullName: '', socialGroupId: '' }))
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const switchTo = (next) => {
    if (next === mode) return
    setMode(next)
    setSearchParams({ mode: next })
    setMessage('')
    setStatus('idle')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Gradient header */}
        <div className={styles.cardTop}>
          <div className={styles.cardTopDeco} />
          <Link to="/" className={styles.brand}>
            <span className={styles.brandName}>
              Pulse<span className={styles.brandAccent}>Event</span>
            </span>
          </Link>
          <h1 className={styles.title}>
            {mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'login'
              ? 'Войдите, чтобы получать персональные рекомендации событий'
              : 'Присоединяйтесь и откройте мир городских событий'}
          </p>
        </div>

        {/* Form body */}
        <div className={styles.cardBody}>

          {/* Tab switcher */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              type="button"
              onClick={() => switchTo('login')}
            >
              Войти
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              type="button"
              onClick={() => switchTo('register')}
            >
              Регистрация
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fullName">ФИО</label>
                <input
                  className={styles.input}
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Иван Иванов"
                  autoComplete="name"
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                className={styles.input}
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Пароль</label>
              <input
                className={styles.input}
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'register' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="socialGroupId">
                  Социальная группа
                  <span className={styles.labelOptional}> — необязательно</span>
                </label>
                <select
                  className={styles.select}
                  id="socialGroupId"
                  name="socialGroupId"
                  value={form.socialGroupId}
                  onChange={handleChange}
                >
                  <option value="">Не указано</option>
                  <option value="1">Молодежь</option>
                  <option value="2">Пенсионеры</option>
                  <option value="3">Семьи</option>
                  <option value="4">Люди с ОВЗ</option>
                </select>
              </div>
            )}

            {message && (
              <div className={`${styles.message} ${status === 'error' ? styles.messageError : styles.messageOk}`}>
                {status === 'error' ? '⚠ ' : '✓ '}{message}
              </div>
            )}

            <button
              className={styles.submitBtn}
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? 'Подождите...'
                : mode === 'login'
                ? 'Войти в аккаунт'
                : 'Создать аккаунт'}
            </button>

            {status === 'success' && (
              <Link className={styles.profileLink} to="/profile">
                Перейти в профиль →
              </Link>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default Auth

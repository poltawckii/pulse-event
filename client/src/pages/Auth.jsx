import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
      } else {
        setStatus('registered')
        setMessage('Аккаунт создан. Теперь войдите в систему.')
        setMode('login')
        setSearchParams({ mode: 'login' }, { replace: true })
        setForm((prev) => ({
          ...prev,
          password: '',
          fullName: '',
          socialGroupId: '',
        }))
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const toggleMode = () => {
    const nextMode = mode === 'login' ? 'register' : 'login'
    setMode(nextMode)
    setSearchParams({ mode: nextMode })
    setMessage('')
  }

  return (
    <div className="page">
      <section className={`section ${styles.wrapper}`}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className="badge">PulseEvent</span>
            <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
            <p className="muted">
              {mode === 'login'
                ? 'Продолжайте планировать культурные выходные.'
                : 'Создайте аккаунт и получите персональные рекомендации.'}
            </p>
          </div>
          <div className={styles.panelMeta}>
            <div>
              <span className="muted">Статус</span>
              <strong>{status === 'success' ? 'Вход выполнен' : 'Активен'}</strong>
            </div>
            <div>
              <span className="muted">Доступ</span>
              <strong>JWT</strong>
            </div>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div>
              <label className="muted" htmlFor="fullName">
                ФИО
              </label>
              <input
                className="input"
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Иван Иванов"
              />
            </div>
          )}
          <div>
            <label className="muted" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="muted" htmlFor="password">
              Пароль
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="muted" htmlFor="socialGroupId">
                Социальная группа
              </label>
              <select
                className="select"
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
          <div className={styles.actions}>
            <button className="button" type="submit" disabled={status === 'loading'}>
              {status === 'loading'
                ? 'Подождите...'
                : mode === 'login'
                ? 'Войти'
                : 'Зарегистрироваться'}
            </button>
            {status !== 'success' && (
              <button className="button secondary" type="button" onClick={toggleMode}>
                {mode === 'login' ? 'Регистрация' : 'Назад ко входу'}
              </button>
            )}
            {status === 'success' && (
              <Link className="button secondary" to="/profile">
                Перейти в профиль
              </Link>
            )}
          </div>
        </form>
        {message && <p className={styles.message}>{message}</p>}
      </section>
    </div>
  )
}

export default Auth

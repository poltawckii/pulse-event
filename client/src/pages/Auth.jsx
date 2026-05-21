import { useState } from 'react'

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

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      window.dispatchEvent(new Event('auth-changed'))
      setStatus('success')
      setMessage(mode === 'login' ? 'Signed in successfully.' : 'Account created.')
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setMessage('')
  }

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
          <span className="badge">Доступ по JWT</span>
        </div>
        <form className="grid two" onSubmit={handleSubmit}>
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
                placeholder="Poltavskiy V.I."
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
          <div className="sectionHeader">
            <button className="button" type="submit" disabled={status === 'loading'}>
              {status === 'loading'
                ? 'Подождите...'
                : mode === 'login'
                ? 'Войти'
                : 'Зарегистрироваться'}
            </button>
            <button className="button secondary" type="button" onClick={toggleMode}>
              {mode === 'login' ? 'Регистрация' : 'Назад ко входу'}
            </button>
          </div>
        </form>
        {message && <p className="muted">{message}</p>}
      </section>
    </div>
  )
}

export default Auth

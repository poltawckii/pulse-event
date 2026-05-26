import { useEffect, useState } from 'react'
import styles from './Profile.module.css'

function Profile() {
  const [profileUser, setProfileUser] = useState(() => {
    const stored = localStorage.getItem('auth_user')
    return stored ? JSON.parse(stored) : null
  })
  const displayName = profileUser?.fullName || profileUser?.email || 'Гость'
  const initial = displayName.trim().slice(0, 1).toUpperCase()
  const [form, setForm] = useState(() => ({
    fullName: profileUser?.fullName || '',
    city: profileUser?.city || '',
    socialGroupId: profileUser?.socialGroupId ? String(profileUser.socialGroupId) : '',
  }))
  const [favoritesCount, setFavoritesCount] = useState(null)
  const [ratingsCount, setRatingsCount] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('profile_avatar') || '')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const payload = await response.json()
        if (payload?.user) {
          setProfileUser(payload.user)
          setForm({
            fullName: payload.user.fullName || '',
            city: payload.user.city || '',
            socialGroupId: payload.user.socialGroupId
              ? String(payload.user.socialGroupId)
              : '',
          })
          localStorage.setItem('auth_user', JSON.stringify(payload.user))
        }
      } catch (error) {
        setMessage('')
      }
    }

    const loadCounts = async () => {
      try {
        const [favoritesResponse, ratingsResponse] = await Promise.all([
          fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/ratings', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (favoritesResponse.ok) {
          const payload = await favoritesResponse.json()
          setFavoritesCount(Array.isArray(payload.data) ? payload.data.length : 0)
        }

        if (ratingsResponse.ok) {
          const payload = await ratingsResponse.json()
          setRatingsCount(Array.isArray(payload.data) ? payload.data.length : 0)
        }
      } catch (error) {
        setFavoritesCount(null)
        setRatingsCount(null)
      }
    }

    loadProfile()
    loadCounts()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('error')
      setMessage('Войдите, чтобы сохранить профиль.')
      return
    }

    setStatus('loading')
    setMessage('')

    const payload = {
      fullName: form.fullName.trim() || null,
      city: form.city.trim() || null,
      socialGroupId: form.socialGroupId ? Number(form.socialGroupId) : null,
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Не удалось сохранить профиль')
      }

      setProfileUser(data.user)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      setStatus('success')
      setMessage('Профиль обновлен.')
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) {
        localStorage.setItem('profile_avatar', result)
        setAvatarUrl(result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={`page ${styles.page}`}>
      <section className={`section ${styles.hero}`}>
        <div className={styles.avatar}>
          {avatarUrl ? <img src={avatarUrl} alt="Аватар" /> : <span>{initial || 'P'}</span>}
          <label className={styles.avatarUpload}>
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
            Загрузить
          </label>
        </div>
        <div className={styles.heroContent}>
          <div>
            <h1 className={styles.title}>Профиль</h1>
            <p className="muted">{displayName}</p>
          </div>
          <div className={styles.badges}>
            <span className="badge">Управление профилем</span>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className="muted">Избранное</span>
            <strong>{favoritesCount ?? '—'}</strong>
          </div>
          <div className={styles.statCard}>
            <span className="muted">Оценки</span>
            <strong>{ratingsCount ?? '—'}</strong>
          </div>
        </div>
      </section>

      <section className={`section ${styles.formSection}`}>
        <div className="sectionHeader">
          <h2>Параметры профиля</h2>
          <span className="badge">Персональные настройки</span>
        </div>
        <div className={styles.formGrid}>
          <div>
            <label className="muted" htmlFor="name">
              ФИО
            </label>
            <input
              className="input"
              id="name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Иван Иванов"
            />
          </div>
          <div>
            <label className="muted" htmlFor="group">
              Социальная группа
            </label>
            <select
              className="select"
              id="group"
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
          <div>
            <label className="muted" htmlFor="city">
              Город
            </label>
            <input
              className="input"
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Москва"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button className="button" type="button" onClick={handleSave}>
            Сохранить профиль
          </button>
        </div>
        {message && (
          <p className={status === 'error' ? styles.error : styles.notice}>{message}</p>
        )}
      </section>
    </div>
  )
}

export default Profile

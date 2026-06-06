import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { showToast } from '../utils/toast.js'
import styles from './Profile.module.css'

const GROUP_LABELS = {
  1: 'Молодежь',
  2: 'Пенсионеры',
  3: 'Семьи',
  4: 'Люди с ОВЗ',
}

function formatMemberSince(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}

function Avatar({ url, initial, onUpload }) {
  const inputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Выберите файл изображения (JPG, PNG, WebP)', 'error')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Файл слишком большой — максимум 5 МБ', 'error')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result) {
        localStorage.setItem('profile_avatar', reader.result)
        window.dispatchEvent(new Event('avatar-changed'))
        onUpload(reader.result)
        showToast('Аватар обновлён', 'success')
      } else {
        showToast('Не удалось прочитать файл', 'error')
      }
    }
    reader.onerror = () => showToast('Ошибка при загрузке файла', 'error')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className={styles.avatar} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      {url
        ? <img src={url} alt="Аватар" />
        : <span className={styles.avatarInitial}>{initial || '?'}</span>
      }
      <div className={styles.avatarOverlay}>
        <span className={styles.avatarOverlayIcon}>📷</span>
        <span className={styles.avatarOverlayText}>Изменить</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.avatarInput}
        onChange={handleFileChange}
      />
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCardAccent : ''}`}>
      <strong className={styles.statValue}>{value ?? '—'}</strong>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function Profile() {
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState(() => {
    const stored = localStorage.getItem('auth_user')
    return stored ? JSON.parse(stored) : null
  })
  const [form, setForm] = useState({
    fullName: '',
    city: '',
    bio: '',
    socialGroupId: '',
  })
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('profile_avatar') || '')
  const [favoritesCount, setFavoritesCount] = useState(null)
  const [ratingsCount, setRatingsCount] = useState(null)
  const [avgScore, setAvgScore] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')

  const displayName = profileUser?.fullName || profileUser?.email?.split('@')[0] || 'Гость'
  const initial = displayName.trim().slice(0, 1).toUpperCase()
  const memberSince = formatMemberSince(profileUser?.createdAt)
  const groupLabel = GROUP_LABELS[profileUser?.socialGroupId] || null

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/auth?mode=login', { replace: true })
      return
    }

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const payload = await res.json()
        if (payload?.user) {
          setProfileUser(payload.user)
          setForm({
            fullName: payload.user.fullName || '',
            city: payload.user.city || '',
            bio: payload.user.bio || '',
            socialGroupId: payload.user.socialGroupId ? String(payload.user.socialGroupId) : '',
          })
          localStorage.setItem('auth_user', JSON.stringify(payload.user))
        }
      } catch {}
    }

    const loadCounts = async () => {
      try {
        const [favRes, ratRes] = await Promise.all([
          fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/ratings', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (favRes.ok) {
          const p = await favRes.json()
          setFavoritesCount(Array.isArray(p.data) ? p.data.length : 0)
        }

        if (ratRes.ok) {
          const p = await ratRes.json()
          const list = Array.isArray(p.data) ? p.data : []
          setRatingsCount(list.length)
          if (list.length > 0) {
            const scores = list.map((r) => r.score).filter(Boolean)
            if (scores.length > 0) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length
              setAvgScore(avg.toFixed(1))
            }
          }
        }
      } catch {}
    }

    loadProfile()
    loadCounts()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      showToast('Войдите, чтобы сохранить профиль', 'error')
      return
    }

    setSaveStatus('loading')

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim() || null,
          city: form.city.trim() || null,
          bio: form.bio.trim() || null,
          socialGroupId: form.socialGroupId ? Number(form.socialGroupId) : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить')

      setProfileUser(data.user)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      setSaveStatus('idle')
      showToast('Профиль обновлён', 'success')
    } catch (err) {
      setSaveStatus('idle')
      showToast(err.message, 'error')
    }
  }

  return (
    <div className={`page ${styles.page}`}>

      {/* ── Шапка профиля ── */}
      <section className={`section ${styles.hero}`}>
        <Avatar url={avatarUrl} initial={initial} onUpload={setAvatarUrl} />

        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{displayName}</h1>
          {profileUser?.email && (
            <p className={`muted ${styles.heroEmail}`}>{profileUser.email}</p>
          )}
          <div className={styles.heroBadges}>
            {groupLabel && <span className="badge">{groupLabel}</span>}
            {profileUser?.city && <span className="badge">📍 {profileUser.city}</span>}
            {memberSince && <span className="badge">С {memberSince}</span>}
          </div>
          {profileUser?.bio && (
            <p className={styles.heroBio}>{profileUser.bio}</p>
          )}
        </div>
      </section>

      {/* ── Статистика ── */}
      <section className={`section ${styles.statsSection}`}>
        <StatCard label="В избранном" value={favoritesCount} />
        <StatCard label="Оценено событий" value={ratingsCount} />
        <StatCard label="Средняя оценка" value={avgScore} accent />
      </section>

      {/* ── Форма редактирования ── */}
      <section className={`section ${styles.formSection}`}>
        <div className="sectionHeader">
          <h2>Редактировать профиль</h2>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className="muted" htmlFor="fullName">ФИО</label>
            <input
              className="input"
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Иван Иванов"
            />
          </div>

          <div className={styles.field}>
            <label className="muted" htmlFor="city">Город</label>
            <input
              className="input"
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Москва"
            />
          </div>

          <div className={styles.field}>
            <label className="muted" htmlFor="socialGroupId">Социальная группа</label>
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

          <div className={styles.field}>
            <label className="muted" htmlFor="email">Email</label>
            <input
              className="input"
              id="email"
              value={profileUser?.email || ''}
              readOnly
              disabled
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className="muted" htmlFor="bio">О себе</label>
            <textarea
              className={`input ${styles.bio}`}
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Расскажите немного о себе, интересах и предпочтениях..."
              rows={3}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            className="button"
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'loading'}
          >
            {saveStatus === 'loading' ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default Profile

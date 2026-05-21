import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import styles from './TopNav.module.css'

const navLinks = [
  { to: '/', label: 'Главная' },
  { to: '/map', label: 'Карта' },
  { to: '/events', label: 'События' },
  { to: '/favorites', label: 'Избранное', authOnly: true },
  { to: '/recommendations', label: 'Рекомендации', authOnly: true },
  { to: '/ratings', label: 'Оценки', authOnly: true },
  { to: '/profile', label: 'Профиль', authOnly: true },
]

function TopNav() {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    let isMounted = true

    const syncAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        if (isMounted) setIsAuthed(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Unauthorized')
        }

        if (isMounted) setIsAuthed(true)
      } catch (error) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        if (isMounted) setIsAuthed(false)
      }
    }

    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('focus', syncAuth)
    window.addEventListener('auth-changed', syncAuth)
    return () => {
      isMounted = false
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('focus', syncAuth)
      window.removeEventListener('auth-changed', syncAuth)
    }
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setIsAuthed(false)
    window.dispatchEvent(new Event('auth-changed'))
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Pulse</span>
          <span className={styles.brandSub}>Навигатор городских событий</span>
        </div>
        <nav className={styles.nav}>
          {navLinks
            .filter((link) => !link.authOnly || isAuthed)
            .map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.ctaGroup}>
          {isAuthed ? (
            <button className={styles.authLink} type="button" onClick={handleSignOut}>
              Выйти
            </button>
          ) : (
            <NavLink to="/auth" className={styles.authLink}>
              Войти
            </NavLink>
          )}
          <button className="button" type="button">
            Создать событие
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopNav

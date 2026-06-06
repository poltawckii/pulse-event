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
]

function readUserInitial() {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
    const name = user.fullName || user.full_name || user.email || ''
    return name.charAt(0).toUpperCase() || '?'
  } catch {
    return '?'
  }
}

function TopNav() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [avatar, setAvatar] = useState(() => localStorage.getItem('profile_avatar') || null)
  const [userInitial, setUserInitial] = useState(() => readUserInitial())

  useEffect(() => {
    let isMounted = true

    const syncAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        if (isMounted) { setIsAuthed(false); setAvatar(null) }
        return
      }
      try {
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Unauthorized')
        if (isMounted) {
          setIsAuthed(true)
          setAvatar(localStorage.getItem('profile_avatar') || null)
          setUserInitial(readUserInitial())
        }
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        if (isMounted) { setIsAuthed(false); setAvatar(null) }
      }
    }

    const syncAvatar = () => {
      setAvatar(localStorage.getItem('profile_avatar') || null)
      setUserInitial(readUserInitial())
    }

    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('focus', syncAuth)
    window.addEventListener('auth-changed', syncAuth)
    window.addEventListener('avatar-changed', syncAvatar)
    return () => {
      isMounted = false
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('focus', syncAuth)
      window.removeEventListener('auth-changed', syncAuth)
      window.removeEventListener('avatar-changed', syncAvatar)
    }
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setIsAuthed(false)
    setAvatar(null)
    window.dispatchEvent(new Event('auth-changed'))
    setIsMenuOpen(false)
  }

  const handleMenuClose = () => setIsMenuOpen(false)

  return (
    <>
      {isMenuOpen && (
        <button className={styles.backdrop} type="button" onClick={handleMenuClose} />
      )}
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/" className={styles.brandLink} onClick={handleMenuClose}>
            <img src="/pulseevent_icon.svg" alt="" className={styles.logoIcon} />
            <span className={styles.brandName}>
              Pulse<span className={styles.brandAccent}>Event</span>
            </span>
          </NavLink>

          <button
            className={`${styles.burger} ${isMenuOpen ? styles.burgerOpen : ''}`}
            type="button"
            onClick={() => setIsMenuOpen((p) => !p)}
            aria-label="Открыть меню"
            aria-expanded={isMenuOpen}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>

          <div className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
            <nav className={styles.nav}>
              {navLinks
                .filter((link) => !link.authOnly || isAuthed)
                .map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={handleMenuClose}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.active : ''}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
            </nav>

            <div className={styles.authArea}>
              {isAuthed ? (
                <>
                  <NavLink
                    to="/profile"
                    className={styles.navAvatar}
                    onClick={handleMenuClose}
                    title="Мой профиль"
                  >
                    {avatar
                      ? <img src={avatar} alt="Аватар" className={styles.navAvatarImg} />
                      : <span className={styles.navAvatarInitial}>{userInitial}</span>
                    }
                  </NavLink>
                  <button className={styles.signOutBtn} type="button" onClick={handleSignOut}>
                    Выйти
                  </button>
                </>
              ) : (
                <NavLink
                  to="/auth?mode=login"
                  className={styles.loginBtn}
                  onClick={handleMenuClose}
                >
                  Войти
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default TopNav

import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

const year = new Date().getFullYear()

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        <div className={styles.brand}>
          <Link to="/" className={styles.brandLink}>
            <img src="/pulseevent_logo_v12.svg" alt="Pulse Event" className={styles.logo} />
          </Link>
          <p className={styles.tagline}>
            Городской гид по событиям — находите то, что вам близко.
          </p>
        </div>

        <nav className={styles.col}>
          <p className={styles.colTitle}>Навигация</p>
          <Link to="/">Главная</Link>
          <Link to="/events">Каталог событий</Link>
          <Link to="/map">Карта</Link>
        </nav>

        <nav className={styles.col}>
          <p className={styles.colTitle}>Личный кабинет</p>
          <Link to="/profile">Профиль</Link>
          <Link to="/favorites">Избранное</Link>
          <Link to="/recommendations">Рекомендации</Link>
          <Link to="/ratings">Мои оценки</Link>
        </nav>

      </div>

      <div className={styles.bottom}>
        <span>© {year} Pulse Event. Все права защищены.</span>
        <span className={styles.bottomMuted}>Дипломная работа</span>
      </div>
    </footer>
  )
}

export default Footer

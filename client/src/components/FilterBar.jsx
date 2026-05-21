import styles from './FilterBar.module.css'

function FilterBar({ radiusKm = 5, onRadiusChange = () => {} }) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="search">
          Поиск
        </label>
        <input className="input" id="search" placeholder="Поиск событий" />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="category">
          Категория
        </label>
        <select className="select" id="category">
          <option value="all">Все</option>
          <option value="sport">Спорт</option>
          <option value="culture">Культура</option>
          <option value="education">Образование</option>
          <option value="leisure">Досуг</option>
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="group">
          Социальная группа
        </label>
        <select className="select" id="group">
          <option value="all">Все</option>
          <option value="youth">Молодежь</option>
          <option value="seniors">Пенсионеры</option>
          <option value="families">Семьи</option>
          <option value="disabled">Люди с ОВЗ</option>
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="radius">
          Радиус
        </label>
        <select
          className="select"
          id="radius"
          value={radiusKm}
          onChange={(event) => onRadiusChange(Number(event.target.value))}
        >
          <option value="2">2 км</option>
          <option value="5">5 км</option>
          <option value="10">10 км</option>
        </select>
      </div>
    </div>
  )
}

export default FilterBar

import styles from './FilterBar.module.css'

const CATEGORIES = [
  { value: 'all',             label: 'Все категории' },
  { value: 'concert',         label: 'Концерты' },
  { value: 'theater',         label: 'Театр' },
  { value: 'exhibition',      label: 'Выставки' },
  { value: 'cinema',          label: 'Кино' },
  { value: 'festival',        label: 'Фестивали' },
  { value: 'sport',           label: 'Спорт' },
  { value: 'education',       label: 'Образование' },
  { value: 'tour',            label: 'Экскурсии' },
  { value: 'party',           label: 'Вечеринки' },
  { value: 'kids',            label: 'Для детей' },
  { value: 'quest',           label: 'Квесты' },
  { value: 'entertainment',   label: 'Развлечения' },
  { value: 'recreation',      label: 'Активный отдых' },
  { value: 'standup',         label: 'Стендап' },
  { value: 'art',             label: 'Искусство' },
  { value: 'music',           label: 'Музыка' },
]

const GROUPS = [
  { value: 'all',      label: 'Все группы' },
  { value: 'youth',    label: 'Молодёжь' },
  { value: 'seniors',  label: 'Пенсионеры' },
  { value: 'families', label: 'Семьи с детьми' },
  { value: 'disabled', label: 'Люди с ОВЗ' },
]

function FilterBar({ search, onSearch, category, onCategory, group, onGroup }) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="search">Поиск</label>
        <input
          className="input"
          id="search"
          placeholder="Название или место..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="category">Категория</label>
        <select
          className="select"
          id="category"
          value={category}
          onChange={(e) => onCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="group">Социальная группа</label>
        <select
          className="select"
          id="group"
          value={group}
          onChange={(e) => onGroup(e.target.value)}
        >
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default FilterBar

const categoryLabels = {
  concert: 'Концерты',
  theater: 'Театр',
  exhibition: 'Выставки',
  cinema: 'Кино',
  festival: 'Фестивали',
  education: 'Образование',
  tour: 'Экскурсии',
  party: 'Вечеринки',
  kids: 'Детям',
  quest: 'Квесты',
  holiday: 'Праздники',
  shopping: 'Шопинг',
  entertainment: 'Развлечения',
  recreation: 'Активный отдых',
  photo: 'Фотография',
  fashion: 'Мода и стиль',
  stock: 'Акции и скидки',
  'social-activity': 'Благотворительность',
  sport: 'Спорт',
  culture: 'Культура',
  leisure: 'Досуг',
  standup: 'Стендап',
  business: 'Бизнес',
  art: 'Искусство',
  music: 'Музыка',
  food: 'Еда и напитки',
  health: 'Здоровье',
  yoga: 'Йога',
  dance: 'Танцы',
  comedy: 'Комедия',
  charity: 'Благотворительность',
  online: 'Онлайн',
  other: 'Другое',
}

export function formatEventCategory(category) {
  if (!category || typeof category !== 'string') return 'Событие'
  const key = category.trim().toLowerCase()
  return categoryLabels[key] || category
}

export default formatEventCategory

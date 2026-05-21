function Profile() {
  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h1>Профиль пользователя</h1>
          <span className="badge">Настройки социальной группы</span>
        </div>
        <div className="grid two">
          <div>
            <label className="muted" htmlFor="name">
              ФИО
            </label>
            <input className="input" id="name" placeholder="Poltavskiy V.I." />
          </div>
          <div>
            <label className="muted" htmlFor="group">
              Социальная группа
            </label>
            <select className="select" id="group">
              <option value="youth">Молодежь</option>
              <option value="seniors">Пенсионеры</option>
              <option value="families">Семьи</option>
              <option value="disabled">Люди с ОВЗ</option>
            </select>
          </div>
          <div>
            <label className="muted" htmlFor="city">
              Город
            </label>
            <input className="input" id="city" placeholder="Москва" />
          </div>
          <div>
            <label className="muted" htmlFor="radius">
              Радиус по умолчанию
            </label>
            <select className="select" id="radius" defaultValue="5">
              <option value="2">2 км</option>
              <option value="5">5 км</option>
              <option value="10">10 км</option>
            </select>
          </div>
        </div>
        <div className="sectionHeader">
          <button className="button" type="button">
            Сохранить профиль
          </button>
        </div>
      </section>
    </div>
  )
}

export default Profile

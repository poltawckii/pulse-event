import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TopNav from './components/TopNav.jsx'
import Home from './pages/Home.jsx'
import MapPage from './pages/Map.jsx'
import Events from './pages/Events.jsx'
import EventDetails from './pages/EventDetails.jsx'
import Favorites from './pages/Favorites.jsx'
import Recommendations from './pages/Recommendations.jsx'
import Ratings from './pages/Ratings.jsx'
import Profile from './pages/Profile.jsx'
import Auth from './pages/Auth.jsx'
import ToastHost from './components/ToastHost.jsx'
import styles from './App.module.css'

function App() {
  return (
    <BrowserRouter>
      <div className={styles.appShell}>
        <TopNav />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
        <ToastHost />
      </div>
    </BrowserRouter>
  )
}

export default App

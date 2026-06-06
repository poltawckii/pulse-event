import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav.jsx'
import Footer from './components/Footer.jsx'
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
import ScrollToTop from './components/ScrollToTop.jsx'
import styles from './App.module.css'

function AppContent() {
  const location = useLocation()
  const isMapRoute = location.pathname === '/map'

  return (
    <div className={`${styles.appShell} ${isMapRoute ? styles.appShellFull : ''}`}>
      <ScrollToTop />
      {!isMapRoute && <TopNav />}
      <main className={`${styles.main} ${isMapRoute ? styles.mainFull : ''}`}>
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
      {!isMapRoute && <Footer />}
      <ToastHost />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App

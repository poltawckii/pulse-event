import { useEffect, useRef, useState } from 'react'
import styles from './ToastHost.module.css'

const dismissDelayMs = 3200

function ToastHost() {
  const [items, setItems] = useState([])
  const idRef = useRef(1)

  useEffect(() => {
    const handler = (event) => {
      const message = event?.detail?.message
      if (!message) return
      const type = event.detail?.type || 'success'
      const id = idRef.current
      idRef.current += 1

      setItems((prev) => [...prev, { id, message, type }])

      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }, dismissDelayMs)
    }

    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [])

  return (
    <div className={styles.host} aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`${styles.toast} ${styles[item.type] || ''}`.trim()}>
          {item.message}
        </div>
      ))}
    </div>
  )
}

export default ToastHost

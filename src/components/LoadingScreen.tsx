import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { getAccessToken } from '../services/api'

export function LoadingScreen() {
  const { loading, bootstrapping } = useApp()
  /* Sem token: não cobre a landing com “Carregando” fantasma */
  const show = loading || (bootstrapping && !!getAccessToken())

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Só o G — asset fixo, sem wordmark */}
          <img
            src="/logo-g-mark.png"
            alt=""
            className="brand-logo brand-logo-mark loading-logo"
            width={72}
            height={72}
            draggable={false}
            decoding="async"
          />
          <div className="loading-bar">
            <span />
          </div>
          <p className="loading-text">Carregando</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

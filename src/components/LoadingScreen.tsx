import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { getAccessToken } from '../services/api'
import { BrandLogo } from './BrandLogo'

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
          <BrandLogo
            variant="mark"
            size="mark"
            className="loading-logo"
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

import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App'
import './index.css'
import './motion.css'
import './interaction.css'
import './responsive.css'
import './country-dialog.css'
import './country-details.css'
import './csv-import.css'
import './nextai.css'
import { MotionPreferencesProvider } from '@/components/motion/MotionPreferences'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionPreferencesProvider>
      <App />
    </MotionPreferencesProvider>
  </React.StrictMode>,
)

import { createRoot } from 'react-dom/client'
import { AppProvider } from '@/ui/store'
import { App } from '@/ui/App'
import '@/ui/styles.css'

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App mode="popup" />
  </AppProvider>,
)

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider, useApp } from '@/ui/store'
import { App } from '@/ui/App'
import { Onboarding } from '@/ui/components/Onboarding'
import '@/ui/styles.css'

// Options page (Section 12): the same five-tab shell, full-width for bulk
// work. #onboarding (set by the background worker on first install) routes
// into the guided first-run flow.

function OptionsRoot() {
  const { store } = useApp()
  const wantsOnboarding = location.hash === '#onboarding' && !store.settings.onboardingCompleted
  const [showOnboarding, setShowOnboarding] = useState(wantsOnboarding)

  if (showOnboarding) {
    return (
      <Onboarding
        onExit={() => {
          location.hash = ''
          setShowOnboarding(false)
        }}
      />
    )
  }
  const initialTab = location.hash === '#Training' ? 'Training' : undefined
  return <App mode="options" initialTab={initialTab} />
}

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <OptionsRoot />
  </AppProvider>,
)

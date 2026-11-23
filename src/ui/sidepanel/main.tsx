import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@/ui/store'
import { CommentPanel } from '@/ui/components/CommentPanel'
import { OutreachPanel } from '@/ui/components/OutreachPanel'
import '@/ui/styles.css'

// The side panel is the outreach panel and nothing else (Stage 8, Bob's call: both surfaces, one
// component). The popup keeps every tab; this window exists because it stays open beside the
// LinkedIn profile you are reading, which a popup cannot do — it closes the moment you click the
// page, and reading a profile means clicking the page.
//
// Same component, same store, same styles. Nothing here runs on LinkedIn: the panel reads a profile
// only when you press its button, and it never sends anything.

/** The two things you do beside a LinkedIn page you are reading: write to someone, or comment on a
 *  post. Both are the popup's own tabs; here they are the whole window, so the switch is two
 *  buttons rather than the popup's full nav. */
function SidePanel() {
  const [tab, setTab] = useState<'outreach' | 'comment'>('outreach')
  return (
    <div className="app">
      <nav className="tabs">
        <button className={tab === 'outreach' ? 'active' : ''} onClick={() => setTab('outreach')}>Outreach</button>
        <button className={tab === 'comment' ? 'active' : ''} onClick={() => setTab('comment')}>Comment</button>
      </nav>
      <div className="tab-body">
        {tab === 'outreach' ? <OutreachPanel /> : <CommentPanel />}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <SidePanel />
  </AppProvider>,
)

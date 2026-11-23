import { useState } from 'react'
import { useApp } from '@/ui/store'
import { ProfileTab } from '@/ui/components/ProfileTab'
import { TrainingTab } from '@/ui/components/TrainingTab'

// ---------------------------------------------------------------------------
// First-run onboarding (Section 10): profile basics first (auto-covers all
// profile-backed seed questions), then a 10-question starter round. The user
// can skip or resume later; exiting sets onboardingCompleted.
// ---------------------------------------------------------------------------

export function Onboarding({ onExit }: { onExit: () => void }) {
  const { patchSettings } = useApp()
  const [step, setStep] = useState(0)

  const finish = async () => {
    await patchSettings({ onboardingCompleted: true })
    onExit()
  }

  return (
    <div className="onboarding">
      <div className="steps">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`step-dot ${i <= step ? 'done' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <h2>Welcome to FlashFiller ⚡</h2>
          <p>
            FlashFiller fills job applications from answers <strong>you</strong> write — it never
            invents anything, never submits a form for you, and all your data stays on this
            device.
          </p>
          <p className="muted">
            Two quick steps: fill in your basic profile (covers name, contact, links and more
            automatically), then answer 10 common application questions.
          </p>
          <div className="btn-row">
            <button className="btn primary" onClick={() => setStep(1)}>Let’s go</button>
            <button className="btn" onClick={() => void finish()}>Skip for now</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2>1 · Your profile</h2>
          <p className="muted">
            Everything here is matched automatically to standard fields — each filled entry is
            one less question to type.
          </p>
          <ProfileTab />
          <div className="btn-row">
            <button className="btn primary" onClick={() => setStep(2)}>
              Continue → answer 10 questions
            </button>
            <button className="btn" onClick={() => void finish()}>Finish later</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>2 · Answer 10 questions to get started</h2>
          <p className="muted">
            The most common free-text application questions. Save, skip, or mark not
            applicable — you can always continue in the Training tab.
          </p>
          <TrainingTab limit={10} onDone={() => void finish()} />
          <div className="btn-row">
            <button className="btn" onClick={() => void finish()}>Finish onboarding</button>
          </div>
        </div>
      )}
    </div>
  )
}

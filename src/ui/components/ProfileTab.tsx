import { useState } from 'react'
import type { EducationEntry, Profile, WorkHistoryEntry } from '@/types'
import { toMonthISO } from '@/lib/dates'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Profile tab (Sections 9, 12): the structured data that powers Tier-1
// matching, profile-backed seeds, and composite answers.
// ---------------------------------------------------------------------------

function Text({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Month picker storing canonical "YYYY-MM" — free-text dates ("January
 *  2026") mis-fill segmented ATS date widgets, so the format is enforced at
 *  the source. Legacy values are converted for display; saving re-stores
 *  them normalized. */
function MonthField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="month" value={toMonthISO(value)} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

const EMPTY_JOB: WorkHistoryEntry = {
  company: '', title: '', startDate: '', endDate: '', location: '', description: '',
}
const EMPTY_EDU: EducationEntry = {
  institution: '', degree: '', field: '', startDate: '', endDate: '',
}

export function ProfileTab() {
  const { store, setProfile } = useApp()
  const [draft, setDraft] = useState<Profile>(store.profile)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showEeo, setShowEeo] = useState(false)

  const patch = (p: Partial<Profile>) => setDraft({ ...draft, ...p })
  const patchAddress = (p: Partial<Profile['address']>) =>
    setDraft({ ...draft, address: { ...draft.address, ...p } })
  const patchLinks = (p: Partial<Profile['links']>) =>
    setDraft({ ...draft, links: { ...draft.links, ...p } })
  const patchEeo = (p: Partial<Profile['eeo']>) =>
    setDraft({ ...draft, eeo: { ...draft.eeo, ...p } })

  const patchJob = (i: number, p: Partial<WorkHistoryEntry>) => {
    const workHistory = draft.workHistory.map((j, idx) => (idx === i ? { ...j, ...p } : j))
    setDraft({ ...draft, workHistory })
  }
  const patchEdu = (i: number, p: Partial<EducationEntry>) => {
    const education = draft.education.map((e, idx) => (idx === i ? { ...e, ...p } : e))
    setDraft({ ...draft, education })
  }

  const save = async () => {
    await setProfile(draft)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <div>
      <h3>Basics</h3>
      <div className="row">
        <Text label="First name" value={draft.firstName} onChange={(v) => patch({ firstName: v })} />
        <Text label="Last name" value={draft.lastName} onChange={(v) => patch({ lastName: v })} />
      </div>
      <div className="row">
        <Text label="Email" type="email" value={draft.email} onChange={(v) => patch({ email: v })} />
        <Text label="Phone" value={draft.phone} onChange={(v) => patch({ phone: v })} />
      </div>
      <Text label="Pronouns (optional)" value={draft.pronouns} onChange={(v) => patch({ pronouns: v })} />

      <h3>ATS account credentials</h3>
      <div className="note">
        Used ONLY on account-creation / sign-in forms (pages with a password box). Stored in
        this browser's local extension storage; never captured, never shown in chips.
        FlashFiller fills the form — you always click Create Account / Sign In yourself.
      </div>
      <div className="row">
        <Text
          label="Account email"
          type="email"
          value={draft.accountEmail}
          onChange={(v) => patch({ accountEmail: v })}
        />
        <Text
          label="Account password"
          type="password"
          value={draft.accountPassword}
          onChange={(v) => patch({ accountPassword: v })}
        />
      </div>

      <h3>Address</h3>
      <Text label="Address line 1" value={draft.address.line1} onChange={(v) => patchAddress({ line1: v })} />
      <Text label="Address line 2" value={draft.address.line2} onChange={(v) => patchAddress({ line2: v })} />
      <div className="row">
        <Text label="City" value={draft.address.city} onChange={(v) => patchAddress({ city: v })} />
        <Text label="State / region" value={draft.address.state} onChange={(v) => patchAddress({ state: v })} />
      </div>
      <div className="row">
        <Text label="Postal code" value={draft.address.postalCode} onChange={(v) => patchAddress({ postalCode: v })} />
        <Text label="Country" value={draft.address.country} onChange={(v) => patchAddress({ country: v })} />
      </div>

      <h3>Links</h3>
      <div className="row">
        <Text label="LinkedIn" type="url" value={draft.links.linkedin} onChange={(v) => patchLinks({ linkedin: v })} />
        <Text label="GitHub" type="url" value={draft.links.github} onChange={(v) => patchLinks({ github: v })} />
      </div>
      <div className="row">
        <Text label="Portfolio" type="url" value={draft.links.portfolio} onChange={(v) => patchLinks({ portfolio: v })} />
        <Text label="Website" type="url" value={draft.links.website} onChange={(v) => patchLinks({ website: v })} />
      </div>

      <h3>Work eligibility & logistics</h3>
      <Text
        label="Work authorization (e.g. US citizen, H-1B, EU work permit)"
        value={draft.workAuthorization}
        onChange={(v) => patch({ workAuthorization: v })}
      />
      <div className="toggle-row">
        <span className="label">Legally authorized to work?</span>
        <input
          type="checkbox"
          checked={draft.authorizedToWork}
          onChange={(e) => patch({ authorizedToWork: e.target.checked })}
        />
      </div>
      <div className="toggle-row">
        <span className="label">Require visa sponsorship?</span>
        <input
          type="checkbox"
          checked={draft.requiresSponsorship}
          onChange={(e) => patch({ requiresSponsorship: e.target.checked })}
        />
      </div>
      <div className="toggle-row">
        <span className="label">Previously worked at the company you’re applying to?</span>
        <input
          type="checkbox"
          checked={draft.previouslyEmployedHere}
          onChange={(e) => patch({ previouslyEmployedHere: e.target.checked })}
        />
      </div>
      <div className="toggle-row">
        <span className="label">Willing to relocate?</span>
        <input
          type="checkbox"
          checked={draft.willingToRelocate}
          onChange={(e) => patch({ willingToRelocate: e.target.checked })}
        />
      </div>
      <div className="row">
        <Text label="Notice period" value={draft.noticePeriod} onChange={(v) => patch({ noticePeriod: v })} />
        <Text label="Desired salary" value={draft.desiredSalary} onChange={(v) => patch({ desiredSalary: v })} />
      </div>

      <h3>Work history</h3>
      <p className="muted">Most recent first — powers “list your last N employers” composite answers.</p>
      {draft.workHistory.map((job, i) => (
        <div className="card" key={i}>
          <div className="row">
            <Text label="Company" value={job.company} onChange={(v) => patchJob(i, { company: v })} />
            <Text label="Title" value={job.title} onChange={(v) => patchJob(i, { title: v })} />
          </div>
          <div className="row">
            <MonthField label="Start month" value={job.startDate} onChange={(v) => patchJob(i, { startDate: v })} />
            <MonthField label="End month (blank = current)" value={job.endDate} onChange={(v) => patchJob(i, { endDate: v })} />
            <Text label="Location" value={job.location} onChange={(v) => patchJob(i, { location: v })} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              value={job.description}
              onChange={(e) => patchJob(i, { description: e.target.value })}
            />
          </div>
          <button
            className="btn small danger"
            onClick={() => setDraft({ ...draft, workHistory: draft.workHistory.filter((_, idx) => idx !== i) })}
          >
            Remove
          </button>
        </div>
      ))}
      <button className="btn small" onClick={() => setDraft({ ...draft, workHistory: [...draft.workHistory, EMPTY_JOB] })}>
        + Add position
      </button>

      <h3>Education</h3>
      {draft.education.map((edu, i) => (
        <div className="card" key={i}>
          <Text label="Institution" value={edu.institution} onChange={(v) => patchEdu(i, { institution: v })} />
          <div className="row">
            <Text label="Degree" value={edu.degree} onChange={(v) => patchEdu(i, { degree: v })} />
            <Text label="Field of study" value={edu.field} onChange={(v) => patchEdu(i, { field: v })} />
          </div>
          <div className="row">
            <MonthField label="Start month" value={edu.startDate} onChange={(v) => patchEdu(i, { startDate: v })} />
            <MonthField label="End month (blank = in progress)" value={edu.endDate} onChange={(v) => patchEdu(i, { endDate: v })} />
          </div>
          <button
            className="btn small danger"
            onClick={() => setDraft({ ...draft, education: draft.education.filter((_, idx) => idx !== i) })}
          >
            Remove
          </button>
        </div>
      ))}
      <button className="btn small" onClick={() => setDraft({ ...draft, education: [...draft.education, EMPTY_EDU] })}>
        + Add education
      </button>

      <h3>
        <span className="collapse-head" onClick={() => setShowEeo(!showEeo)}>
          Voluntary EEO (optional) {showEeo ? '▾' : '▸'}
        </span>
      </h3>
      {showEeo && (
        <div>
          <div className="warn">
            These are stored locally and <strong>never auto-filled</strong>. FlashFiller only
            surfaces them as suggestions you explicitly accept per field.
          </div>
          <div className="row">
            <Text label="Gender" value={draft.eeo.gender} onChange={(v) => patchEeo({ gender: v })} />
            <Text label="Ethnicity" value={draft.eeo.ethnicity} onChange={(v) => patchEeo({ ethnicity: v })} />
          </div>
          <div className="row">
            <Text label="Veteran status" value={draft.eeo.veteranStatus} onChange={(v) => patchEeo({ veteranStatus: v })} />
            <Text label="Disability status" value={draft.eeo.disabilityStatus} onChange={(v) => patchEeo({ disabilityStatus: v })} />
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn primary" onClick={() => void save()}>Save profile</button>
        {savedFlash && <span className="saved-flash">✓ Saved</span>}
      </div>
    </div>
  )
}

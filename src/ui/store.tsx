import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { OptionSet, Profile, QAEntry, SeedCatalog, Settings, StoreData } from '@/types'
import {
  clearAll,
  deleteOptionSet,
  deleteQA,
  getStore,
  importData,
  onStoreChanged,
  updateProfile,
  updateSettings,
  upsertManyQA,
  upsertOptionSet,
  upsertQA,
} from '@/lib/storage'
import { loadSeedCatalog } from '@/lib/seed'

// ---------------------------------------------------------------------------
// UI-side state: one provider that loads the store + seed catalog and exposes
// write-through helpers. chrome.storage is the source of truth; onStoreChanged
// keeps every open surface (popup, options, content) in sync.
// ---------------------------------------------------------------------------

export interface AppState {
  store: StoreData
  seeds: SeedCatalog | null
  setProfile(profile: Profile): Promise<void>
  saveQA(entry: QAEntry): Promise<void>
  saveManyQA(entries: QAEntry[]): Promise<void>
  removeQA(id: string): Promise<void>
  saveOptionSet(set: OptionSet): Promise<void>
  removeOptionSet(id: string): Promise<void>
  patchSettings(patch: Partial<Settings>): Promise<void>
  importPayload(data: Partial<StoreData>, mode: 'merge' | 'replace'): Promise<void>
  deleteAllData(): Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const state = useContext(Ctx)
  if (!state) throw new Error('useApp outside provider')
  return state
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreData | null>(null)
  const [seeds, setSeeds] = useState<SeedCatalog | null>(null)

  useEffect(() => {
    void getStore().then(setStore)
    void loadSeedCatalog().then(setSeeds).catch(() => setSeeds(null))
    return onStoreChanged(setStore)
  }, [])

  if (!store) return <div className="tab-body muted">Loading…</div>

  const state: AppState = {
    store,
    seeds,
    async setProfile(profile) {
      setStore({ ...store, profile })
      await updateProfile(profile)
    },
    async saveQA(entry) {
      await upsertQA(entry)
      setStore(await getStore())
    },
    async saveManyQA(entries) {
      await upsertManyQA(entries)
      setStore(await getStore())
    },
    async removeQA(id) {
      await deleteQA(id)
      setStore(await getStore())
    },
    async saveOptionSet(set) {
      await upsertOptionSet(set)
      setStore(await getStore())
    },
    async removeOptionSet(id) {
      await deleteOptionSet(id)
      setStore(await getStore())
    },
    async patchSettings(patch) {
      setStore({ ...store, settings: { ...store.settings, ...patch } })
      await updateSettings(patch)
    },
    async importPayload(data, mode) {
      await importData(data, mode)
      setStore(await getStore())
    },
    async deleteAllData() {
      await clearAll()
      setStore(await getStore())
    },
  }

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

// Minimal chrome.* stub so storage/seed modules run under vitest (jsdom).
// Tests exercising storage get a fresh in-memory store via resetChromeMock().

type Listener = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void

const memory = new Map<string, unknown>()
const listeners: Listener[] = []

export function resetChromeMock(): void {
  memory.clear()
  listeners.length = 0
}

export function seedChromeStorage(key: string, value: unknown): void {
  memory.set(key, structuredClone(value))
}

const chromeMock = {
  storage: {
    local: {
      async get(keys?: string | string[] | null) {
        if (keys === null || keys === undefined) return Object.fromEntries(memory)
        const list = Array.isArray(keys) ? keys : [keys]
        const out: Record<string, unknown> = {}
        for (const k of list) if (memory.has(k)) out[k] = structuredClone(memory.get(k))
        return out
      },
      async set(items: Record<string, unknown>) {
        const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {}
        for (const [k, v] of Object.entries(items)) {
          changes[k] = { oldValue: memory.get(k), newValue: structuredClone(v) }
          memory.set(k, structuredClone(v))
        }
        for (const l of listeners) l(changes, 'local')
      },
      async remove(keys: string | string[]) {
        for (const k of Array.isArray(keys) ? keys : [keys]) memory.delete(k)
      },
    },
    onChanged: {
      addListener(l: Listener) {
        listeners.push(l)
      },
      removeListener(l: Listener) {
        const i = listeners.indexOf(l)
        if (i >= 0) listeners.splice(i, 1)
      },
    },
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
    sendMessage: async () => ({ ok: true }),
    onMessage: { addListener: () => undefined },
  },
}

// @ts-expect-error — test double, intentionally partial
globalThis.chrome = chromeMock

// jsdom implements File but not DataTransfer/DragEvent — the two APIs at the
// heart of the file-upload fill path. Minimal shim (items.add / files list /
// dataTransfer property): enough to assert the wiring; live verification
// covers real drop handlers. Installed unconditionally — a half-implemented
// native would be worse than a predictable double.
class FileListShim extends Array<File> {
  item(index: number): File | null {
    return this[index] ?? null
  }
}

class DataTransferShim {
  files = new FileListShim()
  items = {
    add: (file: File): void => {
      this.files.push(file)
    },
  }
}

class DragEventShim extends Event {
  dataTransfer: DataTransferShim | null
  constructor(type: string, init: EventInit & { dataTransfer?: DataTransferShim } = {}) {
    super(type, init)
    this.dataTransfer = init.dataTransfer ?? null
  }
}

// @ts-expect-error — test double
globalThis.DataTransfer = DataTransferShim
// @ts-expect-error — test double
globalThis.DragEvent = DragEventShim

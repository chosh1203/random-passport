/**
 * Representative photos come from Wikipedia/Wikimedia Commons via the public
 * REST summary endpoint (CORS-enabled). Results are cached; any failure
 * resolves to `null` and the UI falls back to a designed placeholder.
 */
const CACHE_KEY = 'rp.wikiimg.v1'
const memory = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

function loadCache(): Record<string, string | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
const persisted = loadCache()
Object.entries(persisted).forEach(([k, v]) => memory.set(k, v))

function saveCache(title: string, url: string | null) {
  // Don't persist failures — network might be back next session
  if (url === null) return
  persisted[title] = url
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(persisted))
  } catch {
    /* ignore */
  }
}

/** Rewrite a Wikimedia thumbnail URL to the requested width */
export function sizedImage(url: string, width: number) {
  return url.replace(/\/(\d+)px-/, `/${width}px-`)
}

export function getCachedWikiImage(title: string): string | null | undefined {
  return memory.get(title)
}

export function fetchWikiImage(title: string): Promise<string | null> {
  if (memory.has(title)) return Promise.resolve(memory.get(title) ?? null)
  const existing = inflight.get(title)
  if (existing) return existing

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  const p = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
    signal: ctrl.signal,
    headers: { Accept: 'application/json' },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const src: string | undefined = j?.thumbnail?.source ?? j?.originalimage?.source
      return src ?? null
    })
    .catch(() => null)
    .then((url) => {
      clearTimeout(timer)
      memory.set(title, url)
      saveCache(title, url)
      inflight.delete(title)
      return url
    })
  inflight.set(title, p)
  return p
}

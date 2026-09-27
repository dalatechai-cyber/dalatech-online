// Which AI staff are live, and where the website learns it.
//
// One switch per staff member lives in Dala AI (D-154 there): the founder flips it with the
// publish command, and the published snapshot records which staff are live. Дали's chat
// reads that snapshot, and so does this page, through Dala AI's public read
//   GET https://api.dalatech.online/api/web/launch/<web channel id>
// so the site and the chat change together, with no code or copy edit here.
//
// FAILS TO TODAY. Until the read answers — and whenever it cannot — the page shows the states
// below, which are the states of 2026-09-27: only Дали is live. A failure can therefore only
// ever show a live staff member as «Удахгүй», never claim one works before its switch is on.
//
// The last good answer is kept in localStorage for a day, so a returning visitor does not
// see a live staff member flicker to «Удахгүй» and back while the read is in flight. It is
// only a first paint: if the read then fails, the page drops it and shows today's states, so
// a switch turned off can never keep showing as live from a visitor's own storage.

export const DEFAULT_LIVE = Object.freeze({ dali: true, vira: false, eho: false, nova: false, ora: false });

// Tenant #0's website channel in Dala AI. An id, not a secret: the read is public by design
// and says only what this page prints to every visitor anyway.
const WEB_CHANNEL = "22e3c169-2350-45de-9806-d5c96587ce9f";
export const LAUNCH_URL = `https://api.dalatech.online/api/web/launch/${WEB_CHANNEL}`;

// The staff name is the part of the service name before « — » («Вира — маркетинг менежер»).
// A service this page does not know (the website, the bundle) is ignored.
const BY_NAME = { "Дали": "dali", "Вира": "vira", "Эхо": "eho", "Нова": "nova", "Ора": "ora" };

const STORE_KEY = "dt-staff-live";
const STORE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

/** The read's body → { id: boolean } for the staff it names, or null when it is not one. */
export function parseLaunch(body) {
  if (!body || !Array.isArray(body.services)) return null;
  const out = {};
  for (const s of body.services) {
    if (!s || typeof s.name !== "string") continue;
    const id = BY_NAME[s.name.split(" — ")[0].trim()];
    if (!id) continue;
    if (s.state === "live") out[id] = true;
    else if (s.state === "preregistration") out[id] = false;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Today's states with whatever the read (or the store) said on top. */
export function merge(known) {
  return { ...DEFAULT_LIVE, ...(known || {}) };
}

export function readStored() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (!stored || typeof stored.at !== "number" || Date.now() - stored.at > STORE_MS) return null;
    return parseLaunch(stored);
  } catch (e) {
    // Private mode, blocked storage, a corrupt value: the page keeps today's states.
    console.warn("[launch] stored states unreadable", e);
    return null;
  }
}

function store(body) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ services: body.services, at: Date.now() }));
  } catch (e) {
    console.warn("[launch] states not stored", e);
  }
}

/**
 * The live states from Dala AI, or null. Never throws, never hangs past TIMEOUT_MS: every
 * failure is logged and returns null, and the caller keeps what it shows.
 */
export async function fetchLaunch(fetchImpl = fetch) {
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(LAUNCH_URL, { signal: ctrl ? ctrl.signal : undefined, credentials: "omit" });
    if (!res.ok) {
      console.warn(`[launch] ${res.status}: keeping the states on the page`);
      return null;
    }
    const body = await res.json();
    const parsed = parseLaunch(body);
    if (parsed === null) {
      console.warn("[launch] the answer named no staff: keeping the states on the page");
      return null;
    }
    store(body);
    return parsed;
  } catch (e) {
    console.warn("[launch] unreachable: keeping the states on the page", e && e.name === "AbortError" ? "timeout" : e);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- preview only
// On a preview deployment (Vercel's *.vercel.app, or localhost) the founder can switch each
// staff member on and off to see both states. Production never shows the switches and never
// reads an override: the only way to change what a visitor sees there is Dala AI's switch.
// Only hosts that are certainly ours and certainly not production: this machine and Vercel's
// preview deployments. Anything else (production, a translate proxy, an archive, a future
// domain) never shows the switches.
const PREVIEW_KEY = "dt-preview-live";

export function isPreviewHost(hostname) {
  if (typeof hostname !== "string") return false;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
}

/** `?live=vira,nova`, `?live=all`, `?live=none` → an override, or null. Preview hosts only. */
export function overrideFromQuery(search) {
  const v = new URLSearchParams(search || "").get("live");
  if (v === null) return null;
  const ids = ["vira", "eho", "nova", "ora"];
  if (v === "all") return Object.fromEntries(ids.map((id) => [id, true]));
  if (v === "none") return Object.fromEntries(ids.map((id) => [id, false]));
  const on = new Set(v.split(",").map((s) => s.trim()));
  return Object.fromEntries(ids.map((id) => [id, on.has(id)]));
}

export function readPreview() {
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[launch] preview switches unreadable", e);
    return null;
  }
}

export function writePreview(value) {
  try {
    if (value === null) window.sessionStorage.removeItem(PREVIEW_KEY);
    else window.sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(value));
  } catch (e) {
    console.warn("[launch] preview switches not kept", e);
  }
}

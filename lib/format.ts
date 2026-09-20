const TZ = 'Africa/Johannesburg';
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's date as YYYY-MM-DD in South African time. */
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday–Sunday range containing the given day. */
export function weekRange(iso: string = todayISO()): { start: string; end: string } {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const start = addDays(iso, -((dow + 6) % 7));
  return { start, end: addDays(start, 6) };
}

/** "2026-09-18" -> "Thu, 18 Sep" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return `${DAY[d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

/** "14:30" / "14:30:00" -> "2:30 PM". Anything else is returned untouched. */
export function formatTime(raw: string | null | undefined): string {
  if (!raw) return '';
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

/** 350 -> "R350"; "R350" stays "R350". */
export function formatPrice(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return `R${v.toLocaleString('en-ZA')}`;
  const s = String(v);
  return /^R/i.test(s) ? s : `R${s}`;
}

/** Supabase errors are plain objects (not Error instances) — this handles both. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

/* --------------------- booking date/time (mobile format) --------------------- */

const MON_INDEX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * The mobile app stores booking dates as display text ("Fri, 19 Sep 2026").
 * This turns that (or a real ISO date) into "2026-09-19" so we can sort/compare.
 */
export function parseBookingDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = /(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})/.exec(raw);
  if (!m) return null;
  const month = MON_INDEX[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** "10:00 AM" / "14:30" -> minutes since midnight (used for sorting). */
export function parseTimeMinutes(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = /(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(raw);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + mins;
}

/** Shows an ISO date nicely, and leaves the mobile app's display text as-is. */
export function displayDate(raw: string | null | undefined): string {
  if (!raw) return '';
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? formatDate(raw) : raw;
}

/* --------------------------- links & locations --------------------------- */

/** Adds https:// if missing and checks it looks like a real link. */
export function cleanUrl(raw: string): { value: string | null; valid: boolean } {
  const t = raw.trim();
  if (!t) return { value: null, valid: true };
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes('.')) return { value: null, valid: false };
    return { value: withProto, valid: true };
  } catch {
    return { value: null, valid: false };
  }
}

/** Pulls coordinates out of a full Google Maps link, or a plain "-25.57, 28.10" pair. */
export function parseMapsLink(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const p of patterns) {
    const m = p.exec(t);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** A Google Maps link for a business — coordinates if we have them, else address text. */
export function mapsHref(b: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
}): string | null {
  if (b.latitude != null && b.longitude != null) {
    return `https://www.google.com/maps?q=${b.latitude},${b.longitude}`;
  }
  const text = [b.address, b.city].filter(Boolean).join(', ');
  return text ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}` : null;
}

/** ISO timestamp -> "10:42" in South African time. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
}

/** "076 670 3518" -> "27766703518" (digits only, for wa.me links and tel: with a leading +). */
export function toInternational(raw: string, countryCode = '27'): string {
  const c = raw.trim().replace(/[^\d+]/g, '');
  if (c.startsWith('+')) return c.slice(1);
  if (c.startsWith('00')) return c.slice(2);
  if (c.startsWith('0')) return countryCode + c.slice(1);
  if (c.startsWith(countryCode) && c.length >= 11) return c;
  return countryCode + c;
}

/** ISO timestamp -> "20 Sep, 11:35" in South African time. */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: TZ });
  return `${day}, ${formatClock(iso)}`;
}

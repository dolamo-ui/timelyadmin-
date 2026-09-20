import { supabase } from './supabase';
import {
  displayDate,
  formatPrice,
  formatTime,
  parseBookingDate,
  parseTimeMinutes,
  todayISO,
  weekRange,
} from './format';

/* ---------------------------------------------------------------------------
 * SCHEMA THIS FILE RELIES ON (matches your mobile app):
 *   businesses(id uuid, name, category, about, image, address, city, phone,
 *              website, opening_hours jsonb, latitude, longitude, owner_id)
 *   services  (id, business_id, name, description, duration_minutes, price)
 *   staff     (id, business_id, name, role, rating)
 *   bookings  (id, business_id, service_id, user_id?, date text, time text,
 *              price text, status, + denormalised names the app saves)
 *   The mobile app saves booking `date` as text like "Fri, 19 Sep 2026" and
 *   `time` like "10:00 AM"; parseBookingDate() in format.ts understands that.
 * ------------------------------------------------------------------------- */

export type BookingStatus = 'Upcoming' | 'Completed' | 'Cancelled';

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}
/** Keyed '0'..'6' by JS getDay() (0 = Sunday) — the shape the mobile app reads. */
export type OpeningHours = Record<string, DayHours>;

export interface Business {
  id: string;
  name: string;
  category: string | null;
  about: string | null;
  image: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  price_range: string | null;
  opening_hours: unknown;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string | null;
}

export interface BookingRow {
  id: string;
  customer: string;
  service: string;
  staff: string;
  date: string;
  time: string;
  sortKey: string;
  price: string;
  status: BookingStatus;
  isoDate: string | null;
  checkedInAt: string | null;
}

/* ---------------------------------- hours --------------------------------- */

export function defaultHours(): OpeningHours {
  const out: OpeningHours = {};
  for (let i = 0; i < 7; i++) out[String(i)] = { open: '09:00', close: '17:00', closed: i === 0 };
  return out;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Reads EITHER format and always returns the '0'..'6' shape:
 *   new:    { "1": { open: "09:00", close: "17:00", closed: false }, ... }
 *   legacy: { "monday": "09:00-17:00", "sunday": "Closed", ... }
 * Missing days fall back to 09:00–17:00 (Sunday closed).
 */
export function normalizeHours(raw: unknown): OpeningHours {
  const base = defaultHours();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Record<string, unknown>;

  for (let i = 0; i < 7; i++) {
    const v = src[String(i)] ?? src[DAY_NAMES[i]];
    if (v && typeof v === 'object') {
      const d = v as Partial<DayHours>;
      base[String(i)] = {
        open: String(d.open ?? '09:00').slice(0, 5),
        close: String(d.close ?? '17:00').slice(0, 5),
        closed: !!d.closed || !d.open,
      };
    } else if (typeof v === 'string') {
      const m = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/.exec(v.trim());
      base[String(i)] = m
        ? {
            open: `${m[1].padStart(2, '0')}:${m[2]}`,
            close: `${m[3].padStart(2, '0')}:${m[4]}`,
            closed: false,
          }
        : { open: '09:00', close: '17:00', closed: true };
    }
  }
  return base;
}

/* -------------------------------- business -------------------------------- */

const BUSINESS_COLUMNS =
  'id, name, category, about, image, phone, website, address, city, latitude, longitude, price_range, opening_hours';

export async function getMyBusiness(): Promise<Business | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? ({ ...data, id: String(data.id) } as Business) : null;
}

export async function updateBusiness(
  id: string,
  patch: Partial<Omit<Business, 'id' | 'category' | 'opening_hours'>> & { opening_hours?: OpeningHours }
) {
  const { error } = await supabase.from('businesses').update(patch).eq('id', id);
  if (error) throw error;
}

/** Uploads to the public `business-images` bucket and returns the public URL. */
export async function uploadBusinessImage(businessId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${businessId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('business-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw error;
  return supabase.storage.from('business-images').getPublicUrl(path).data.publicUrl;
}

/* -------------------------------- services -------------------------------- */

export async function listServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, price')
    .eq('business_id', businessId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, id: String(s.id) })) as Service[];
}

export async function saveService(
  businessId: string,
  s: { id?: string; name: string; description: string; duration_minutes: number; price: number }
) {
  const payload = {
    business_id: businessId,
    name: s.name,
    description: s.description || null,
    duration_minutes: s.duration_minutes,
    price: s.price,
  };
  const { error } = s.id
    ? await supabase.from('services').update(payload).eq('id', s.id)
    : await supabase.from('services').insert(payload);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------------------------- staff --------------------------------- */

export async function listStaff(businessId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('business_id', businessId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, id: String(s.id) })) as StaffMember[];
}

export async function saveStaff(businessId: string, s: { id?: string; name: string; role: string }) {
  const payload = { business_id: businessId, name: s.name, role: s.role || null };
  const { error } = s.id
    ? await supabase.from('staff').update(payload).eq('id', s.id)
    : await supabase.from('staff').insert(payload);
  if (error) throw error;
}

export async function deleteStaff(id: string) {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------- bookings -------------------------------- */

async function lookup(table: string, ids: string[], columns: string): Promise<Map<string, any>> {
  if (!ids.length) return new Map();
  const { data } = await supabase.from(table).select(columns).in('id', ids);
  return new Map(((data ?? []) as unknown as any[]).map((r) => [String(r.id), r]));
}

async function toBookingRows(rows: any[]): Promise<BookingRow[]> {
  const uniq = (key: string) =>
    Array.from(new Set(rows.map((r) => r[key]).filter(Boolean).map(String)));

  const [customers, services, staff] = await Promise.all([
    lookup('profiles', uniq('user_id'), 'id, full_name'),
    lookup('services', uniq('service_id'), 'id, name'),
    lookup('staff', uniq('staff_id'), 'id, name'),
  ]);

  return rows.map((r) => {
    const rawDate = r.date ?? r.booking_date ?? '';
    const rawTime = r.time ?? r.booking_time ?? '';
    const iso = parseBookingDate(rawDate);
    return {
      id: String(r.id),
      customer:
        customers.get(String(r.user_id))?.full_name ?? r.customer_name ?? r.user_name ?? 'Customer',
      service: r.service_name ?? services.get(String(r.service_id))?.name ?? '—',
      staff: r.staff_name ?? staff.get(String(r.staff_id))?.name ?? 'Not assigned',
      date: displayDate(rawDate),
      time: formatTime(rawTime),
      sortKey: `${iso ?? '0000-00-00'} ${String(parseTimeMinutes(rawTime)).padStart(4, '0')}`,
      price: formatPrice(r.price),
      status: r.status as BookingStatus,
      isoDate: iso,
      checkedInAt: r.checked_in_at ?? null,
    };
  });
}

export async function listBookings(businessId: string): Promise<BookingRow[]> {
  // select('*') on purpose: the mobile app decides the exact column set, and we
  // read whichever of the usual names are present.
  const { data, error } = await supabase.from('bookings').select('*').eq('business_id', businessId);
  if (error) throw error;
  return toBookingRows((data ?? []) as any[]);
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}

/* -------------------------------- check-in -------------------------------- */

/**
 * The QR code on the customer's ticket holds "timely://booking/<id>"; the
 * ticket also shows "#BK<id>". Accept either, or the bare id.
 */
export function parseBookingRef(input: string): string {
  const t = input.trim();
  const m = /booking\/([^/?#\s]+)/i.exec(t);
  let raw = m ? m[1] : t;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  return raw.replace(/^#?BK/i, '').trim();
}

/** Finds a booking at THIS business by reference (row-level security hides other businesses' bookings). */
export async function findBooking(businessId: string, ref: string): Promise<BookingRow | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', ref)
    .maybeSingle();
  // 22P02 = the id column isn't text and the reference isn't a valid id: same as "not found"
  if (error && (error as { code?: string }).code !== '22P02') throw error;
  if (!data) return null;
  return (await toBookingRows([data]))[0];
}

/** Stamps the arrival time. The booking stays "Upcoming" until the owner marks it done. */
export async function checkInBooking(id: string): Promise<string> {
  const at = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .update({ checked_in_at: at })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Could not check this booking in. You may not have access to it.');
  return at;
}

/* ---------------------------------- stats --------------------------------- */

export async function getOwnerStats(businessId: string) {
  const today = todayISO();
  const { end } = weekRange(today);

  // Dates are text in the DB, so count client-side (a business's bookings are a small set).
  const [bookingsRes, servicesRes] = await Promise.all([
    supabase.from('bookings').select('date, status').eq('business_id', businessId),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
  ]);
  const err = bookingsRes.error ?? servicesRes.error;
  if (err) throw err;

  let todayCount = 0;
  let upcomingWeek = 0;
  for (const b of (bookingsRes.data ?? []) as { date: string; status: string }[]) {
    const iso = parseBookingDate(b.date);
    if (!iso) continue;
    if (iso === today && b.status !== 'Cancelled') todayCount++;
    if (b.status === 'Upcoming' && iso >= today && iso <= end) upcomingWeek++;
  }

  return { today: todayCount, upcomingWeek, services: servicesRes.count ?? 0 };
}

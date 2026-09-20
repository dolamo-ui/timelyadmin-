'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBusiness } from '../../components/Business';
import { DayHours, normalizeHours, updateBusiness, uploadBusinessImage } from '../../../lib/data';
import { cleanUrl, errorMessage, mapsHref, parseMapsLink } from '../../../lib/format';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const INPUT =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-light';
const TIME =
  'rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink tabular-nums outline-none focus:border-brand';
const LABEL = 'mb-1.5 block text-sm font-medium text-ink';
const MAX_IMAGE_MB = 3;
const PRICE_OPTIONS = [
  { value: 'R', label: 'R — Budget-friendly' },
  { value: 'RR', label: 'RR — Mid-range' },
  { value: 'RRR', label: 'RRR — Premium' },
];

export default function ProfilePage() {
  const { business, setBusiness } = useBusiness();

  const [name, setName] = useState(business.name ?? '');
  const [about, setAbout] = useState(business.about ?? '');
  const [image, setImage] = useState(business.image ?? '');
  // Only offer the standard values; anything odd in the database shows as "Choose…" and is left untouched.
  const [priceRange, setPriceRange] = useState(
    PRICE_OPTIONS.some((o) => o.value === business.price_range) ? (business.price_range as string) : ''
  );
  const [phone, setPhone] = useState(business.phone ?? '');
  const [website, setWebsite] = useState(business.website ?? '');
  const [address, setAddress] = useState(business.address ?? '');
  const [city, setCity] = useState(business.city ?? '');
  const [lat, setLat] = useState(business.latitude != null ? String(business.latitude) : '');
  const [lng, setLng] = useState(business.longitude != null ? String(business.longitude) : '');
  const [mapsInput, setMapsInput] = useState('');
  const [mapsMsg, setMapsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hours, setHours] = useState<DayHours[]>(() => {
    const h = normalizeHours(business.opening_hours);
    return DAYS.map((_, i) => h[String(i)]);
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const touch = () => setSaved(false);

  function updateDay(index: number, patch: Partial<DayHours>) {
    touch();
    setHours((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file (JPG, PNG or WebP).');
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setError(`Image must be under ${MAX_IMAGE_MB} MB.`);

    setError(null);
    setUploading(true);
    try {
      setImage(await uploadBusinessImage(business.id, file));
      touch(); // uploaded, but not saved to the business until "Save changes"
    } catch (err) {
      setError(`Upload failed: ${errorMessage(err)}`);
    } finally {
      setUploading(false);
    }
  }

  function applyMapsLink() {
    const found = parseMapsLink(mapsInput);
    if (!found) {
      setMapsMsg({
        ok: false,
        text: 'Couldn’t find coordinates. Open the place in Google Maps and copy the full link from the address bar (short maps.app.goo.gl links don’t work), or type the coordinates below.',
      });
      return;
    }
    setLat(String(found.lat));
    setLng(String(found.lng));
    setMapsMsg({ ok: true, text: 'Location set from the link.' });
    setMapsInput('');
    touch();
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    if (!name.trim()) return setError('Business name can’t be empty.');

    const site = cleanUrl(website);
    if (!site.valid) return setError('The website / social media link doesn’t look right.');
    const img = cleanUrl(image);
    if (!img.valid) return setError('The image link doesn’t look right.');

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (lat.trim() || lng.trim()) {
      latitude = Number(lat);
      longitude = Number(lng);
      if (
        !lat.trim() || !lng.trim() ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180
      ) {
        return setError('Enter both latitude and longitude as numbers, or leave both empty.');
      }
    }

    const badDay = hours.findIndex((d) => !d.closed && d.open >= d.close);
    if (badDay !== -1) return setError(`${DAYS[badDay]}: closing time must be after opening time.`);

    // Saved in the '0'..'6' shape the mobile booking screen reads.
    const opening_hours = Object.fromEntries(hours.map((d, i) => [String(i), d]));

    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        about: about.trim() || null,
        image: img.value,
        ...(priceRange ? { price_range: priceRange } : {}), // column is NOT NULL, so never send null
        phone: phone.trim() || null,
        website: site.value,
        address: address.trim() || null,
        city: city.trim() || null,
        latitude,
        longitude,
        opening_hours,
      };
      await updateBusiness(business.id, patch);
      setBusiness({ ...business, ...patch });
      setWebsite(site.value ?? '');
      setImage(img.value ?? '');
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) return setPwMsg({ ok: false, text: 'Use at least 8 characters.' });
    if (newPassword !== confirmPassword) return setPwMsg({ ok: false, text: 'Passwords do not match.' });

    setPwBusy(true);
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);

    if (pwError) return setPwMsg({ ok: false, text: pwError.message });
    setNewPassword('');
    setConfirmPassword('');
    setPwMsg({ ok: true, text: 'Password updated.' });
  }

  const latNum = lat.trim() !== '' ? Number(lat) : null;
  const lngNum = lng.trim() !== '' ? Number(lng) : null;
  const mapLink = mapsHref({
    latitude: latNum !== null && Number.isFinite(latNum) ? latNum : null,
    longitude: lngNum !== null && Number.isFinite(lngNum) ? lngNum : null,
    address,
    city,
  });

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-ink">Profile &amp; hours</h1>
      <p className="mt-1.5 text-sm text-muted">What customers see, and when you&apos;re open.</p>

      {/* ------------------------------ details ------------------------------ */}
      <section className="mt-8 space-y-4">
        <h2 className="font-display text-sm font-semibold text-ink">Business details</h2>

        <div>
          <label htmlFor="name" className={LABEL}>Name</label>
          <input id="name" value={name} onChange={(e) => { setName(e.target.value); touch(); }} className={INPUT} />
        </div>

        <div>
          <label htmlFor="about" className={LABEL}>About</label>
          <textarea id="about" value={about} onChange={(e) => { setAbout(e.target.value); touch(); }} rows={3} className={INPUT} />
        </div>

        <div className="max-w-xs">
          <label htmlFor="price" className={LABEL}>Price range</label>
          <select id="price" value={priceRange} onChange={(e) => { setPriceRange(e.target.value); touch(); }} className={INPUT}>
            {priceRange === '' && <option value="">Choose…</option>}
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ------------------------------- photo -------------------------------- */}
      <section className="mt-10">
        <h2 className="font-display text-sm font-semibold text-ink">Photo</h2>
        <p className="mt-1 text-sm text-muted">The main picture customers see in the app.</p>

        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper text-xs text-muted">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Business" className="h-full w-full object-cover" />
            ) : (
              'No photo yet'
            )}
          </div>

          <div className="flex-1 space-y-3">
            <label className="inline-block cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
              {uploading ? 'Uploading…' : 'Upload a photo'}
              <input type="file" accept="image/*" onChange={handleImageFile} disabled={uploading} className="hidden" />
            </label>
            <div>
              <label htmlFor="image" className="mb-1 block text-xs text-muted">…or paste an image link</label>
              <input
                id="image"
                value={image}
                onChange={(e) => { setImage(e.target.value); touch(); }}
                placeholder="https://…"
                className={INPUT}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ contact ------------------------------- */}
      <section className="mt-10 space-y-4">
        <h2 className="font-display text-sm font-semibold text-ink">Contact</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={LABEL}>Phone</label>
            <input id="phone" value={phone} onChange={(e) => { setPhone(e.target.value); touch(); }} placeholder="076 670 3518" className={INPUT} />
          </div>
          <div>
            <label htmlFor="website" className={LABEL}>Website or social media</label>
            <input
              id="website"
              value={website}
              onChange={(e) => { setWebsite(e.target.value); touch(); }}
              placeholder="https://instagram.com/yourbusiness"
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------ location ------------------------------ */}
      <section className="mt-10 space-y-4">
        <h2 className="font-display text-sm font-semibold text-ink">Location</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="address" className={LABEL}>Address</label>
            <input id="address" value={address} onChange={(e) => { setAddress(e.target.value); touch(); }} placeholder="2622 Block L" className={INPUT} />
          </div>
          <div>
            <label htmlFor="city" className={LABEL}>City / area</label>
            <input id="city" value={city} onChange={(e) => { setCity(e.target.value); touch(); }} placeholder="Soshanguve" className={INPUT} />
          </div>
        </div>

        <div>
          <label htmlFor="maps" className={LABEL}>Google Maps link (optional)</label>
          <div className="flex gap-2">
            <input
              id="maps"
              value={mapsInput}
              onChange={(e) => setMapsInput(e.target.value)}
              placeholder="Paste the full Google Maps link to pin your exact location"
              className={INPUT}
            />
            <button
              type="button"
              onClick={applyMapsLink}
              disabled={!mapsInput.trim()}
              className="shrink-0 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
            >
              Use link
            </button>
          </div>
          {mapsMsg && (
            <p className={`mt-1.5 text-xs ${mapsMsg.ok ? 'text-success' : 'text-warn'}`}>{mapsMsg.text}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lat" className="mb-1 block text-xs text-muted">Latitude</label>
            <input id="lat" value={lat} onChange={(e) => { setLat(e.target.value); touch(); }} placeholder="-25.5407" className={INPUT} />
          </div>
          <div>
            <label htmlFor="lng" className="mb-1 block text-xs text-muted">Longitude</label>
            <input id="lng" value={lng} onChange={(e) => { setLng(e.target.value); touch(); }} placeholder="28.0982" className={INPUT} />
          </div>
        </div>

        {mapLink && (
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-brand hover:text-brand-dark"
          >
            View location on Google Maps ↗
          </a>
        )}
      </section>

      {/* -------------------------------- hours -------------------------------- */}
      <section className="mt-10">
        <h2 className="font-display text-sm font-semibold text-ink">Opening hours</h2>

        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          {DAYS.map((day, i) => {
            const d = hours[i];
            return (
              <div key={day} className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-0">
                <span className="w-28 text-sm font-medium text-ink">{day}</span>

                {d.closed ? (
                  <span className="flex-1 text-sm text-muted">Closed</span>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <input type="time" value={d.open} onChange={(e) => updateDay(i, { open: e.target.value })} className={TIME} />
                    <span className="text-sm text-muted">to</span>
                    <input type="time" value={d.close} onChange={(e) => updateDay(i, { close: e.target.value })} className={TIME} />
                  </div>
                )}

                <label className="flex items-center gap-1.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={d.closed}
                    onChange={(e) => updateDay(i, { closed: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-line accent-brand"
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-success">Saved ✓</span>}
      </div>

      {/* ------------------------------ password ------------------------------ */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-sm font-semibold text-ink">Change password</h2>
        <p className="mt-1 text-sm text-muted">Replace the temporary password you were given.</p>

        <form onSubmit={handlePassword} className="mt-4 grid max-w-md gap-4">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={INPUT}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT}
          />
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? 'text-success' : 'text-warn'}`}>{pwMsg.text}</p>}
          <button
            type="submit"
            disabled={pwBusy}
            className="w-fit rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
          >
            {pwBusy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}

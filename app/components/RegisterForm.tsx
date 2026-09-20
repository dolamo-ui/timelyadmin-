'use client';

import { useState } from 'react';
import s from '../landing.module.css';
import {
  CATEGORIES,
  FieldErrors,
  RegistrationInput,
  validateRegistration,
} from '../../lib/registration';

const EMPTY: RegistrationInput = {
  businessName: '',
  category: '',
  contactName: '',
  email: '',
  phone: '',
  whatsapp: '',
  city: '',
  message: '',
};

const FIELD_ORDER: (keyof RegistrationInput)[] = [
  'businessName', 'category', 'contactName', 'phone', 'whatsapp', 'email', 'city', 'message',
];

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={s.label}>
        {label}
        {required && (
          <>
            <span className={s.req} aria-hidden="true">*</span>
            <span className={s.srOnly}> (required)</span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p className={s.err} id={`${id}-err`} role="alert">{error}</p>
      ) : hint ? (
        <p className={s.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const [v, setV] = useState<RegistrationInput>(EMPTY);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [trap, setTrap] = useState(''); // honeypot
  const [done, setDone] = useState<{ name: string; business: string; whatsapp: string } | null>(null);

  function set(key: keyof RegistrationInput, value: string) {
    setV((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'phone' && sameAsPhone) next.whatsapp = value;
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleSame(checked: boolean) {
    setSameAsPhone(checked);
    if (checked) {
      setV((prev) => ({ ...prev, whatsapp: prev.phone }));
      setErrors((e) => ({ ...e, whatsapp: undefined }));
    }
  }

  function props(key: keyof RegistrationInput) {
    return {
      id: `reg-${key}`,
      name: key,
      value: v[key],
      'aria-invalid': errors[key] ? true : undefined,
      'aria-describedby': errors[key] ? `reg-${key}-err` : undefined,
      className: `${key === 'category' ? s.select : key === 'message' ? s.textarea : s.input} ${errors[key] ? s.invalid : ''}`,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const found = validateRegistration(v);
    setErrors(found);
    const firstBad = FIELD_ORDER.find((k) => found[k]);
    if (firstBad) {
      document.getElementById(`reg-${firstBad}`)?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, website: trap }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) setErrors(json.fields);
        setServerError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone({
        name: v.contactName.trim().split(' ')[0],
        business: v.businessName.trim(),
        whatsapp: v.whatsapp.trim(),
      });
    } catch {
      setServerError('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setV(EMPTY);
    setSameAsPhone(false);
    setErrors({});
    setServerError(null);
    setDone(null);
  }

  if (done) {
    return (
      <div className={s.formCard} role="status">
        <div className={s.success}>
          <span className={s.successIcon}>
            <CheckIcon />
          </span>
          <h3 className={`${s.successTitle} ${s.display}`}>Thank you, {done.name}!</h3>
          <p className={s.successText}>
            We’ve received the registration for <strong>{done.business}</strong>. The Timely team will contact you
            on WhatsApp ({done.whatsapp}) or by email to get you set up.
          </p>
          <button type="button" className={s.linkBtn} onClick={reset}>
            Register another business
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={s.formCard} onSubmit={handleSubmit} noValidate>
      <h3 className={`${s.formTitle} ${s.display}`}>Register your business</h3>
      <p className={s.formSub}>Tell us about your business and how to reach you.</p>
      <p className={s.legendNote}>
        <span className={s.req} aria-hidden="true">*</span> Required
      </p>

      <div className={s.fields}>
        <Field id="reg-businessName" label="Business name" required error={errors.businessName}>
          <input {...props('businessName')} type="text" autoComplete="organization" placeholder="Glow Hair Studio" onChange={(e) => set('businessName', e.target.value)} />
        </Field>

        <Field id="reg-category" label="Category" required error={errors.category}>
          <select {...props('category')} onChange={(e) => set('category', e.target.value)}>
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field id="reg-contactName" label="Your name" required error={errors.contactName}>
          <input {...props('contactName')} type="text" autoComplete="name" placeholder="Full name" onChange={(e) => set('contactName', e.target.value)} />
        </Field>

        <div className={s.fieldRow}>
          <Field id="reg-phone" label="Phone number" required error={errors.phone}>
            <input {...props('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="076 670 3518" onChange={(e) => set('phone', e.target.value)} />
          </Field>

          <div>
            <Field id="reg-whatsapp" label="WhatsApp number" required error={errors.whatsapp}>
              <input
                {...props('whatsapp')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="076 670 3518"
                readOnly={sameAsPhone}
                onChange={(e) => set('whatsapp', e.target.value)}
              />
            </Field>
            <label className={s.check}>
              <input type="checkbox" checked={sameAsPhone} onChange={(e) => toggleSame(e.target.checked)} />
              Same as phone number
            </label>
          </div>
        </div>

        <Field id="reg-email" label="Email address" required error={errors.email}>
          <input {...props('email')} type="email" inputMode="email" autoComplete="email" placeholder="you@business.com" onChange={(e) => set('email', e.target.value)} />
        </Field>

        <Field id="reg-city" label="City or area" required error={errors.city}>
          <input {...props('city')} type="text" autoComplete="address-level2" placeholder="Soshanguve" onChange={(e) => set('city', e.target.value)} />
        </Field>

        <Field id="reg-message" label="Anything you’d like us to know?" error={errors.message} hint="Optional. For example, what services you offer.">
          <textarea {...props('message')} rows={3} maxLength={500} onChange={(e) => set('message', e.target.value)} />
        </Field>

        {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
        <div className={s.hp} aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>
      </div>

      {serverError && (
        <p className={s.banner} role="alert">{serverError}</p>
      )}

      <button type="submit" className={`${s.primary} ${s.submit}`} disabled={sending}>
        {sending ? 'Sending…' : 'Register my business'}
      </button>
      <p className={s.privacy}>We only use your details to contact you about Timely.</p>
    </form>
  );
}

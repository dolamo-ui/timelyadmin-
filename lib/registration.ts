/** Shared by the public form (browser) and /api/apply (server) so both apply the same rules. */

export const CATEGORIES = ['Beauty & Hair', 'Wellness', 'Health & Dental', 'Fitness', 'Home Services'];

export interface RegistrationInput {
  businessName: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  message: string;
}

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

/** "076 670 3518" / "+27 76 670 3518" / "(076) 670-3518" -> digits with an optional leading + */
export function compactPhone(raw: string): string {
  return raw.trim().replace(/[\s\-().]/g, '');
}

export function isValidPhone(raw: string): boolean {
  return /^\+?\d{9,15}$/.test(compactPhone(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function validateRegistration(v: RegistrationInput): FieldErrors {
  const e: FieldErrors = {};
  const businessName = v.businessName.trim();
  const contactName = v.contactName.trim();
  const city = v.city.trim();

  if (businessName.length < 2) e.businessName = 'Enter your business name.';
  else if (businessName.length > 120) e.businessName = 'Business name is too long.';

  if (!CATEGORIES.includes(v.category)) e.category = 'Choose the category that fits best.';

  if (contactName.length < 2) e.contactName = 'Enter your name.';
  else if (contactName.length > 100) e.contactName = 'Name is too long.';

  if (!v.email.trim()) e.email = 'Enter your email address.';
  else if (!isValidEmail(v.email)) e.email = 'That email doesn’t look right.';

  if (!v.phone.trim()) e.phone = 'Enter your phone number.';
  else if (!isValidPhone(v.phone)) e.phone = 'Enter a valid phone number, e.g. 076 670 3518.';

  if (!v.whatsapp.trim()) e.whatsapp = 'Enter your WhatsApp number.';
  else if (!isValidPhone(v.whatsapp)) e.whatsapp = 'Enter a valid WhatsApp number, e.g. 076 670 3518.';

  if (city.length < 2) e.city = 'Enter your city or area.';
  else if (city.length > 80) e.city = 'City or area is too long.';

  if (v.message.length > 500) e.message = 'Please keep this under 500 characters.';

  return e;
}

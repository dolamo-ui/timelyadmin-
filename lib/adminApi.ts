import { supabase } from './supabase';

async function authedFetch(url: string, init: { method?: string; body?: unknown } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('You are signed out. Please sign in again.');

  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export interface AdminBusinessRow {
  id: string;
  name: string;
  category: string | null;
  hasOwner: boolean;
  ownerEmail: string | null;
}

export interface CreatedBusiness {
  business: { id: string; name: string };
  ownerEmail: string;
  password: string;
}

export async function fetchBusinesses(): Promise<AdminBusinessRow[]> {
  return (await authedFetch('/api/admin/businesses')).businesses;
}

export async function createBusiness(input: {
  businessId?: string;
  applicationId?: string;
  name?: string;
  category?: string;
  ownerEmail: string;
}): Promise<CreatedBusiness> {
  return authedFetch('/api/admin/businesses', { method: 'POST', body: input });
}

export async function fetchAdminStats(): Promise<{
  activeBusinesses: number;
  bookingsThisWeek: number;
  pendingOnboarding: number;
  newApplications: number;
}> {
  return authedFetch('/api/admin/stats');
}

export type ApplicationStatus = 'New' | 'Contacted' | 'Set up' | 'Declined';

export interface Application {
  id: string;
  createdAt: string;
  businessName: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  message: string;
  status: ApplicationStatus;
}

export async function fetchApplications(): Promise<Application[]> {
  return (await authedFetch('/api/admin/applications')).applications;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  await authedFetch('/api/admin/applications', { method: 'PATCH', body: { id, status } });
}

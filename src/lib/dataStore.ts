import { supabase } from '@/integrations/supabase/client';
import { Company, Patient, Visit, Service, Package, SessionLog, Stats } from '@/types/caretrack';

// ===== Services =====
export async function getServices(): Promise<Service[]> {
  const { data } = await supabase.from('services').select('*').order('id');
  return (data || []).map(s => ({ id: Number(s.id), name: s.name }));
}

export async function addService(name: string): Promise<Service> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('services').insert({ name, user_id: user!.id }).select().single();
  if (error) throw error;
  return { id: Number(data.id), name: data.name };
}

export async function deleteService(id: number): Promise<void> {
  await supabase.from('services').delete().eq('id', id);
}

// ===== Companies =====
export async function getCompanies(): Promise<Company[]> {
  const { data } = await supabase.from('companies').select('*').order('id');
  return (data || []).map(c => ({
    id: Number(c.id),
    name: c.name,
    contact_person: c.contact_person || '',
    phone: c.phone || '',
    payment_period: (c.payment_period as Company['payment_period']) || 'monthly',
    last_payment_date: c.last_payment_date,
    next_payment_date: c.next_payment_date,
  }));
}

export async function addCompany(data: Omit<Company, 'id'>): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row, error } = await supabase.from('companies').insert({
    name: data.name,
    contact_person: data.contact_person,
    phone: data.phone,
    payment_period: data.payment_period,
    last_payment_date: data.last_payment_date,
    next_payment_date: data.next_payment_date,
    user_id: user!.id,
  }).select().single();
  if (error) throw error;
  return { ...data, id: Number(row.id) };
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<void> {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.contact_person !== undefined) update.contact_person = data.contact_person;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.payment_period !== undefined) update.payment_period = data.payment_period;
  if (data.last_payment_date !== undefined) update.last_payment_date = data.last_payment_date;
  if (data.next_payment_date !== undefined) update.next_payment_date = data.next_payment_date;
  await supabase.from('companies').update(update).eq('id', id);
}

export async function deleteCompany(id: number): Promise<{ ok: boolean; error?: string }> {
  const patients = await getPatients();
  if (patients.some(p => p.company_id === id)) {
    return { ok: false, error: 'لا يمكن حذف شركة لديها مرضى مسجلين' };
  }
  await supabase.from('companies').delete().eq('id', id);
  return { ok: true };
}

// ===== Patients =====
export async function getPatients(): Promise<Patient[]> {
  const { data } = await supabase.from('patients').select('*, companies(name)').order('id');
  return (data || []).map((p: any) => ({
    id: Number(p.id),
    name: p.name,
    company_id: p.company_id ? Number(p.company_id) : 0,
    company_name: p.companies?.name || '',
    status: p.status || 'active',
    created_at: p.created_at,
  }));
}

export async function addPatient(data: { name: string; company_id: number | null; status?: string }): Promise<Patient> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row, error } = await supabase.from('patients').insert({
    name: data.name,
    company_id: data.company_id,
    status: data.status || 'active',
    user_id: user!.id,
  }).select('*, companies(name)').single();
  if (error) throw error;
  return {
    id: Number(row.id),
    name: row.name,
    company_id: row.company_id ? Number(row.company_id) : 0,
    company_name: (row as any).companies?.name || '',
    status: row.status || 'active',
    created_at: row.created_at,
  };
}

export async function updatePatient(id: number, data: Partial<Patient>): Promise<void> {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.company_id !== undefined) update.company_id = data.company_id || null;
  if (data.status !== undefined) update.status = data.status;
  await supabase.from('patients').update(update).eq('id', id);
}

export async function deletePatient(id: number): Promise<{ ok: boolean; error?: string }> {
  const { data: visits } = await supabase.from('visits').select('id').eq('patient_id', id).limit(1);
  if (visits && visits.length > 0) {
    return { ok: false, error: 'لا يمكن حذف مريض لديه زيارات مسجلة' };
  }
  await supabase.from('patients').delete().eq('id', id);
  return { ok: true };
}

// ===== Visits =====
export async function getVisits(filters?: { company_id?: number; patient_id?: number; start_date?: string; end_date?: string }): Promise<Visit[]> {
  let query = supabase.from('visits').select('*, patients(name, company_id, companies(name)), services(name)').order('visit_date', { ascending: false });

  if (filters?.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters?.start_date) query = query.gte('visit_date', filters.start_date);
  if (filters?.end_date) query = query.lte('visit_date', filters.end_date);

  const { data } = await query;

  let result = (data || []).map((v: any) => ({
    id: Number(v.id),
    patient_id: Number(v.patient_id),
    patient_name: v.patients?.name || '',
    company_id: v.patients?.company_id ? Number(v.patients.company_id) : undefined,
    company_name: v.patients?.companies?.name || '',
    service_id: v.service_id ? Number(v.service_id) : 0,
    service_name: v.services?.name || '',
    visit_date: v.visit_date,
    amount: Number(v.amount),
    paid_amount: Number(v.paid_amount),
    is_paid: Number(v.is_paid),
    is_postponed: Number(v.is_postponed || 0),
    total_sessions: v.total_sessions,
    notes: v.notes || '',
  }));

  if (filters?.company_id) {
    result = result.filter(v => v.company_id === filters.company_id);
  }

  return result;
}

export async function addVisit(data: {
  patient_id: number;
  service_id: number;
  visit_date: string;
  amount: number;
  paid_amount: number;
  is_paid: number;
  total_sessions?: number;
  notes: string;
}): Promise<Visit> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row, error } = await supabase.from('visits').insert({
    patient_id: data.patient_id,
    service_id: data.service_id,
    visit_date: data.visit_date,
    amount: data.amount,
    paid_amount: data.paid_amount,
    is_paid: data.is_paid,
    total_sessions: data.total_sessions || 1,
    notes: data.notes,
    user_id: user!.id,
  }).select().single();
  if (error) throw error;

  // Auto-create package if total_sessions > 1
  if (data.total_sessions && data.total_sessions > 1) {
    const { data: existing } = await supabase.from('packages')
      .select('id')
      .eq('patient_id', data.patient_id)
      .eq('service_id', data.service_id)
      .eq('status', 'active')
      .limit(1);
    if (!existing || existing.length === 0) {
      await addPackage({
        patient_id: data.patient_id,
        service_id: data.service_id,
        total_sessions: data.total_sessions,
      });
    }
  }

  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    patient_name: '',
    company_name: '',
    service_id: Number(row.service_id),
    service_name: '',
    visit_date: row.visit_date,
    amount: Number(row.amount),
    paid_amount: Number(row.paid_amount),
    is_paid: Number(row.is_paid),
    total_sessions: row.total_sessions,
    notes: row.notes || '',
  };
}

export async function deleteVisit(id: number): Promise<void> {
  await supabase.from('visits').delete().eq('id', id);
}

export async function updateVisit(id: number, data: Partial<Visit>): Promise<void> {
  const update: any = {};
  if (data.amount !== undefined) update.amount = data.amount;
  if (data.paid_amount !== undefined) update.paid_amount = data.paid_amount;
  if (data.is_paid !== undefined) update.is_paid = data.is_paid;
  if (data.is_postponed !== undefined) update.is_postponed = data.is_postponed;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.visit_date !== undefined) update.visit_date = data.visit_date;
  if (data.service_id !== undefined) update.service_id = data.service_id;
  await supabase.from('visits').update(update).eq('id', id);
}

export async function toggleVisitPaid(id: number, isPaid: boolean): Promise<void> {
  const { data: visit } = await supabase.from('visits').select('amount').eq('id', id).single();
  if (!visit) return;
  await supabase.from('visits').update({
    is_paid: isPaid ? 1 : 0,
    paid_amount: isPaid ? visit.amount : 0,
  }).eq('id', id);
}

// ===== Effective Amount =====
export async function getEffectiveAmount(visit: Visit): Promise<number> {
  if (visit.total_sessions && visit.total_sessions > 1) {
    const { data: pkg } = await supabase.from('packages')
      .select('used_sessions')
      .eq('patient_id', visit.patient_id)
      .eq('service_id', visit.service_id)
      .limit(1)
      .single();
    const usedSessions = pkg ? pkg.used_sessions : (visit.used_sessions || 0);
    const perSession = visit.amount / visit.total_sessions;
    return perSession * usedSessions;
  }
  return visit.amount;
}

// Sync version for quick calculations (uses visit data directly)
export function getEffectiveAmountSync(visit: Visit): number {
  if (visit.total_sessions && visit.total_sessions > 1) {
    const usedSessions = visit.used_sessions || 0;
    const perSession = visit.amount / visit.total_sessions;
    return perSession * usedSessions;
  }
  return visit.amount;
}

export function getEffectiveBalance(visit: Visit): number {
  const effective = getEffectiveAmountSync(visit);
  return Math.max(0, effective - (visit.paid_amount || 0));
}

// ===== Stats =====
export async function getStats(): Promise<Stats> {
  const patients = await getPatients();
  const visits = await getVisits();

  const pendingVisits = visits.filter(v => !v.is_paid);
  const paidVisits = visits.filter(v => v.is_paid);

  const companyPending = pendingVisits
    .filter(v => v.company_name)
    .reduce((sum, v) => sum + getEffectiveBalance(v), 0);

  const directPending = pendingVisits
    .filter(v => !v.company_name)
    .reduce((sum, v) => sum + getEffectiveBalance(v), 0);

  return {
    total_patients: patients.length,
    pending_amount: pendingVisits.reduce((sum, v) => sum + getEffectiveBalance(v), 0),
    paid_amount: paidVisits.reduce((sum, v) => sum + v.paid_amount, 0),
    company_pending: companyPending,
    direct_pending: directPending,
  };
}

export async function getCompanyStats(startDate: string, endDate: string, companyId?: number): Promise<any[]> {
  const companies = await getCompanies();
  const visits = await getVisits({ start_date: startDate, end_date: endDate });
  const patients = await getPatients();

  const targetCompanies = companyId ? companies.filter(c => c.id === companyId) : companies;

  return targetCompanies.map(company => {
    const companyPatients = patients.filter(p => p.company_id === company.id);
    const companyVisits = visits.filter(v => v.company_id === company.id);

    return {
      company_name: company.name,
      patient_count: companyPatients.length,
      visit_count: companyVisits.length,
      total_amount: companyVisits.reduce((sum, v) => sum + v.amount, 0),
    };
  });
}

// ===== Packages =====
export async function getPackages(): Promise<Package[]> {
  const { data } = await supabase.from('packages').select('*, patients(name), services(name)').order('id');
  return (data || []).map((p: any) => ({
    id: Number(p.id),
    patient_id: Number(p.patient_id),
    patient_name: p.patients?.name || '',
    service_id: p.service_id ? Number(p.service_id) : 0,
    service_name: p.services?.name || '',
    total_sessions: p.total_sessions,
    used_sessions: p.used_sessions,
    status: p.status as 'active' | 'completed',
    created_at: p.created_at,
  }));
}

export async function addPackage(data: { patient_id: number; service_id: number; total_sessions: number }): Promise<Package> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row, error } = await supabase.from('packages').insert({
    patient_id: data.patient_id,
    service_id: data.service_id,
    total_sessions: data.total_sessions,
    used_sessions: 0,
    status: 'active',
    user_id: user!.id,
  }).select().single();
  if (error) throw error;
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    patient_name: '',
    service_id: Number(row.service_id),
    service_name: '',
    total_sessions: row.total_sessions,
    used_sessions: row.used_sessions,
    status: row.status as 'active' | 'completed',
    created_at: row.created_at,
  };
}

export async function deletePackage(id: number): Promise<void> {
  await supabase.from('session_logs').delete().eq('package_id', id);
  await supabase.from('packages').delete().eq('id', id);
}

// ===== Session Logs =====
export async function getSessionLogs(packageId: number): Promise<SessionLog[]> {
  const { data } = await supabase.from('session_logs').select('*').eq('package_id', packageId).order('session_date');
  return (data || []).map(l => ({
    id: Number(l.id),
    package_id: Number(l.package_id),
    session_date: l.session_date,
    notes: l.notes || '',
  }));
}

export async function addSessionLog(packageId: number, sessionDate: string, notes: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('session_logs').insert({
    package_id: packageId,
    session_date: sessionDate,
    notes,
    user_id: user!.id,
  });

  // Update package used_sessions
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', packageId).single();
  if (pkg) {
    const newUsed = pkg.used_sessions + 1;
    await supabase.from('packages').update({
      used_sessions: newUsed,
      status: newUsed >= pkg.total_sessions ? 'completed' : 'active',
    }).eq('id', packageId);
  }
}

export async function updateSessionLog(logId: number, sessionDate: string, notes: string): Promise<void> {
  await supabase.from('session_logs').update({
    session_date: sessionDate,
    notes,
  }).eq('id', logId);
}

export async function deleteSessionLog(logId: number): Promise<void> {
  const { data: log } = await supabase.from('session_logs').select('package_id').eq('id', logId).single();
  if (!log) return;

  await supabase.from('session_logs').delete().eq('id', logId);

  const { data: pkg } = await supabase.from('packages').select('*').eq('id', log.package_id).single();
  if (pkg) {
    const newUsed = Math.max(0, pkg.used_sessions - 1);
    await supabase.from('packages').update({
      used_sessions: newUsed,
      status: newUsed < pkg.total_sessions ? 'active' : 'completed',
    }).eq('id', log.package_id);
  }
}

// ===== Company Payments =====
export async function markCompanyPaid(companyId: number, amount: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await updateCompany(companyId, { last_payment_date: today });

  const patients = await getPatients();
  const companyPatientIds = patients.filter(p => p.company_id === companyId).map(p => p.id);

  const { data: visits } = await supabase.from('visits')
    .select('*')
    .in('patient_id', companyPatientIds)
    .eq('is_paid', 0)
    .order('visit_date');

  if (!visits) return;

  let remaining = amount;
  for (const visit of visits) {
    if (remaining <= 0) break;
    const due = Number(visit.amount) - Number(visit.paid_amount || 0);
    if (remaining >= due) {
      await supabase.from('visits').update({ paid_amount: visit.amount, is_paid: 1 }).eq('id', visit.id);
      remaining -= due;
    } else {
      await supabase.from('visits').update({ paid_amount: Number(visit.paid_amount || 0) + remaining }).eq('id', visit.id);
      remaining = 0;
    }
  }
}

// ===== Initialize default data for new users =====
export async function initDefaultsIfNeeded(): Promise<void> {
  const { data: services } = await supabase.from('services').select('id').limit(1);
  if (services && services.length > 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Add default services
  await supabase.from('services').insert([
    { name: 'جلسة علاج طبيعي', user_id: user.id },
    { name: 'جلسة علاج وظيفي', user_id: user.id },
    { name: 'زيارة أخصائي تغذية', user_id: user.id },
  ]);

  // Add default companies
  await supabase.from('companies').insert([
    { name: 'ذات قروب / That Group', payment_period: 'weekly', user_id: user.id },
    { name: 'إشفاء / Ishfaa', payment_period: 'monthly', user_id: user.id },
    { name: 'نرعاكم / Naraakom', payment_period: 'monthly', user_id: user.id },
    { name: 'حكيم كير / Hakeem Care', payment_period: 'monthly', user_id: user.id },
    { name: 'وتد / Watad', payment_period: 'monthly', user_id: user.id },
  ]);
}

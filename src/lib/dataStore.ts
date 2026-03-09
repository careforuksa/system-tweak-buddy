import { Company, Patient, Visit, Service, Package, SessionLog, Stats } from '@/types/caretrack';

const STORAGE_KEYS = {
  patients: 'caretrack_patients',
  companies: 'caretrack_companies',
  visits: 'caretrack_visits',
  services: 'caretrack_services',
  packages: 'caretrack_packages',
  sessionLogs: 'caretrack_session_logs',
  nextId: 'caretrack_next_id',
};

function getNextId(entity: string): number {
  const key = `${STORAGE_KEYS.nextId}_${entity}`;
  const current = parseInt(localStorage.getItem(key) || '1');
  localStorage.setItem(key, (current + 1).toString());
  return current;
}

function getAll<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setAll<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Initialize with default services if empty
function initDefaults() {
  const services = getAll<Service>(STORAGE_KEYS.services);
  if (services.length === 0) {
    const defaults: Service[] = [
      { id: getNextId('services'), name: 'جلسة علاج طبيعي' },
      { id: getNextId('services'), name: 'جلسة علاج وظيفي' },
      { id: getNextId('services'), name: 'زيارة أخصائي تغذية' },
    ];
    setAll(STORAGE_KEYS.services, defaults);
  }
}
initDefaults();

// ===== Services =====
export function getServices(): Service[] {
  return getAll<Service>(STORAGE_KEYS.services);
}

export function addService(name: string): Service {
  const services = getServices();
  const service: Service = { id: getNextId('services'), name };
  services.push(service);
  setAll(STORAGE_KEYS.services, services);
  return service;
}

export function deleteService(id: number): void {
  setAll(STORAGE_KEYS.services, getServices().filter(s => s.id !== id));
}

// ===== Companies =====
export function getCompanies(): Company[] {
  return getAll<Company>(STORAGE_KEYS.companies);
}

export function addCompany(data: Omit<Company, 'id'>): Company {
  const companies = getCompanies();
  const company: Company = { ...data, id: getNextId('companies') };
  companies.push(company);
  setAll(STORAGE_KEYS.companies, companies);
  return company;
}

export function updateCompany(id: number, data: Partial<Company>): void {
  const companies = getCompanies();
  const idx = companies.findIndex(c => c.id === id);
  if (idx !== -1) {
    companies[idx] = { ...companies[idx], ...data };
    setAll(STORAGE_KEYS.companies, companies);
  }
}

export function deleteCompany(id: number): { ok: boolean; error?: string } {
  const patients = getPatients();
  if (patients.some(p => p.company_id === id)) {
    return { ok: false, error: 'لا يمكن حذف شركة لديها مرضى مسجلين' };
  }
  setAll(STORAGE_KEYS.companies, getCompanies().filter(c => c.id !== id));
  return { ok: true };
}

// ===== Patients =====
export function getPatients(): Patient[] {
  const patients = getAll<Patient>(STORAGE_KEYS.patients);
  const companies = getCompanies();
  return patients.map(p => ({
    ...p,
    company_name: companies.find(c => c.id === p.company_id)?.name || '',
  }));
}

export function addPatient(data: { name: string; company_id: number | null; status?: string }): Patient {
  const patients = getAll<Patient>(STORAGE_KEYS.patients);
  const patient: Patient = {
    id: getNextId('patients'),
    name: data.name,
    company_id: data.company_id as number,
    company_name: '',
    status: data.status || 'active',
    created_at: new Date().toISOString(),
  };
  patients.push(patient);
  setAll(STORAGE_KEYS.patients, patients);
  return patient;
}

export function updatePatient(id: number, data: Partial<Patient>): void {
  const patients = getAll<Patient>(STORAGE_KEYS.patients);
  const idx = patients.findIndex(p => p.id === id);
  if (idx !== -1) {
    patients[idx] = { ...patients[idx], ...data };
    setAll(STORAGE_KEYS.patients, patients);
  }
}

export function deletePatient(id: number): { ok: boolean; error?: string } {
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  if (visits.some(v => v.patient_id === id)) {
    return { ok: false, error: 'لا يمكن حذف مريض لديه زيارات مسجلة' };
  }
  setAll(STORAGE_KEYS.patients, getAll<Patient>(STORAGE_KEYS.patients).filter(p => p.id !== id));
  return { ok: true };
}

// ===== Visits =====
export function getVisits(filters?: { company_id?: number; patient_id?: number; start_date?: string; end_date?: string }): Visit[] {
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  const patients = getPatients();
  const companies = getCompanies();
  const services = getServices();

  let result = visits.map(v => {
    const patient = patients.find(p => p.id === v.patient_id);
    const service = services.find(s => s.id === v.service_id);
    return {
      ...v,
      patient_name: patient?.name || '',
      company_id: patient?.company_id,
      company_name: patient?.company_name || companies.find(c => c.id === patient?.company_id)?.name || '',
      service_name: service?.name || '',
    };
  });

  if (filters?.company_id) {
    result = result.filter(v => v.company_id === filters.company_id);
  }
  if (filters?.patient_id) {
    result = result.filter(v => v.patient_id === filters.patient_id);
  }
  if (filters?.start_date) {
    result = result.filter(v => v.visit_date >= filters.start_date!);
  }
  if (filters?.end_date) {
    result = result.filter(v => v.visit_date <= filters.end_date!);
  }

  return result.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
}

export function addVisit(data: {
  patient_id: number;
  service_id: number;
  visit_date: string;
  amount: number;
  paid_amount: number;
  is_paid: number;
  total_sessions?: number;
  notes: string;
}): Visit {
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  const visit: Visit = {
    id: getNextId('visits'),
    patient_id: data.patient_id,
    patient_name: '',
    company_name: '',
    service_id: data.service_id,
    service_name: '',
    visit_date: data.visit_date,
    amount: data.amount,
    paid_amount: data.paid_amount,
    is_paid: data.is_paid,
    total_sessions: data.total_sessions || 1,
    notes: data.notes,
  };
  visits.push(visit);
  setAll(STORAGE_KEYS.visits, visits);

  // Auto-create package if total_sessions > 1
  if (data.total_sessions && data.total_sessions > 1) {
    const existingPkgs = getAll<Package>(STORAGE_KEYS.packages);
    const existing = existingPkgs.find(
      p => p.patient_id === data.patient_id && p.service_id === data.service_id && p.status === 'active'
    );
    if (!existing) {
      addPackage({
        patient_id: data.patient_id,
        service_id: data.service_id,
        total_sessions: data.total_sessions,
      });
    }
  }

  return visit;
}

export function updateVisit(id: number, data: Partial<Visit>): void {
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  const idx = visits.findIndex(v => v.id === id);
  if (idx !== -1) {
    visits[idx] = { ...visits[idx], ...data };
    setAll(STORAGE_KEYS.visits, visits);
  }
}

export function toggleVisitPaid(id: number, isPaid: boolean): void {
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  const idx = visits.findIndex(v => v.id === id);
  if (idx !== -1) {
    visits[idx].is_paid = isPaid ? 1 : 0;
    if (isPaid) visits[idx].paid_amount = visits[idx].amount;
    else visits[idx].paid_amount = 0;
    setAll(STORAGE_KEYS.visits, visits);
  }
}

// ===== Stats =====
export function getStats(): Stats {
  const patients = getPatients();
  const visits = getVisits();

  const pendingVisits = visits.filter(v => !v.is_paid);
  const paidVisits = visits.filter(v => v.is_paid);

  const companyPending = pendingVisits
    .filter(v => v.company_name)
    .reduce((sum, v) => sum + (v.amount - (v.paid_amount || 0)), 0);

  const directPending = pendingVisits
    .filter(v => !v.company_name)
    .reduce((sum, v) => sum + (v.amount - (v.paid_amount || 0)), 0);

  return {
    total_patients: patients.length,
    pending_amount: pendingVisits.reduce((sum, v) => sum + (v.amount - (v.paid_amount || 0)), 0),
    paid_amount: paidVisits.reduce((sum, v) => sum + v.paid_amount, 0),
    company_pending: companyPending,
    direct_pending: directPending,
  };
}

export function getCompanyStats(startDate: string, endDate: string, companyId?: number): any[] {
  const companies = getCompanies();
  const visits = getVisits({ start_date: startDate, end_date: endDate });
  const patients = getPatients();

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
export function getPackages(): Package[] {
  const packages = getAll<Package>(STORAGE_KEYS.packages);
  const patients = getPatients();
  const services = getServices();

  return packages.map(p => ({
    ...p,
    patient_name: patients.find(pt => pt.id === p.patient_id)?.name || '',
    service_name: services.find(s => s.id === p.service_id)?.name || '',
  }));
}

export function addPackage(data: { patient_id: number; service_id: number; total_sessions: number }): Package {
  const packages = getAll<Package>(STORAGE_KEYS.packages);
  const pkg: Package = {
    id: getNextId('packages'),
    patient_id: data.patient_id,
    patient_name: '',
    service_id: data.service_id,
    service_name: '',
    total_sessions: data.total_sessions,
    used_sessions: 0,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  packages.push(pkg);
  setAll(STORAGE_KEYS.packages, packages);
  return pkg;
}

// ===== Session Logs =====
export function getSessionLogs(packageId: number): SessionLog[] {
  return getAll<SessionLog>(STORAGE_KEYS.sessionLogs).filter(l => l.package_id === packageId);
}

export function addSessionLog(packageId: number, sessionDate: string, notes: string): void {
  const logs = getAll<SessionLog>(STORAGE_KEYS.sessionLogs);
  logs.push({
    id: getNextId('session_logs'),
    package_id: packageId,
    session_date: sessionDate,
    notes,
  });
  setAll(STORAGE_KEYS.sessionLogs, logs);

  // Update package used_sessions
  const packages = getAll<Package>(STORAGE_KEYS.packages);
  const idx = packages.findIndex(p => p.id === packageId);
  if (idx !== -1) {
    packages[idx].used_sessions += 1;
    if (packages[idx].used_sessions >= packages[idx].total_sessions) {
      packages[idx].status = 'completed';
    }
    setAll(STORAGE_KEYS.packages, packages);
  }
}

export function deleteSessionLog(logId: number): void {
  const logs = getAll<SessionLog>(STORAGE_KEYS.sessionLogs);
  const log = logs.find(l => l.id === logId);
  if (!log) return;

  setAll(STORAGE_KEYS.sessionLogs, logs.filter(l => l.id !== logId));

  // Update package
  const packages = getAll<Package>(STORAGE_KEYS.packages);
  const idx = packages.findIndex(p => p.id === log.package_id);
  if (idx !== -1) {
    packages[idx].used_sessions = Math.max(0, packages[idx].used_sessions - 1);
    if (packages[idx].used_sessions < packages[idx].total_sessions) {
      packages[idx].status = 'active';
    }
    setAll(STORAGE_KEYS.packages, packages);
  }
}

// ===== Company Payments =====
export function markCompanyPaid(companyId: number, amount: number): void {
  const today = new Date().toISOString().split('T')[0];
  updateCompany(companyId, { last_payment_date: today });

  // Mark visits as paid up to the amount
  const visits = getAll<Visit>(STORAGE_KEYS.visits);
  const patients = getPatients();
  const companyPatientIds = patients.filter(p => p.company_id === companyId).map(p => p.id);
  
  let remaining = amount;
  for (let i = 0; i < visits.length && remaining > 0; i++) {
    if (companyPatientIds.includes(visits[i].patient_id) && !visits[i].is_paid) {
      const due = visits[i].amount - (visits[i].paid_amount || 0);
      if (remaining >= due) {
        visits[i].paid_amount = visits[i].amount;
        visits[i].is_paid = 1;
        remaining -= due;
      } else {
        visits[i].paid_amount = (visits[i].paid_amount || 0) + remaining;
        remaining = 0;
      }
    }
  }
  setAll(STORAGE_KEYS.visits, visits);
}

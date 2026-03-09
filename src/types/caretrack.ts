export type Company = {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  payment_period: 'weekly' | 'monthly' | 'custom';
  last_payment_date: string | null;
  next_payment_date: string | null;
  patient_count?: number;
  amountDue?: number;
};

export type Package = {
  id: number;
  patient_id: number;
  patient_name: string;
  service_id: number;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  status: 'active' | 'completed';
  created_at: string;
};

export type SessionLog = {
  id: number;
  package_id: number;
  session_date: string;
  notes: string;
};

export type Patient = {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
  status: string;
  created_at: string;
};

export type Visit = {
  id: number;
  patient_id: number;
  patient_name: string;
  company_id?: number;
  company_name: string;
  service_id: number;
  service_name: string;
  visit_date: string;
  amount: number;
  paid_amount: number;
  is_paid: number;
  is_postponed?: number;
  total_sessions?: number;
  used_sessions?: number;
  notes: string;
};

export type Service = {
  id: number;
  name: string;
};

export type Stats = {
  total_patients: number;
  pending_amount: number;
  paid_amount: number;
  company_pending?: number;
  direct_pending?: number;
};

export type TabType = 'dashboard' | 'patients' | 'companies' | 'visits' | 'packages' | 'alerts' | 'reports' | 'settings';

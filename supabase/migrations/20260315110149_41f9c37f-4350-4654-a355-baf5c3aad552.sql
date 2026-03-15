
-- Services table
CREATE TABLE public.services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies table
CREATE TABLE public.companies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  payment_period TEXT DEFAULT 'monthly',
  last_payment_date DATE,
  next_payment_date DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients table
CREATE TABLE public.patients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visits table
CREATE TABLE public.visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  service_id BIGINT REFERENCES public.services(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  is_paid SMALLINT DEFAULT 0,
  is_postponed SMALLINT DEFAULT 0,
  total_sessions INT DEFAULT 1,
  notes TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packages table
CREATE TABLE public.packages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  service_id BIGINT REFERENCES public.services(id) ON DELETE SET NULL,
  total_sessions INT NOT NULL DEFAULT 1,
  used_sessions INT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session logs table
CREATE TABLE public.session_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  package_id BIGINT REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: each user sees only their own data
CREATE POLICY "Users manage own services" ON public.services FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own companies" ON public.companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own patients" ON public.patients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own visits" ON public.visits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own packages" ON public.packages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own session_logs" ON public.session_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

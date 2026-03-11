import React, { useState } from 'react';
import { Building2, Clock, Package as PackageIcon } from 'lucide-react';
import { translations } from '@/lib/translations';
import { Company, Patient, Visit, Service, Package } from '@/types/caretrack';
import * as dataStore from '@/lib/dataStore';

export function AddPatientForm({ companies, onSuccess, initialData, lang }: { companies: Company[]; onSuccess: () => void; initialData?: Patient; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [name, setName] = useState(initialData?.name || '');
  const [companyId, setCompanyId] = useState(initialData?.company_id?.toString() || '');
  const [status, setStatus] = useState(initialData?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      dataStore.updatePatient(initialData.id, { name, company_id: companyId ? parseInt(companyId) : (null as any), status });
    } else {
      dataStore.addPatient({ name, company_id: companyId ? parseInt(companyId) : null });
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.patientName}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          placeholder={t.enterPatientName} />
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.company}</label>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
          <option value="">{t.direct}</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {initialData && (
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.status}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>
        </div>
      )}
      <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

export function AddVisitForm({ patients, services, onSuccess, initialData, lang }: { patients: Patient[]; services: Service[]; onSuccess: (navigateTo?: string) => void; initialData?: Visit; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [patientId, setPatientId] = useState(initialData?.patient_id?.toString() || '');
  const [serviceId, setServiceId] = useState(initialData?.service_id?.toString() || '');
  const [date, setDate] = useState(initialData?.visit_date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [paidAmount, setPaidAmount] = useState(initialData?.paid_amount?.toString() || '0');
  const [totalSessions, setTotalSessions] = useState(initialData?.total_sessions?.toString() || '1');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isPaid, setIsPaid] = useState(initialData?.is_paid === 1);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  const selectedPatient = patients.find(p => p.id.toString() === patientId);
  const isCompanyPatient = !!selectedPatient?.company_id;

  // Get active packages for the selected patient
  const allPackages = dataStore.getPackages();
  const patientPackages = patientId
    ? allPackages.filter(p => p.patient_id === parseInt(patientId) && p.status === 'active')
    : [];

  // Filter by selected service if chosen
  const matchingPackages = serviceId
    ? patientPackages.filter(p => p.service_id === parseInt(serviceId))
    : patientPackages;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPaidAmount = isCompanyPatient ? 0 : parseFloat(paidAmount);
    const finalIsPaid = isCompanyPatient ? 0 : (isPaid || finalPaidAmount >= parseFloat(amount) ? 1 : 0);

    if (initialData && initialData.id > 0) {
      dataStore.updateVisit(initialData.id, {
        patient_id: parseInt(patientId),
        service_id: parseInt(serviceId),
        visit_date: date,
        amount: parseFloat(amount),
        paid_amount: finalPaidAmount,
        total_sessions: parseInt(totalSessions) || 1,
        notes,
        is_paid: finalIsPaid,
      });
    } else {
      dataStore.addVisit({
        patient_id: parseInt(patientId),
        service_id: parseInt(serviceId),
        visit_date: date,
        amount: parseFloat(amount),
        paid_amount: finalPaidAmount,
        total_sessions: parseInt(totalSessions) || 1,
        notes,
        is_paid: finalIsPaid,
      });

      // Log session to selected package
      if (selectedPackageId && selectedPackageId !== 'new') {
        dataStore.addSessionLog(parseInt(selectedPackageId), date, notes || '');
      }
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.patient}</label>
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
          <option value="">{t.selectPatient}</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.company_name || t.direct})</option>)}
        </select>
        {isCompanyPatient && (
          <p className="mt-1 text-[10px] text-amber-600 font-bold flex items-center gap-1">
            <Building2 size={12} /> {t.companyPatientNote}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.service}</label>
        <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
          <option value="">{t.selectService}</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.date}</label>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" />
      </div>
      {!initialData && (
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.totalSessions}</label>
          <input type="number" min="1" required value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder="1" />
          {parseInt(totalSessions) > 1 && (
            <p className="mt-1 text-[10px] text-ct-blue-500 font-bold flex items-center gap-1">
              <Clock size={12} />
              {lang === 'ar' ? 'سيتم إنشاء برنامج علاجي تلقائياً لهذا المريض' : 'A treatment package will be created automatically'}
            </p>
          )}
        </div>
      )}
      {/* Add to Package option */}
      {!initialData && patientId && matchingPackages.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">
            <span className="flex items-center gap-1">
              <PackageIcon size={14} /> {t.addToPackage}
            </span>
          </label>
          <select value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
            <option value="">{t.noPackage}</option>
            {matchingPackages.map(p => (
              <option key={p.id} value={p.id}>
                {p.service_name} — {p.used_sessions}/{p.total_sessions} {t.sessions}
              </option>
            ))}
          </select>
          {selectedPackageId && (
            <p className="mt-1 text-[10px] text-primary font-bold flex items-center gap-1">
              <PackageIcon size={12} /> {t.sessionWillBeLogged}
            </p>
          )}
        </div>
      )}
      <div className={`grid ${isCompanyPatient ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.amount} ({t.sar})</label>
          <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder="0.00" />
        </div>
        {!isCompanyPatient && (
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">{t.amountPaid} ({t.sar})</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder="0.00" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.notes}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none h-24 resize-none"
          placeholder={t.sessionNotes} />
      </div>
      {initialData && !isCompanyPatient && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="w-4 h-4 accent-primary" />
          <label htmlFor="isPaid" className="text-sm font-bold">{t.paid}</label>
        </div>
      )}
      <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

export function AddCompanyForm({ onSuccess, initialData, lang }: { onSuccess: () => void; initialData?: Company; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [name, setName] = useState(initialData?.name || '');
  const [contact, setContact] = useState(initialData?.contact_person || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [period, setPeriod] = useState(initialData?.payment_period || 'monthly');
  const [nextDate, setNextDate] = useState(initialData?.next_payment_date || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const companyData = { name, contact_person: contact, phone, payment_period: period as any, last_payment_date: initialData?.last_payment_date || null, next_payment_date: nextDate || null };
    if (initialData) {
      dataStore.updateCompany(initialData.id, companyData);
    } else {
      dataStore.addCompany(companyData);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.companyName}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder={t.enterCompanyName} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.contactPerson}</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder={t.enterContactName} />
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.phone}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" placeholder="05xxxxxxxx" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.paymentCycle}</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
            <option value="weekly">{t.weekly}</option>
            <option value="monthly">{t.monthly}</option>
            <option value="custom">{t.custom}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">{t.nextAlertDate}</label>
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" />
        </div>
      </div>
      <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

export function AddPackageForm({ patients, services, onSuccess, lang }: { patients: Patient[]; services: Service[]; onSuccess: () => void; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [patientId, setPatientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState('24');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.addPackage({ patient_id: parseInt(patientId), service_id: parseInt(serviceId), total_sessions: parseInt(totalSessions) });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.patient}</label>
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
          <option value="">{t.selectPatient}</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.service}</label>
        <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none">
          <option value="">{t.selectService}</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">{t.totalSessions}</label>
        <input type="number" required value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none" />
      </div>
      <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
        {t.newPackage}
      </button>
    </form>
  );
}

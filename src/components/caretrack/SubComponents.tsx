import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, CheckCircle2, AlertCircle, DollarSign, Printer, Plus, X, Clock } from 'lucide-react';
import { translations } from '@/lib/translations';
import { Company, Visit, Patient, Service, Package, SessionLog } from '@/types/caretrack';
import * as dataStore from '@/lib/dataStore';

export function CompanyReport({ company, onMarkPaid, lang }: { company: Company; onMarkPaid: (amount: number) => void; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivedAmount, setReceivedAmount] = useState<string>('');

  useEffect(() => {
    const data = dataStore.getVisits({ company_id: company.id });
    setVisits(data);
    const unpaid = data.filter(v => !v.is_paid);
    const total = unpaid.reduce((sum, v) => sum + dataStore.getEffectiveBalance(v), 0);
    setReceivedAmount(total.toString());
    setLoading(false);
  }, [company.id]);

  const unpaidVisits = visits.filter(v => !v.is_paid);
  const totalUnpaid = unpaidVisits.reduce((sum, v) => sum + dataStore.getEffectiveBalance(v), 0);

  if (loading) return <div className="p-8 text-center text-muted-foreground">{t.loadingReport}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-2xl border border-border flex justify-between items-center">
        <div>
          <h4 className="font-bold text-lg">{company.name}</h4>
          <p className="text-sm text-muted-foreground">{company.contact_person} - {company.phone}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">{t.pendingAmount}</div>
          <div className="text-2xl font-black text-rose-500">{totalUnpaid.toLocaleString()} {t.sar}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="font-bold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          {t.viewDetailsInvoices} ({unpaidVisits.length})
        </h5>
        <div className="max-h-60 overflow-y-auto custom-scrollbar border border-border rounded-2xl">
          <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-sm`}>
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold">{t.patient}</th>
                <th className="px-4 py-3 font-bold">{t.date}</th>
                <th className="px-4 py-3 font-bold">{t.amount}</th>
                <th className="px-4 py-3 font-bold">{t.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unpaidVisits.map(visit => (
                <tr key={visit.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{visit.patient_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                  <td className="px-4 py-3 font-bold">{visit.amount} {t.sar}</td>
                  <td className="px-4 py-3 font-bold text-rose-500">{(visit.amount - (visit.paid_amount || 0))} {t.sar}</td>
                </tr>
              ))}
              {unpaidVisits.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">{t.noDuePayments}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-secondary p-4 rounded-2xl space-y-3">
        <label className="block text-sm font-bold text-primary">{t.receivedAmount}</label>
        <div className="relative">
          <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)}
            className="w-full px-4 py-3 bg-card border-2 border-primary/30 rounded-xl outline-none focus:border-primary font-bold text-lg" placeholder="0.00" />
          <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'left-4' : 'right-4'} font-bold text-primary`}>{t.sar}</div>
        </div>
        {parseFloat(receivedAmount) < totalUnpaid && (
          <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
            <AlertCircle size={14} />
            {t.partialPayment}: {t.remainingBalance} {(totalUnpaid - parseFloat(receivedAmount || '0')).toLocaleString()} {t.sar}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2 print:hidden">
        <button onClick={() => onMarkPaid(parseFloat(receivedAmount))}
          disabled={unpaidVisits.length === 0 || !receivedAmount || parseFloat(receivedAmount) <= 0}
          className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
          <CheckCircle2 size={20} /> {t.confirmPayment}
        </button>
        <button onClick={() => window.print()}
          className="px-6 bg-card border border-border font-bold py-3 rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <Printer size={20} /> {t.printReport}
        </button>
      </div>
    </div>
  );
}

export function PatientFile({ patient, services, onAddVisit, lang }: { patient: Patient; services: Service[]; onAddVisit: () => void; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const visits = dataStore.getVisits({ patient_id: patient.id });

  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-2xl border border-border flex justify-between items-center">
        <div>
          <h4 className="font-bold text-lg">{patient.name}</h4>
          <p className="text-sm text-muted-foreground">{patient.company_name || t.direct}</p>
        </div>
        <button onClick={onAddVisit}
          className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl hover:opacity-90 flex items-center gap-2 text-sm">
          <Plus size={18} /> {t.newVisit}
        </button>
      </div>

      <div className="space-y-3">
        <h5 className="font-bold flex items-center gap-2">
          {t.visitHistory} ({visits.length})
        </h5>
        <div className="max-h-80 overflow-y-auto custom-scrollbar border border-border rounded-2xl">
          <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-sm`}>
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold">{t.service}</th>
                <th className="px-4 py-3 font-bold">{t.date}</th>
                <th className="px-4 py-3 font-bold">{t.amount}</th>
                <th className="px-4 py-3 font-bold">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visits.map(visit => (
                <tr key={visit.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{visit.service_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                  <td className="px-4 py-3 font-bold">{visit.amount} {t.sar}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      visit.is_paid ? 'bg-secondary text-primary' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {visit.is_paid ? t.paid : t.pending}
                    </span>
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">{t.noData}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PackageDetails({ pkg, onUpdate, lang }: { pkg: Package; onUpdate: () => void; lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setLogs(dataStore.getSessionLogs(pkg.id));
  }, [pkg.id]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.addSessionLog(pkg.id, sessionDate, notes);
    setNotes('');
    setShowLogForm(false);
    setLogs(dataStore.getSessionLogs(pkg.id));
    onUpdate();
  };

  const handleDeleteLog = (id: number) => {
    if (confirm(t.confirmDeleteLog)) {
      dataStore.deleteSessionLog(id);
      setLogs(dataStore.getSessionLogs(pkg.id));
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-muted p-4 rounded-2xl border border-border">
        <div>
          <h4 className="font-bold">{pkg.service_name}</h4>
          <p className="text-sm text-muted-foreground">{pkg.patient_name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-primary">{pkg.used_sessions} / {pkg.total_sessions}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold">{t.sessionsCompleted}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-bold">{t.sessionLogs}</h5>
          <button onClick={() => setShowLogForm(!showLogForm)}
            className="text-primary text-sm font-bold flex items-center gap-1">
            {showLogForm ? t.cancel : <><Plus size={14} /> {t.logNewSession}</>}
          </button>
        </div>

        {showLogForm && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddLog} className="bg-card p-4 rounded-2xl border-2 border-primary/20 space-y-3">
            <input type="date" required value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-xl outline-none" />
            <textarea placeholder={t.sessionNotes} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-xl outline-none h-20 resize-none" />
            <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl">{t.save}</button>
          </motion.form>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {logs.map((log, index) => (
            <div key={log.id} className="flex items-start justify-between p-3 bg-card border border-border rounded-xl">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-primary font-bold text-xs">
                  {logs.length - index}
                </div>
                <div>
                  <div className="text-sm font-bold">{new Date(log.session_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</div>
                  {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                </div>
              </div>
              <button onClick={() => handleDeleteLog(log.id)} className="text-muted-foreground hover:text-rose-500">
                <X size={14} />
              </button>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4 italic">{t.noSessionsLogged}</p>
          )}
        </div>
      </div>
    </div>
  );
}

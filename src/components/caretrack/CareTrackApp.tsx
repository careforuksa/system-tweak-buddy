import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Building2, Calendar, Plus, DollarSign, CheckCircle2, XCircle,
  LayoutDashboard, Search, Filter, FileText, Menu, X, Bell, AlertCircle,
  Clock, BarChart3, Download, Printer, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { translations } from '@/lib/translations';
import * as dataStore from '@/lib/dataStore';
import { Company, Patient, Visit, Service, Package, Stats, TabType } from '@/types/caretrack';
import { StatCard, Modal, SidebarItem } from './SharedComponents';
import { AddPatientForm, AddVisitForm, AddCompanyForm, AddPackageForm } from './Forms';
import { CompanyReport, PatientFile, PackageDetails } from './SubComponents';

export default function CareTrackApp() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats>({ total_patients: 0, pending_amount: 0, paid_amount: 0 });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyStats, setCompanyStats] = useState<any[]>([]);
  const [dueCompanies, setDueCompanies] = useState<Company[]>([]);

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedCompanyForReport, setSelectedCompanyForReport] = useState<Company | null>(null);
  const [selectedPatientForFile, setSelectedPatientForFile] = useState<Patient | null>(null);

  const [visitSearch, setVisitSearch] = useState('');
  const [visitCompanyFilter, setVisitCompanyFilter] = useState<string>('all');
  const [visitStatusFilter, setVisitStatusFilter] = useState<string>('all');
  const [visitServiceFilter, setVisitServiceFilter] = useState<string>('all');
  const [visitStartDate, setVisitStartDate] = useState('');
  const [visitEndDate, setVisitEndDate] = useState('');
  const [showVisitFilters, setShowVisitFilters] = useState(false);

  const fetchData = useCallback(() => {
    setStats(dataStore.getStats());
    setPatients(dataStore.getPatients());
    setCompanies(dataStore.getCompanies());
    setVisits(dataStore.getVisits());
    setServices(dataStore.getServices());
    setPackages(dataStore.getPackages());
  }, []);

  useEffect(() => {
    fetchData();
    if (activeTab === 'companies') {
      setCompanyStats(dataStore.getCompanyStats(startDate, endDate));
    }
  }, [activeTab, startDate, endDate, fetchData]);

  useEffect(() => {
    if (companies.length > 0) {
      const allVisits = dataStore.getVisits();
      const unpaidByCompany = allVisits.reduce((acc, v) => {
        if (!v.is_paid && v.company_name) {
          acc[v.company_name] = (acc[v.company_name] || 0) + (v.amount - (v.paid_amount || 0));
        }
        return acc;
      }, {} as Record<string, number>);

      const due = companies
        .filter(c => unpaidByCompany[c.name] > 0)
        .map(c => ({ ...c, amountDue: unpaidByCompany[c.name] }));
      setDueCompanies(due);
    }
  }, [companies, visits]);

  const handleTogglePaid = (visitId: number, currentStatus: number, amount?: number) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;
    if (amount !== undefined) {
      dataStore.updateVisit(visitId, {
        paid_amount: (visit.paid_amount || 0) + amount,
        is_paid: (visit.paid_amount || 0) + amount >= visit.amount ? 1 : 0,
      });
    } else {
      dataStore.toggleVisitPaid(visitId, !currentStatus);
    }
    fetchData();
  };

  const handlePostponeVisit = (visitId: number) => {
    dataStore.updateVisit(visitId, { is_postponed: 1 });
    fetchData();
    alert(t.paymentPostponed);
  };

  const handleMarkCompanyPaid = (company: Company, amount?: number) => {
    if (amount !== undefined) {
      dataStore.markCompanyPaid(company.id, amount);
    } else {
      dataStore.updateCompany(company.id, { last_payment_date: new Date().toISOString().split('T')[0] });
    }
    fetchData();
    setSelectedCompanyForReport(null);
  };

  const filteredVisits = visits.filter(v => {
    const matchesSearch = v.patient_name.toLowerCase().includes(visitSearch.toLowerCase()) ||
      (v.company_name || '').toLowerCase().includes(visitSearch.toLowerCase());
    const matchesCompany = visitCompanyFilter === 'all' ||
      (visitCompanyFilter === 'direct' && !v.company_id) ||
      v.company_id?.toString() === visitCompanyFilter;
    const matchesStatus = visitStatusFilter === 'all' ||
      (visitStatusFilter === 'paid' && v.is_paid) ||
      (visitStatusFilter === 'unpaid' && !v.is_paid);
    const matchesService = visitServiceFilter === 'all' || v.service_id?.toString() === visitServiceFilter;
    const vDate = new Date(v.visit_date);
    const matchesStart = !visitStartDate || vDate >= new Date(visitStartDate);
    const matchesEnd = !visitEndDate || vDate <= new Date(visitEndDate);
    return matchesSearch && matchesCompany && matchesStatus && matchesService && matchesStart && matchesEnd;
  });

  const exportVisits = () => {
    const data = filteredVisits.map(v => ({
      [t.patient]: v.patient_name,
      [t.service]: v.service_name,
      [t.company]: v.company_name || t.direct,
      [t.date]: new Date(v.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US'),
      [t.amount]: v.amount,
      [t.status]: v.is_paid ? t.paid : t.pending,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.visits);
    XLSX.writeFile(wb, `${t.visits}_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="font-bold text-lg">{t.appName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="p-2 text-xs font-bold bg-muted rounded-lg">
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-muted-foreground">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Mobile Backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-30 lg:hidden" />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 h-screen bg-card border-l border-border transition-all duration-300 z-40
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 lg:w-20 -translate-x-full lg:translate-x-0 overflow-hidden'}`}>
          <div className="p-6 flex items-center gap-3 border-b border-border mb-6">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
              <LayoutDashboard size={24} />
            </div>
            {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight">{t.appName}</h1>}
          </div>

          <nav className="px-4 space-y-2">
            <SidebarItem id="dashboard" icon={LayoutDashboard} label={t.dashboard} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <SidebarItem id="patients" icon={Users} label={t.patients} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <SidebarItem id="companies" icon={Building2} label={t.companies} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <SidebarItem id="visits" icon={Calendar} label={t.visits} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <SidebarItem id="packages" icon={FileText} label={t.packages} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <SidebarItem id="reports" icon={BarChart3} label={t.reports} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
            <div className="relative">
              <SidebarItem id="alerts" icon={Bell} label={t.alerts} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
              {dueCompanies.length > 0 && (
                <span className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 bg-rose-500 text-card text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card`}>
                  {dueCompanies.length}
                </span>
              )}
            </div>
            <SidebarItem id="settings" icon={Filter} label={t.settings} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
          </nav>

          <div className="absolute bottom-8 px-6 w-full">
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="w-full mb-4 py-2 bg-muted rounded-xl text-xs font-bold text-muted-foreground hover:bg-border transition-colors">
              {lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
            </button>
            <div className="p-4 bg-muted rounded-2xl border border-border">
              <p className="text-xs text-muted-foreground mb-1">{t.currentUser}</p>
              <p className="text-sm font-semibold">{t.careProvider}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {activeTab === 'dashboard' && t.overview}
                {activeTab === 'patients' && t.patientManagement}
                {activeTab === 'companies' && t.referralCompanies}
                {activeTab === 'visits' && t.visitsBilling}
                {activeTab === 'packages' && t.treatmentPackages}
                {activeTab === 'reports' && t.financialReports}
                {activeTab === 'alerts' && t.paymentAlerts}
                {activeTab === 'settings' && t.systemSettings}
              </h2>
              <p className="text-muted-foreground mt-1">
                {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'patients' && (
                <button onClick={() => setShowAddPatient(true)}
                  className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-opacity shadow-lg">
                  <Plus size={18} /> <span>{t.newPatient}</span>
                </button>
              )}
              {activeTab === 'visits' && (
                <button onClick={() => setShowAddVisit(true)}
                  className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-opacity shadow-lg">
                  <Plus size={18} /> <span>{t.newVisit}</span>
                </button>
              )}
              {activeTab === 'companies' && (
                <button onClick={() => setShowAddCompany(true)}
                  className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-opacity shadow-lg">
                  <Plus size={18} /> <span>{t.newCompany}</span>
                </button>
              )}
            </div>
          </header>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label={t.totalPatients} value={stats.total_patients} icon={Users} color="blue" />
                <div className="space-y-1">
                  <StatCard label={t.pendingAmount} value={`${stats.pending_amount?.toLocaleString() || 0} ${t.sar}`} icon={DollarSign} color="amber" />
                  {stats.company_pending! > 0 && (
                    <div className="flex justify-between px-4 text-[10px] font-bold">
                      <span className="text-muted-foreground">{t.companyDues}:</span>
                      <span className="text-amber-600">{stats.company_pending?.toLocaleString()} {t.sar}</span>
                    </div>
                  )}
                  {stats.direct_pending! > 0 && (
                    <div className="flex justify-between px-4 text-[10px] font-bold">
                      <span className="text-muted-foreground">{t.individualDues}:</span>
                      <span className="text-ct-blue-500">{stats.direct_pending?.toLocaleString()} {t.sar}</span>
                    </div>
                  )}
                </div>
                <StatCard label={t.collectedAmount} value={`${stats.paid_amount?.toLocaleString() || 0} ${t.sar}`} icon={CheckCircle2} color="emerald" />
              </div>

              <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="font-bold text-lg">{t.recentVisits}</h3>
                  <button onClick={() => setActiveTab('visits')} className="text-primary text-sm font-medium hover:underline">{t.viewAll}</button>
                </div>
                <div className="overflow-x-auto">
                  <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-muted text-muted-foreground text-sm uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">{t.patient}</th>
                        <th className="px-6 py-4 font-semibold">{t.service}</th>
                        <th className="px-6 py-4 font-semibold">{t.company}</th>
                        <th className="px-6 py-4 font-semibold">{t.date}</th>
                        <th className="px-6 py-4 font-semibold">{t.amount}</th>
                        <th className="px-6 py-4 font-semibold">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visits.slice(0, 5).map(visit => (
                        <tr key={visit.id} className="hover:bg-muted transition-colors">
                          <td className="px-6 py-4 font-medium">{visit.patient_name}</td>
                          <td className="px-6 py-4 text-primary font-medium">{visit.service_name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{visit.company_name || t.direct}</td>
                          <td className="px-6 py-4 text-muted-foreground text-sm">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                          <td className="px-6 py-4 font-mono font-semibold">{visit.amount} {t.sar}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              visit.is_paid ? 'bg-secondary text-primary' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {visit.is_paid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {visit.is_paid ? t.paid : t.pending}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Patients */}
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map(patient => (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={patient.id}
                  className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground">
                      <Users size={24} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      patient.status === 'active' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {patient.status === 'active' ? t.active : t.inactive}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{patient.name}</h4>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                    <Building2 size={14} />
                    <span>{patient.company_name || t.direct}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button onClick={() => {
                      setActiveTab('visits');
                      setVisitSearch(patient.name);
                      setShowAddVisit(false);
                      setEditingVisit({ id: 0, patient_id: patient.id, patient_name: patient.name, service_id: 0, service_name: '', company_name: patient.company_name || '', visit_date: new Date().toISOString().split('T')[0], amount: 0, paid_amount: 0, is_paid: 0, notes: '' } as Visit);
                    }} className="bg-secondary text-primary font-bold py-2 rounded-xl hover:opacity-80 transition-opacity text-xs flex items-center justify-center gap-1">
                      <Plus size={14} /> {t.newVisit}
                    </button>
                    <button onClick={() => setSelectedPatientForFile(patient)}
                      className="bg-muted text-muted-foreground font-bold py-2 rounded-xl hover:opacity-80 text-xs flex items-center justify-center gap-1">
                      <FileText size={14} /> {t.medicalFile}
                    </button>
                  </div>
                  <div className="pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                    <span>{t.joinedIn}: {new Date(patient.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <button onClick={() => setEditingPatient(patient)} className="text-primary font-bold hover:underline">{t.edit}</button>
                    <button onClick={() => {
                      if (confirm(t.confirmDeletePatient)) {
                        const result = dataStore.deletePatient(patient.id);
                        if (result.ok) fetchData();
                        else alert(`${t.error}: ${result.error}`);
                      }
                    }} className="text-rose-500 font-bold hover:underline">{t.delete}</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Visits */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div className="relative w-full lg:w-96">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground`} size={18} />
                    <input type="text" placeholder={t.search} value={visitSearch} onChange={(e) => setVisitSearch(e.target.value)}
                      className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`} />
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button onClick={() => setShowVisitFilters(!showVisitFilters)}
                      className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-xl transition-all font-bold ${
                        showVisitFilters ? 'bg-primary text-primary-foreground border-primary shadow-lg' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                      }`}>
                      <Filter size={18} /> <span>{t.advancedFilter}</span>
                    </button>
                    <button onClick={exportVisits}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors font-bold">
                      <Download size={18} /> <span>{t.exportAccountant}</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showVisitFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-muted border-b border-border">
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t.fromDate}</label>
                          <input type="date" value={visitStartDate} onChange={(e) => setVisitStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t.toDate}</label>
                          <input type="date" value={visitEndDate} onChange={(e) => setVisitEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t.company}</label>
                          <select value={visitCompanyFilter} onChange={(e) => setVisitCompanyFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-card border border-border rounded-xl outline-none">
                            <option value="all">{t.allCompanies}</option>
                            <option value="direct">{t.direct}</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t.status}</label>
                          <select value={visitStatusFilter} onChange={(e) => setVisitStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-card border border-border rounded-xl outline-none">
                            <option value="all">{t.allStatuses}</option>
                            <option value="paid">{t.paid}</option>
                            <option value="unpaid">{t.pending}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t.service}</label>
                          <select value={visitServiceFilter} onChange={(e) => setVisitServiceFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-card border border-border rounded-xl outline-none">
                            <option value="all">{t.allServices}</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                          <button onClick={() => { setVisitSearch(''); setVisitCompanyFilter('all'); setVisitStatusFilter('all'); setVisitServiceFilter('all'); setVisitStartDate(''); setVisitEndDate(''); }}
                            className="text-sm font-bold text-muted-foreground hover:text-rose-500 transition-colors">{t.resetFilters}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="overflow-x-auto">
                  <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-muted text-muted-foreground text-sm uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">{t.patient}</th>
                        <th className="px-6 py-4 font-semibold">{t.service}</th>
                        <th className="px-6 py-4 font-semibold">{t.company}</th>
                        <th className="px-6 py-4 font-semibold">{t.date}</th>
                        <th className="px-6 py-4 font-semibold">{t.amount}</th>
                        <th className="px-6 py-4 font-semibold">{t.amountPaid}</th>
                        <th className="px-6 py-4 font-semibold">{t.balance}</th>
                        <th className="px-6 py-4 font-semibold">{t.status}</th>
                        <th className="px-6 py-4 font-semibold">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredVisits.map(visit => {
                        const balance = visit.amount - (visit.paid_amount || 0);
                        const isPartial = visit.paid_amount > 0 && visit.paid_amount < visit.amount;
                        const isPostponed = visit.is_postponed === 1;
                        return (
                          <tr key={visit.id} className="hover:bg-muted transition-colors">
                            <td className="px-6 py-4 font-medium">{visit.patient_name}</td>
                            <td className="px-6 py-4 text-primary font-medium">{visit.service_name}</td>
                            <td className="px-6 py-4 text-muted-foreground">{visit.company_name || t.direct}</td>
                            <td className="px-6 py-4 text-muted-foreground text-sm">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                            <td className="px-6 py-4 font-mono font-semibold">{visit.amount} {t.sar}</td>
                            <td className="px-6 py-4 font-mono font-semibold text-primary">{visit.paid_amount || 0} {t.sar}</td>
                            <td className="px-6 py-4 font-mono font-semibold text-rose-500">{balance} {t.sar}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                visit.is_paid ? 'bg-secondary text-primary' :
                                isPostponed ? 'bg-amber-50 text-amber-600' :
                                isPartial ? 'bg-ct-blue-50 text-ct-blue-500' : 'bg-muted text-muted-foreground'
                              }`}>
                                {visit.is_paid ? <CheckCircle2 size={12} /> : isPostponed ? <Clock size={12} /> : isPartial ? <Clock size={12} /> : <XCircle size={12} />}
                                {visit.is_paid ? t.paid : isPostponed ? t.paymentPostponed : isPartial ? t.partialPayment : t.pending}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {!visit.is_paid && (
                                  <>
                                    <button onClick={() => {
                                      const amount = prompt(t.enterAmount);
                                      if (amount) handleTogglePaid(visit.id, visit.is_paid, parseFloat(amount));
                                    }} className="text-[10px] font-bold px-2 py-1 bg-secondary text-primary rounded-lg hover:opacity-80">{t.partial}</button>
                                    {!isPostponed && (
                                      <button onClick={() => handlePostponeVisit(visit.id)}
                                        className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded-lg hover:opacity-80">{t.postpone}</button>
                                    )}
                                  </>
                                )}
                                <button onClick={() => handleTogglePaid(visit.id, visit.is_paid)}
                                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                                    visit.is_paid ? 'text-muted-foreground hover:text-amber-600' : 'text-primary hover:bg-secondary'
                                  }`}>{visit.is_paid ? t.undo : t.confirm}</button>
                                <button onClick={() => setEditingVisit(visit)} className="text-xs font-bold text-muted-foreground hover:text-primary">{t.edit}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Companies */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">{t.fromDate}</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-xl outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">{t.toDate}</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-xl outline-none" />
                </div>
                <div className="bg-secondary text-primary px-4 py-2 rounded-xl text-sm font-bold">{t.periodStats}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map(company => {
                  const cStats = companyStats.find(s => s.company_name === company.name);
                  return (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={company.id}
                      className="bg-card p-6 rounded-3xl border border-border shadow-sm relative group">
                      <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary mb-4">
                        <Building2 size={24} />
                      </div>
                      <h4 className="text-lg font-bold mb-1">{company.name}</h4>
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.patientCount}:</span>
                          <span className="font-bold text-primary">{cStats?.patient_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.visitCount}:</span>
                          <span className="font-bold">{cStats?.visit_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                          <span className="text-muted-foreground">{t.totalAmount}:</span>
                          <span className="font-bold">{cStats?.total_amount || 0} {t.sar}</span>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex gap-2 mb-4">
                          <button onClick={() => setSelectedCompanyForReport(company)}
                            className="flex-1 bg-secondary text-primary font-bold py-2 rounded-xl hover:opacity-80 text-sm">{t.viewFullDetails}</button>
                          <button onClick={() => setEditingCompany(company)}
                            className="px-4 bg-muted text-muted-foreground font-bold py-2 rounded-xl hover:opacity-80 text-sm">{t.edit}</button>
                          <button onClick={() => {
                            if (confirm(t.confirmDeleteCompany)) {
                              const result = dataStore.deleteCompany(company.id);
                              if (result.ok) fetchData();
                              else alert(`${t.error}: ${result.error}`);
                            }
                          }} className="px-4 bg-rose-50 text-rose-500 font-bold py-2 rounded-xl hover:opacity-80 text-sm">{t.delete}</button>
                        </div>
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users size={14} /> {t.patients}
                        </h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {patients.filter(p => p.company_id === company.id).length > 0 ? (
                            patients.filter(p => p.company_id === company.id).map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                                <button onClick={() => setSelectedPatientForFile(p)} className="font-medium hover:text-primary transition-colors">{p.name}</button>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  p.status === 'active' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'
                                }`}>{p.status === 'active' ? t.active : t.inactive}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">{t.noPatientsAdded}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <ReportsSection startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate}
              companies={companies} services={services} lang={lang} />
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-bold text-lg">{t.serviceManagement}</h3>
                  <p className="text-muted-foreground text-sm">{t.serviceManagementDesc}</p>
                </div>
                <div className="p-6 space-y-6">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('serviceName') as HTMLInputElement).value;
                    dataStore.addService(name);
                    form.reset();
                    fetchData();
                  }} className="flex gap-2">
                    <input name="serviceName" required placeholder={t.enterServiceName}
                      className="flex-1 px-4 py-2 bg-muted border border-border rounded-xl outline-none focus:border-primary" />
                    <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold hover:opacity-90">{t.add}</button>
                  </form>
                  <div className="space-y-2">
                    {services.map(service => (
                      <div key={service.id} className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
                        <span className="font-medium">{service.name}</span>
                        <button onClick={() => {
                          if (confirm(t.confirmDeleteService)) { dataStore.deleteService(service.id); fetchData(); }
                        }} className="text-rose-500 hover:opacity-80 p-1"><X size={18} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Packages */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{t.packages}</h3>
                  <p className="text-muted-foreground">{t.treatmentPackagesDesc}</p>
                </div>
                <button onClick={() => setShowAddPackage(true)}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg">
                  <Plus size={20} /> {t.newPackage}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map(pkg => (
                  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={pkg.id}
                    className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPackage(pkg)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary">
                        <FileText size={24} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        pkg.used_sessions >= pkg.total_sessions ? 'bg-rose-50 text-rose-500' : 'bg-secondary text-primary'
                      }`}>{pkg.used_sessions >= pkg.total_sessions ? t.inactive : t.active}</span>
                    </div>
                    <h4 className="text-lg font-bold mb-1">{pkg.patient_name}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{pkg.service_name}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span>{t.progress}</span>
                        <span>{Math.round((pkg.used_sessions / pkg.total_sessions) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">{t.sessions}:</span>
                        <span className="font-bold">{pkg.used_sessions} / {pkg.total_sessions}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {packages.length === 0 && (
                <div className="bg-card p-12 rounded-3xl border border-border text-center">
                  <p className="text-muted-foreground italic">{t.noPackages}</p>
                </div>
              )}
            </div>
          )}

          {/* Alerts */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{t.alerts}</h3>
                  <p className="text-muted-foreground">{t.paymentAlertsDesc}</p>
                </div>
                <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold">
                  <AlertCircle size={20} />
                  <span>{dueCompanies.length} {t.dueCompaniesCount}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dueCompanies.map(company => {
                  const lastPaid = company.last_payment_date ? new Date(company.last_payment_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US') : t.neverPaid;
                  return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={company.id}
                      className="bg-card p-6 rounded-3xl border border-amber-400 shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-2 h-full bg-amber-400`} />
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                          <Clock size={24} />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          company.payment_period === 'weekly' ? 'bg-ct-blue-50 text-ct-blue-500' :
                          company.payment_period === 'monthly' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {company.payment_period === 'weekly' ? t.weeklyCycle : company.payment_period === 'monthly' ? t.monthlyCycle : t.customCycle}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mb-1">{company.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                        <Calendar size={14} /> {t.lastPayment}: {lastPaid}
                      </p>
                      <p className="text-sm text-primary font-bold mb-4 flex items-center gap-1">
                        <DollarSign size={14} /> {t.amountDueSoFar}: {company.amountDue?.toLocaleString()} {t.sar}
                      </p>
                      <div className="space-y-3">
                        <button onClick={() => handleMarkCompanyPaid(company)}
                          className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
                          <CheckCircle2 size={18} /> {t.confirmPayment}
                        </button>
                        <button onClick={() => setSelectedCompanyForReport(company)}
                          className="w-full bg-muted text-muted-foreground font-bold py-2.5 rounded-xl hover:opacity-80">{t.viewDetailsInvoices}</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {dueCompanies.length === 0 && (
                <div className="bg-card p-12 rounded-3xl border border-border text-center">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-xl font-bold">{t.noDuePayments}</h4>
                  <p className="text-muted-foreground">{t.allCommitted}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddPatient && <Modal title={t.newPatient} onClose={() => setShowAddPatient(false)}>
          <AddPatientForm companies={companies} onSuccess={() => { setShowAddPatient(false); fetchData(); }} lang={lang} />
        </Modal>}
        {editingPatient && <Modal title={t.edit} onClose={() => setEditingPatient(null)}>
          <AddPatientForm companies={companies} initialData={editingPatient} onSuccess={() => { setEditingPatient(null); fetchData(); }} lang={lang} />
        </Modal>}
        {showAddVisit && <Modal title={t.newVisit} onClose={() => setShowAddVisit(false)}>
          <AddVisitForm patients={patients} services={services} onSuccess={(nav) => { setShowAddVisit(false); fetchData(); if (nav === 'packages') setActiveTab('packages'); }} lang={lang} />
        </Modal>}
        {editingVisit && <Modal title={t.edit} onClose={() => setEditingVisit(null)}>
          <AddVisitForm patients={patients} services={services} initialData={editingVisit} onSuccess={() => { setEditingVisit(null); fetchData(); }} lang={lang} />
        </Modal>}
        {showAddCompany && <Modal title={t.newCompany} onClose={() => setShowAddCompany(false)}>
          <AddCompanyForm onSuccess={() => { setShowAddCompany(false); fetchData(); }} lang={lang} />
        </Modal>}
        {editingCompany && <Modal title={t.edit} onClose={() => setEditingCompany(null)}>
          <AddCompanyForm initialData={editingCompany} onSuccess={() => { setEditingCompany(null); fetchData(); }} lang={lang} />
        </Modal>}
        {showAddPackage && <Modal title={t.newPackage} onClose={() => setShowAddPackage(false)}>
          <AddPackageForm patients={patients} services={services} onSuccess={() => { setShowAddPackage(false); fetchData(); }} lang={lang} />
        </Modal>}
        {selectedPackage && <Modal title={t.viewFullDetails} onClose={() => setSelectedPackage(null)}>
          <PackageDetails pkg={selectedPackage} onUpdate={fetchData} lang={lang} />
        </Modal>}
        {selectedCompanyForReport && <Modal title={`${t.performanceReport}: ${selectedCompanyForReport.name}`} onClose={() => setSelectedCompanyForReport(null)} maxWidth="max-w-xl">
          <CompanyReport company={selectedCompanyForReport} onMarkPaid={(amount) => { handleMarkCompanyPaid(selectedCompanyForReport, amount); setSelectedCompanyForReport(null); }} lang={lang} />
        </Modal>}
        {selectedPatientForFile && <Modal title={t.medicalFile} onClose={() => setSelectedPatientForFile(null)}>
          <PatientFile patient={selectedPatientForFile} services={services} onAddVisit={() => {
            setEditingVisit({ id: 0, patient_id: selectedPatientForFile.id, patient_name: selectedPatientForFile.name, service_id: 0, service_name: '', visit_date: new Date().toISOString().split('T')[0], amount: 0, paid_amount: 0, is_paid: 0, notes: '' } as Visit);
            setSelectedPatientForFile(null);
          }} lang={lang} />
        </Modal>}
      </AnimatePresence>
    </div>
  );
}

// Reports Section Component
function ReportsSection({ startDate, endDate, setStartDate, setEndDate, companies, services, lang }: {
  startDate: string; endDate: string; setStartDate: (v: string) => void; setEndDate: (v: string) => void;
  companies: Company[]; services: Service[]; lang: 'ar' | 'en';
}) {
  const t = translations[lang];
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');

  const companyStatsData = dataStore.getCompanyStats(startDate, endDate, selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined);
  const visitsData = dataStore.getVisits({ start_date: startDate, end_date: endDate, company_id: selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined });

  const totalAmount = companyStatsData.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
  const totalVisitsCount = companyStatsData.reduce((sum: number, s: any) => sum + (s.visit_count || 0), 0);
  const totalPatients = companyStatsData.reduce((sum: number, s: any) => sum + (s.patient_count || 0), 0);

  const exportToExcel = () => {
    const data = viewType === 'summary' ? companyStatsData.map((s: any) => ({
      [t.company]: s.company_name,
      [t.totalPatients]: s.patient_count,
      [t.totalVisits]: s.visit_count,
      [`${t.totalAmounts} (${t.sar})`]: s.total_amount || 0,
    })) : visitsData.map(v => ({
      [t.patient]: v.patient_name,
      [t.service]: v.service_name,
      [t.company]: v.company_name || t.direct,
      [t.date]: new Date(v.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US'),
      [t.amount]: v.amount,
      [t.status]: v.is_paid ? t.paid : t.pending,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.reports);
    XLSX.writeFile(wb, `${t.reports}_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex bg-muted p-1 rounded-2xl">
            <button onClick={() => setViewType('summary')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewType === 'summary' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>{t.summaryView}</button>
            <button onClick={() => setViewType('detailed')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewType === 'detailed' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>{t.detailedView}</button>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={exportToExcel}
              className="flex-1 lg:flex-none bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-lg">
              <Download size={18} /> {t.exportExcel}
            </button>
            <button onClick={() => window.print()}
              className="flex-1 lg:flex-none bg-muted text-muted-foreground px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-80">
              <Printer size={18} /> {t.printReport}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.targetCompany}</label>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl outline-none">
              <option value="all">{t.allCompanies}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.fromDate}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.toDate}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} label={t.totalPatients} value={totalPatients} color="blue" />
        <StatCard icon={TrendingUp} label={t.totalVisits} value={totalVisitsCount} color="amber" />
        <StatCard icon={DollarSign} label={t.totalAmounts} value={`${totalAmount.toLocaleString()} ${t.sar}`} color="emerald" />
      </div>

      {viewType === 'detailed' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg">{t.performanceAnalysis}</h3>
            <span className="text-sm text-muted-foreground">{t.period}: {startDate} - {endDate}</span>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead className="bg-muted text-muted-foreground text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t.patient}</th>
                  <th className="px-6 py-4 font-semibold">{t.service}</th>
                  <th className="px-6 py-4 font-semibold">{t.company}</th>
                  <th className="px-6 py-4 font-semibold">{t.date}</th>
                  <th className="px-6 py-4 font-semibold">{t.amount}</th>
                  <th className="px-6 py-4 font-semibold">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visitsData.map((v, idx) => (
                  <tr key={idx} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4 font-bold">{v.patient_name}</td>
                    <td className="px-6 py-4 text-primary">{v.service_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{v.company_name || t.direct}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(v.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-6 py-4 font-bold">{v.amount?.toLocaleString() || 0} {t.sar}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        v.is_paid ? 'bg-secondary text-primary' : 'bg-amber-50 text-amber-600'
                      }`}>{v.is_paid ? t.paid : t.pending}</span>
                    </td>
                  </tr>
                ))}
                {visitsData.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">{t.noData}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {viewType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <h4 className="font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} />
              {selectedCompany === 'all' ? t.revenueDistribution : t.performanceAnalysis}
            </h4>
            <div className="space-y-6">
              {companyStatsData.slice(0, 5).map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">{s.company_name}</span>
                    <span className="text-muted-foreground">{((s.total_amount / (totalAmount || 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(s.total_amount / (totalAmount || 1)) * 100}%` }}
                      className="bg-primary h-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <h4 className="font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="text-ct-blue-500" size={20} />
              {t.revenueByService}
            </h4>
            <div className="space-y-6">
              {services.map(service => {
                const serviceTotal = visitsData.filter(v => v.service_id === service.id).reduce((sum, v) => sum + v.amount, 0);
                const percentage = (serviceTotal / (totalAmount || 1)) * 100;
                if (serviceTotal === 0) return null;
                return (
                  <div key={service.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">{service.name}</span>
                      <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="bg-ct-blue-500 h-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import type { TabType } from '@/types/caretrack';

export function StatCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: 'emerald' | 'amber' | 'blue' }) {
  const colors = {
    emerald: 'bg-secondary text-primary',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-ct-blue-50 text-ct-blue-500',
  };

  return (
    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose, maxWidth = "max-w-md" }: { title: string; children: React.ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-card rounded-3xl shadow-2xl w-full ${maxWidth} relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h3 className="font-bold text-xl">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

export function SidebarItem({ id, icon: Icon, label, activeTab, setActiveTab, lang }: {
  id: TabType;
  icon: any;
  label: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  lang: 'ar' | 'en';
}) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id
          ? 'bg-secondary text-primary shadow-sm'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeTab === id && (
        <motion.div layoutId="active" className={lang === 'ar' ? 'mr-auto' : 'ml-auto'}>
          <ChevronRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
        </motion.div>
      )}
    </button>
  );
}

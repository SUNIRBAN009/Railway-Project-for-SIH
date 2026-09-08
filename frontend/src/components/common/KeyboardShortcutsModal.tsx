import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketStore } from '../../stores/socketStore';
import { DEMO_BLOCKS } from '../../services/demoData';
import { printCorridorDailyPossessionSheet } from '../../utils/exportPdf';
import {
  Keyboard,
  X,
  Compass,
  LayoutDashboard,
  Tv,
  Wrench,
  Zap,
  Radio,
  FileDown,
  AlertTriangle,
} from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const triggerDemoEmergency = useSocketStore((state) => state.triggerDemoEmergency);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input, textarea, or select
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'c' || e.key === 'C') {
        navigate('/coa');
      } else if (e.key === 'm' || e.key === 'M') {
        navigate('/map');
      } else if (e.key === 'b' || e.key === 'B') {
        navigate('/bigscreen');
      } else if (e.key === 'e' || e.key === 'E') {
        navigate('/eng');
      } else if (e.key === 't' || e.key === 'T') {
        navigate('/trd');
      } else if (e.key === 's' || e.key === 'S') {
        navigate('/snt');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        printCorridorDailyPossessionSheet(DEMO_BLOCKS);
      } else if (e.key === 'x' || e.key === 'X') {
        // Quick trigger for demo emergency alert during presentation
        triggerDemoEmergency();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, triggerDemoEmergency]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'C', label: 'Central Operating Console (COA)', icon: LayoutDashboard },
    { key: 'M', label: '3D Spatial GIS Digital Twin', icon: Compass },
    { key: 'B', label: '4K Panoramic Wallboard Mode', icon: Tv },
    { key: 'E', label: 'Civil Engineering Console (P-Way)', icon: Wrench },
    { key: 'T', label: 'Traction Distribution Console (OHE)', icon: Zap },
    { key: 'S', label: 'Signal & Telecom Console (S&T)', icon: Radio },
    { key: 'P', label: 'Print Daily Possession Bulletin (PDF)', icon: FileDown },
    { key: 'X', label: 'Simulate Critical USFD Flaw (Emergency)', icon: AlertTriangle },
    { key: 'Esc', label: 'Close Active Overlays / Modals', icon: X },
    { key: '?', label: 'Toggle This Shortcut Cheatsheet', icon: Keyboard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-control-border rounded-2xl shadow-2xl overflow-hidden font-mono">
        <div className="border-b border-control-border px-6 py-4 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Keyboard className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-white">Keyboard Navigation Cheatsheet</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-control-muted hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 divide-y divide-slate-800/80 max-h-[70vh] overflow-y-auto">
          {shortcuts.map(({ key, label, icon: Icon }) => (
            <div key={key} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-slate-300">
                <Icon className="w-4 h-4 text-cyan-400/80" />
                <span>{label}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-950 border border-control-border text-cyan-300 font-bold text-xs shadow-inner">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-control-border text-center text-[11px] text-control-muted">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px]">?</kbd> at any time to display this panel.
        </div>
      </div>
    </div>
  );
};

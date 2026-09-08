import React, { useState } from 'react';
import { MessageSquare, Send, User, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface ChatMessage {
  id: string;
  sender: string;
  department: string;
  role: string;
  text: string;
  timestamp: string;
}

export const DepartmentChatRoom: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'Rajesh Kumar',
      department: 'ENG',
      role: 'SSE / Permanent Way',
      text: 'CSM-092 tamper stationed at Sahibabad yard. All gang safety briefings completed. Awaiting COA block authority.',
      timestamp: '01:15 IST',
    },
    {
      id: 'msg-2',
      sender: 'M. S. Raghavan',
      department: 'TRD',
      role: 'SSE / Traction Power',
      text: 'PTW-TRD-441 issued. Discharge rods placed at KM 14.0 and 15.5. 25kV catenary is completely earthed.',
      timestamp: '01:25 IST',
    },
    {
      id: 'msg-3',
      sender: 'Chief Controller DLI',
      department: 'OPERATIONS',
      role: 'COA Central Command',
      text: 'Possession authority granted for BLK-ENG-NDLS-01. Window active until 04:30 IST. Dibrugarh Rajdhani cleared via down line.',
      timestamp: '01:30 IST',
    },
    {
      id: 'msg-4',
      sender: 'Pooja Verma',
      department: 'SNT',
      role: 'SSE / Signals',
      text: 'Point 104A/B detection overhaul commenced. S&T shadow possession synchronized.',
      timestamp: '02:15 IST',
    },
  ]);

  const [inputText, setInputText] = useState('');

  const quickDispatches = [
    '25kV Power Cutoff Enacted',
    'Track Clear of Men & Materials',
    'Caution Order 30 km/h Enacted',
    'Emergency USFD Clamping in Progress',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Controller',
      department: user?.department_code || 'OPERATIONS',
      role: user?.role || 'CHIEF_CONTROLLER',
      text: text.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');
  };

  const getDeptColor = (dept: string) => {
    switch (dept) {
      case 'ENG':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      case 'TRD':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'SNT':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      default:
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4 flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-control-border pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Division Inter-Department Dispatch Channel
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Direct operational comms between COA, P-Way, TRD Power & S&T Cabins
          </p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-mono">
        {messages.map((m) => (
          <div key={m.id} className="p-3 rounded-xl bg-control-bg/80 border border-control-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{m.sender}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${getDeptColor(m.department)}`}>
                  {m.department}
                </span>
                <span className="text-[10px] text-control-muted hidden sm:inline">({m.role})</span>
              </div>
              <span className="text-[10px] text-control-muted">{m.timestamp}</span>
            </div>
            <p className="text-slate-200 font-sans leading-relaxed pt-0.5">{m.text}</p>
          </div>
        ))}
      </div>

      {/* Quick Dispatch Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 font-mono text-[10px]">
        {quickDispatches.map((qd, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(qd)}
            className="px-2.5 py-1 rounded-md border border-control-border bg-control-bg text-control-muted hover:text-cyan-300 hover:border-cyan-500/40 transition shrink-0"
          >
            + {qd}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 pt-2 border-t border-control-border shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Transmit priority message to division terminals..."
          className="flex-1 px-3 py-2 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:outline-none focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-950"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

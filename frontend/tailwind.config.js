/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Control Room Foundations
        'control-bg': '#0a0e1a',
        'control-panel': '#111827',
        'control-border': '#1f2937',
        'control-text': '#e5e7eb',
        'control-muted': '#6b7280',

        // Railway Operational Theme Palette
        'railway-navy': '#0b1120',
        'railway-slate': '#1e293b',
        'railway-panel': '#0f172a',

        // Operational Status Tokens
        'status-free': '#00ff88',
        'status-blocked': '#ff4444',
        'status-pending': '#ffaa00',
        'status-emergency': '#ff0066',
        'status-sanctioned': '#10b981',
        'status-conflict': '#f43f5e',
        'status-shadow': '#06b6d4',
        'status-caution': '#f59e0b',

        // Department Accent Colors
        'dept-eng': '#3b82f6',
        'dept-trd': '#f59e0b',
        'dept-snt': '#10b981',
        'dept-coa': '#8b5cf6',
        'dept-ops': '#14b8a6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

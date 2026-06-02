/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Base
        base: {
          950: '#09090b',
          900: '#0f0f14',
          800: '#16161f',
          700: '#1e1e2a',
          600: '#252535',
          500: '#2e2e40',
        },
        // Borders
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
        },
        // Indigo primary
        indigo: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Cyan for AI
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Emerald for online status
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        // Text
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      animation: {
        'fade-in':      'fadeIn 0.15s ease-out',
        'slide-up':     'slideUp 0.2s ease-out',
        'pulse-slow':   'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'message-in':   'messageIn 0.2s ease-out',
        'scale-in':     'scaleIn 0.15s ease-out',
        'badge-pop':    'badgePop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'reaction-pop': 'reactionPop 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(6px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        messageIn: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        badgePop: {
          from: { transform: 'scale(0)' },
          to:   { transform: 'scale(1)' },
        },
        reactionPop: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

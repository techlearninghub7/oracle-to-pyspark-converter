/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system - dark industrial theme
        bg: {
          base: '#0a0b0e',
          surface: '#0f1117',
          elevated: '#161820',
          border: '#1e2130',
          hover: '#1a1d29',
        },
        accent: {
          primary: '#f97316',  // Orange
          secondary: '#fb923c',
          muted: '#7c3aed',
          glow: 'rgba(249, 115, 22, 0.15)',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#8b8fa8',
          muted: '#4a4e66',
          accent: '#f97316',
        },
        status: {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
        oracle: '#c0392b',
        spark: '#e25a1c',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'stream': 'stream 0.3s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px rgba(249, 115, 22, 0.3)' },
          to: { boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' },
        },
        stream: {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

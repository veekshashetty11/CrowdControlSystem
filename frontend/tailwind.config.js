/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0f1a",
          surface: "#111827",
          blue: "#3B82F6",
          green: "#10B981",
          orange: "#F59E0B",
          red: "#EF4444",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 12px rgba(59, 130, 246, 0.4)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 12px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 16px rgba(239, 68, 68, 0.5)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-red': 'pulseRed 2s infinite',
      },
      keyframes: {
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}

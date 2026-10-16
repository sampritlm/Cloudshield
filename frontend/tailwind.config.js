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
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c2d9ec',
          300: '#94bfe0',
          400: '#5e9ed0',
          500: '#387fc1',
          600: '#2665a5',
          700: '#1d5186',
          800: '#0f2942',
          900: '#0a1929',
          950: '#060f19',
        },
        navy: {
          950: '#07101d',
          900: '#0b192c',
          800: '#1e3e62',
          700: '#1e293b',
        },
        severity: {
          low: '#0284c7',       // Sky blue
          medium: '#d97706',    // Amber
          high: '#ea580c',      // Orange
          critical: '#dc2626',  // Deep Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF8F3',
          shade: '#F2EFE7',
          tint: '#FFFDF8',
        },
        ink: {
          DEFAULT: '#1C1B1A',
          soft: '#3A3835',
          muted: '#6B6862',
        },
        rule: '#D8D5CC',
        redink: {
          DEFAULT: '#B23A2E',
          dark: '#8F2E24',
          soft: '#E8CFCB',
        },
        verified: {
          DEFAULT: '#3F5D3F',
          soft: '#D4DFCF',
        },
        amber: {
          DEFAULT: '#A67C2E',
          soft: '#EDE3CC',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        ledger: '1180px',
        prose: '680px',
      },
      boxShadow: {
        page: '0 1px 2px rgba(28,27,26,0.04), 0 12px 28px -8px rgba(28,27,26,0.12)',
        card: '0 1px 3px rgba(28,27,26,0.06), 0 4px 12px -4px rgba(28,27,26,0.08)',
        hairline: '0 0 0 1px #D8D5CC',
      },
      keyframes: {
        'stroke-draw': {
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'stroke-draw': 'stroke-draw 1.1s ease-out forwards',
      },
    },
  },
  plugins: [],
};

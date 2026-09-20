import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14121F',       // primary text — indigo-tinted near-black, not pure black
        paper: '#FBFAFE',     // page background — faint violet-white
        surface: '#FFFFFF',   // cards / panels
        line: '#E7E4F2',      // hairline borders
        muted: '#6E6A85',     // secondary text
        brand: {
          DEFAULT: '#6D5EF0',
          dark: '#5647D6',
          light: '#EDEBFD',
        },
        success: '#1E9E6B',
        warn: '#D64545',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      fontFeatureSettings: {
        tabular: '"tnum" 1',
      },
    },
  },
  plugins: [],
};
export default config;

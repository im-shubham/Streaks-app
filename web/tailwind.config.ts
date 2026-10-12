import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#000', coal: '#0b0b0c', char: '#151517', edge: '#26262a', mute: '#8a8a93', lime: { DEFAULT: '#c6ff3d', dim: '#8fbf1f' } },
      fontFamily: { sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;

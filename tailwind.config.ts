import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dofree: {
          red: '#e50914',
          dark: '#050505',
          panel: '#101010',
        },
      },
      boxShadow: {
        glow: '0 0 50px rgba(229, 9, 20, 0.28)',
      },
    },
  },
  plugins: [],
};

export default config;

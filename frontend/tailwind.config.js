/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 40px rgba(45, 212, 191, 0.12)',
        purple: '0 0 40px rgba(168, 85, 247, 0.14)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#4f46e5',
          DEFAULT: '#4338ca',
          dark: '#312e81',
        },
      },
    },
  },
  plugins: [],
};


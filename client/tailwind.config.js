/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#0070f3',
          600: '#0056d1',
        },
        gray: {
          900: '#111827',
          700: '#374151', 
          500: '#6b7280', 
        }
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1A1A1A',
          background: '#F9F7F2',
          accentNavy: '#2D3E50',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '12px',
        xl: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

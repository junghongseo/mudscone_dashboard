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
          mudscone: {
            50: '#fdf8f6',
            100: '#f2e8e5',
            500: '#8c533e',
            600: '#733e2b',
            700: '#5a2d1d',
          },
          oatter: {
            50: '#fefce8',
            100: '#fef9c3',
            500: '#ca8a04',
            600: '#a16207',
            700: '#854d0e',
          },
          wysh: {
            50: '#f0fdf4',
            100: '#dcfce7',
            500: '#16a34a',
            600: '#15803d',
            700: '#166534',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

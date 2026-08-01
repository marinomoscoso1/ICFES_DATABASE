/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0b0b0d',
          900: '#111114',
          800: '#17171c',
          700: '#232329',
          600: '#33333c',
        },
      },
    },
  },
  plugins: [],
}

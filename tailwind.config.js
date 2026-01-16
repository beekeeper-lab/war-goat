/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f7f7f2',
          100: '#edeee3',
          200: '#d9dbc6',
          300: '#c0c3a0',
          400: '#a5a878',
          500: '#8b8e58',
          600: '#6f7246',
          700: '#565839',
          800: '#47482f',
          900: '#3c3d2a',
          950: '#1f2014',
        },
        tactical: {
          tan: '#d4b896',
          khaki: '#c3b091',
          sand: '#e6d5b8',
        }
      },
    },
  },
  plugins: [],
}

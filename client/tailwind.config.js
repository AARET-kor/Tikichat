/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mocha: {
          50:  '#FAF6F3',
          100: '#F5EDE8',
          200: '#E5CFC5',
          300: '#C4A090',
          400: '#B08070',
          500: '#A47764',
          600: '#8A6050',
          700: '#7A5545',
          800: '#5C3D30',
          900: '#3A2018',
          950: '#1C0F0A',
        },
        sage: {
          50:  '#E4F2EF',
          100: '#C4E0DA',
          200: '#9FC5BD',
          300: '#7AB0A8',
          400: '#5A9F90',
          500: '#5A8F80',
          600: '#4A7A6C',
          700: '#3A6358',
          800: '#2A4C44',
          900: '#1A3530',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'marquee': 'marquee 25s linear infinite',
        'slideInRight': 'slideInRight 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

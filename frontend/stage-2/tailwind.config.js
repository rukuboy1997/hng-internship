/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['League Spartan', 'sans-serif'],
      },
      colors: {
        purple: {
          DEFAULT: '#7C5DFA',
          light: '#9277FF',
        },
        navy: {
          DEFAULT: '#141625',
          medium: '#1E2139',
          light: '#252945',
          muted: '#DFE3FA',
          'muted-dark': '#494E6E',
        },
        gray: {
          DEFAULT: '#888EB0',
          light: '#DFE3FA',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.4s ease',
        'fade-in': 'fadeIn 0.2s ease',
        'scale-in': 'scaleIn 0.2s ease',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

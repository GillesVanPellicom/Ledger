/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FFFFFF',
          dark: '#000000',
        },
        accent: {
          DEFAULT: '#007AFF', // macOS Blue
          hover: '#0062C4',
        },
        danger: {
          DEFAULT: '#FF3B30',
          hover: '#D73329',
        }
      }
    },
  },
  plugins: [],
}

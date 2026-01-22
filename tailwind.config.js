const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        first: "moveVertical 30s ease infinite",
        second: "moveInCircle 20s reverse infinite",
        third: "moveInCircle 40s linear infinite",
        fourth: "moveHorizontal 40s ease infinite",
        fifth: "moveInCircle 20s ease infinite",
      },
      keyframes: {
        moveHorizontal: {
          "0%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
          "50%": {
            transform: "translateX(50%) translateY(10%)",
          },
          "100%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
        },
        moveInCircle: {
          "0%": {
            transform: "rotate(0deg)",
          },
          "50%": {
            transform: "rotate(180deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
        moveVertical: {
          "0%": {
            transform: "translateY(-50%)",
          },
          "50%": {
            transform: "translateY(50%)",
          },
          "100%": {
            transform: "translateY(-50%)",
          },
        },
      },
      colors: {
        // Replace the default gray with zinc for a more neutral dark theme
        gray: colors.zinc,
        bg: {
          DEFAULT: 'var(--color-bg)',
          2: 'var(--color-bg-2)',
          modal: 'var(--color-bg-modal)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent)', // We might want to compute a hover color or use opacity
        },
        font: {
          1: 'var(--color-font-1)',
          2: 'var(--color-font-2)',
        },
        field: {
          DEFAULT: 'var(--color-field)',
          disabled: 'var(--color-field-disabled)',
          hover: 'var(--color-field-hover)',
        },
        blue: {
          DEFAULT: 'var(--color-blue)',
        },
        green: {
          DEFAULT: 'var(--color-green)',
        },
        red: {
          DEFAULT: 'var(--color-red)',
        },
        yellow: {
          DEFAULT: 'var(--color-yellow)',
        },
        hyperlink: {
          DEFAULT: 'var(--color-hyperlink)',
        },
        text: {
          disabled: 'var(--color-text-disabled)',
        },
        danger: {
          DEFAULT: 'var(--color-red)',
          hover: 'var(--color-red)', // Simplified for now
        }
      }
    },
  },
  plugins: [],
}

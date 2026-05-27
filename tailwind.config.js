/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        todde: {
          DEFAULT: '#852136',
          light: '#a23d52',
          dark: '#621a2a',
        },
      },
    },
  },
  plugins: [],
}
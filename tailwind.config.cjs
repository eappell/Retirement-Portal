/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './apps/portal/app/**/*.{ts,tsx,js,jsx}',
    './apps/portal/components/**/*.{ts,tsx,js,jsx}',
    './apps/portal/pages/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

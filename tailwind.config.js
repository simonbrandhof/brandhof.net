/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,njk}', './src/*.{html,njk}', '.eleventy.js'],
  theme: {
    extend: {
      colors: {
        'ghost-white': '#f8f8ff'
      },
    },
  },
  plugins: [
		require('@tailwindcss/typography')
	],
}

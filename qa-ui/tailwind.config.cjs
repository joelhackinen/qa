/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			screens: {
				xs: '480px',
			},
			blur: {
				xs: '1px',
			},
			fontSize: {
				xxs: ['10px', '14px'],
			},
		},
	},
	plugins: [],
}

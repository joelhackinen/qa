/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			keyframes: {
				wiggle: {
					'0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
				},
			},
			animation: {
				wiggle: 'wiggle 0.2s ease-in-out',
				shake: 'bounce 0.5s ease-in-out',
			},
		},
	},
	plugins: [],
}

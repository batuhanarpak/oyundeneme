/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* Point the font utilities at the design tokens so `font-mono` and
         `font-serif` resolve to the faces `next/font` actually loaded.
         Without this, `font-mono` fell back to a generic monospace stack and
         the serif face was never reachable from a class at all. */
      fontFamily: {
        sans: 'var(--font-sans)',
        serif: 'var(--font-serif)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
}

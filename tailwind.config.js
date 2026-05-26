/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Sleek chart colors (harmonious, premium palette)
        lane: {
          green: '#10b981',
          red: '#f43f5e',
          yellow: '#fbbf24',
          blue: '#3b82f6',
          orange: '#f97316',
        },
        dark: {
          bg: '#09090b',       // zinc-950
          panel: '#18181b',    // zinc-900
          border: '#27272a',   // zinc-800
          text: '#f4f4f5',     // zinc-100
          muted: '#71717a'     // zinc-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Black and Charcoal shades
        charcoal: {
          950: '#050505', // Pure deep obsidian
          900: '#0A0A0A', // Dark matte black
          850: '#111111', // Obsidian surface
          800: '#171717', // Neutral black tile
          750: '#1F1F1F', // Deep graphite
          700: '#262626', // Graphite border
          650: '#303030', // Medium graphite
          600: '#3D3D3D', // Slate gray
          500: '#525252', // Cool gray
          400: '#737373', // Light graphite
        },
        // Refined Gray & Silver monochrome accents
        silver: {
          100: '#F5F5F5', // Bright platinum
          200: '#E5E5E5', // Crisp silver
          300: '#D4D4D4', // Metallic silver
          400: '#A3A3A3', // Muted silver
          500: '#737373', // Gray text
        },
        accent: {
          white: '#FFFFFF',
          silver: '#E5E5E5',
          graphite: '#2E2E2E',
          zinc: '#A1A1AA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'window': '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'dock': '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow-silver': '0 0 20px rgba(255, 255, 255, 0.2)',
        'glow-subtle': '0 0 15px rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
}

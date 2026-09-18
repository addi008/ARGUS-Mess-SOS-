/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MeshSOS brand palette — dark command-centre aesthetic
        brand: {
          900: '#0a0f1e', // deepest background
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
          accent: '#ef4444', // SOS red
          safe:   '#22c55e', // "I'm safe" green
          warn:   '#f59e0b', // assigned/in-progress amber
          info:   '#3b82f6', // coordinator blue
        },
      },
    },
  },
  plugins: [],
}

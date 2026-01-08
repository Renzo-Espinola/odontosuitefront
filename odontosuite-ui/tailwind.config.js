/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          blue: "#1e88e5",
          green: "#22c55e",
          violet: "#7c3aed",
        },
      },
    },
  },
  plugins: [],
}

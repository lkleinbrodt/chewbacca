module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Define custom colors for the app
        primary: {
          light: "#6CBDE7",
          DEFAULT: "#1C96E1",
          dark: "#0E73BC",
        },
        secondary: "#F9A826",
        background: "#F5F7FA",
        chewy: "#6366F1", // Color for Chewy-managed tasks
        work: "#F87171", // Color for work calendar events
      },
    },
  },
  plugins: [],
};

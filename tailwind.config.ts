import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kemenag: {
          50: "#F2F9F5",
          100: "#DCF2E6",
          200: "#B8E4CD",
          500: "#008A52",
          600: "#006B3F",
          700: "#005532",
          800: "#004227",
          900: "#002E1B",
        },
        gold: {
          50: "#FEFCE8",
          100: "#FEF3C7",
          400: "#E5B93A",
          500: "#D4AF37",
          600: "#B59021",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

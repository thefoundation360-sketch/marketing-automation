import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Foundation Mecca brand palette — black & gold, dark themed
        mecca: {
          gold: "#D4AF37",
          goldsoft: "#C9A227",
          goldmuted: "#8C7A2B",
          black: "#0A0A0C",
          ink: "#0E0E12",
          panel: "#141419",
          card: "#1A1A21",
          cardhover: "#21212A",
          border: "#2A2A34",
          muted: "#8B8B99",
          mist: "#F5F4F0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

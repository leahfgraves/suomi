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
        forest: "#0f2419",
        surface: "#1a3a2e",
        mint: "#4ecb8d",
        gold: "#e8b84b",
        wrong: "#e05c5c",
        cream: "#f0ede6",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        dm: ["var(--font-dm-sans)", "sans-serif"],
      },
      screens: {
        xs: "375px",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
        flash: {
          "0%": { backgroundColor: "transparent" },
          "30%": { backgroundColor: "rgba(78,203,141,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        flash: "flash 0.5s ease-out",
        "pulse-slow": "pulse 2s ease-in-out infinite",
        "fade-in": "fade-in 0.25s ease-out",
        pop: "pop 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

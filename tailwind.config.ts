import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // ATHAR "حبر وورق" (ink & paper) system: warm paper neutrals, one deep green, clay as the single accent.
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
        display: ["var(--font-kufi)", "var(--font-plex)", "serif"],
      },
      colors: {
        // the neutral scale is warmed (paper → ink) so every existing slate-* class follows the identity
        slate: {
          50: "#F6F3EC", 100: "#EEEAE1", 200: "#E2DCCF", 300: "#CDC5B4", 400: "#A1998A",
          500: "#78736A", 600: "#5B5A52", 700: "#3E433D", 800: "#27302B", 900: "#14201B", 950: "#0C1511",
        },
        brand: {
          50: "#EEF6F1", 100: "#D6EADF", 200: "#ADD4BF", 300: "#7DB99A", 400: "#4A9874",
          500: "#237A56", 600: "#146846", 700: "#0F5539", 800: "#0C432E", 900: "#0A3524",
        },
        emerald: {
          50: "#EEF6F1", 100: "#D6EADF", 200: "#ADD4BF", 300: "#7DB99A", 400: "#4A9874",
          500: "#237A56", 600: "#146846", 700: "#0F5539", 800: "#0C432E", 900: "#0A3524", 950: "#06231A",
        },
        clay: {
          50: "#FBF1EC", 100: "#F5DCCF", 200: "#EBB89F", 300: "#DE906C", 400: "#CF6E44",
          500: "#B6532C", 600: "#9A4223", 700: "#7C351D", 800: "#5E2916", 900: "#421D10",
        },
        ink: "#14201B",
        paper: "#F6F3EC",
      },
      borderRadius: { lg: "0.5rem", xl: "0.625rem", "2xl": "0.75rem", "3xl": "1rem" },
      boxShadow: {
        sm: "0 1px 0 rgba(20,32,27,0.05)",
        DEFAULT: "0 1px 2px rgba(20,32,27,0.06)",
        md: "0 2px 6px -2px rgba(20,32,27,0.10)",
        lg: "0 8px 24px -10px rgba(20,32,27,0.18)",
        xl: "0 14px 36px -14px rgba(20,32,27,0.22)",
        "2xl": "0 22px 50px -18px rgba(20,32,27,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scan: {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        stamp: {
          "0%": { transform: "scale(1.6) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(0.95) rotate(-3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
        },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.2" } },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.2,0.6,0.4,1) infinite",
        shimmer: "shimmer 1.8s linear infinite",
        scan: "scan 1.1s ease-in-out infinite",
        "slide-in": "slide-in 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        radar: "radar 3s linear infinite",
        stamp: "stamp 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
      colors: {
        border: "rgba(212, 175, 55, 0.2)",
        input: "rgba(212, 175, 55, 0.1)",
        ring: "#d4af37",
        background: "#0a0a0a",
        foreground: "#f5f5f7",
        gold: {
          light: "#f3e5ab",
          DEFAULT: "#d4af37",
          dark: "#b58920",
          deep: "#8a6623",
          muted: "rgba(212, 175, 55, 0.15)",
        },
        luxury: {
          black: "#0e0e10",
          dark: "#1c1c1e",
          gray: "#2c2c2e",
          light: "#efeff4",
        }
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(15px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(15px)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "gold-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(212, 175, 55, 0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.6)" },
        }
      },
      animation: {
        "fade-in": "fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-out": "fade-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "gold-glow": "gold-glow 3s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

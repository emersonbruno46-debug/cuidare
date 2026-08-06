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
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
      colors: {
        border: "rgba(169, 141, 124, 0.2)",
        input: "rgba(169, 141, 124, 0.1)",
        ring: "#C8A45D",
        background: "#FFF8F2",
        foreground: "#2E1B13",
        white: "#2E1B13", // Map white to dark brown
        black: "#FFF8F2", // Map black to cream
        gold: {
          light: "#EDD9A3",
          DEFAULT: "#C8A45D",
          dark: "#D9B87A",
          deep: "#4B342B",
          muted: "rgba(200, 164, 93, 0.15)",
        },
        luxury: {
          black: "#2E1B13",  // Gizelly primary text
          dark: "#F4EDE4",   // light background card
          gray: "#5C3D30",   // Gizelly body text
          light: "#FFF8F2",  // cream background
        },
        gray: {
          50: "#FFFDFB",
          100: "#FAF4EE",
          200: "#F4EDE4", // light warm cream
          300: "#5C3D30", // Gizelly body text (brown)
          400: "#8A6658",
          500: "#9A7968", // Gizelly muted
          600: "#A98D7C",
          700: "#4B342B",
          800: "#3A2820",
          900: "#2E1B13",
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

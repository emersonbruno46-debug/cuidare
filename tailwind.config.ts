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
        sans: ['"Manrope"', 'Inter', 'sans-serif'],
      },
      colors: {
        ivory: "#F8F5F0",
        paper: "#FCFAF7",
        surface: "#FFFFFF",
        "warm-sand": "#F1EBE4",
        sand: "#E8DED2",
        champagne: {
          DEFAULT: "#C7A15D",
          dark: "#A87D37",
          soft: "#F1E6D0"
        },
        terracotta: {
          DEFAULT: "#9A6047",
          soft: "#EAD9D1"
        },
        sage: {
          DEFAULT: "#71806F",
          soft: "#E3E9E1"
        },
        taupe: "#786A61",
        espresso: "#251B17",
        "deep-espresso": "#191310",
        "text-primary": "#251B17",
        "text-secondary": "#756B65",
        "border-subtle": "rgba(37,27,23,0.10)",
        "border-strong": "rgba(37,27,23,0.16)",
        success: "#27896F",
        warning: "#C5963D",
        danger: "#D85D5D",
        // Dashboard specific tokens
        dashboard: {
          canvas: "#F7F5F1",
          sidebar: "#FCFBF9",
          surface: "#FFFFFF",
          "surface-alt": "#FBF8F4",
          border: "rgba(37,27,23,0.09)",
          text: "#29231F",
          muted: "#7C736D",
          brand: "#C7A15D",
          "brand-light": "#F1E6D0",
        },
        border: "rgba(37,27,23,0.10)",
        input: "rgba(37,27,23,0.10)",
        ring: "#C7A15D",
        background: "#F8F5F0",
        foreground: "#251B17",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
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
      },
      animation: {
        "fade-in": "fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-out": "fade-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

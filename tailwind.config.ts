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
        canvas: "#F7F4EF",
        paper: "#FCFAF7",
        surface: "#FFFFFF",
        "warm-surface": "#F2ECE5",
        sand: "#DED1C2",
        champagne: "#C6A25F",
        "gold-muted": "#B68D46",
        taupe: "#786A61",
        espresso: "#251B17",
        "deep-espresso": "#191310",
        "text-primary": "#251B17",
        "text-secondary": "#766C65",
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
          brand: "#C29B4D",
          "brand-light": "#F5ECD8",
        },
        border: "rgba(37,27,23,0.10)",
        input: "rgba(37,27,23,0.10)",
        ring: "#C6A25F",
        background: "#F7F4EF",
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

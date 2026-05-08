/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050A18",
          900: "#0A1024",
          800: "#0D1430",
          700: "#131C45",
          600: "#1A2557",
        },
        sky: {
          400: "#38BDF8",
        },
        brand: {
          500: "#2563EB",
          400: "#3B82F6",
        },
        fg: {
          DEFAULT: "#F0F4FF",
          muted: "#8B9FC4",
          dim: "#5A6E94",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quart": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-quint": "cubic-bezier(0.86, 0, 0.07, 1)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.18), 0 20px 60px -20px rgba(56,189,248,0.35), inset 0 0 40px -20px rgba(56,189,248,0.20)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(2,6,23,0.6)",
      },
      keyframes: {
        meshShift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%,-3%,0) scale(1.05)" },
        },
        meshShift2: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-3%,2%,0) scale(1.08)" },
        },
        gridPulse: {
          "0%, 100%": { opacity: "0.18" },
          "50%": { opacity: "0.28" },
        },
      },
      animation: {
        meshShift: "meshShift 14s ease-in-out infinite",
        meshShift2: "meshShift2 18s ease-in-out infinite",
        gridPulse: "gridPulse 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
          950: "#1e3a8a",
        },
        legal: {
          gold: "#c9a84c",
          darkgold: "#8b6914",
          navy: "#1a1f36",
          slate: "#2d3348",
          surface: "#f8f9fc",
          border: "#e2e5f1",
        },
        status: {
          success: "#10b981",
          error: "#ef4444",
          warning: "#f59e0b",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        serif: ['"Merriweather"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        'ui-xs': ['0.6875rem', { lineHeight: 'var(--leading-snug)', letterSpacing: '0.01em' }],
        'ui-sm': ['0.75rem', { lineHeight: 'var(--leading-normal)', letterSpacing: '0.01em' }],
        'ui-base': ['0.875rem', { lineHeight: 'var(--leading-normal)', letterSpacing: '0' }],
        'ui-lg': ['1rem', { lineHeight: 'var(--leading-normal)', letterSpacing: '0' }],
        'ui-xl': ['1.125rem', { lineHeight: 'var(--leading-normal)', letterSpacing: '0' }],
        'body-sm': ['0.875rem', { lineHeight: 'var(--leading-relaxed)', letterSpacing: '0' }],
        'body-base': ['1rem', { lineHeight: 'var(--leading-relaxed)', letterSpacing: '0' }],
        'body-lg': ['1.125rem', { lineHeight: 'var(--leading-relaxed)', letterSpacing: '0' }],
        'display-sm': ['1.5rem', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.02em' }],
        'display-base': ['2rem', { lineHeight: 'var(--leading-snug)', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: 'var(--leading-snug)', letterSpacing: '-0.03em' }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        emerald: {
          50: "hsl(var(--secondary))",
          100: "hsl(160 30% 90%)",
          500: "hsl(var(--primary))",
          600: "hsl(var(--primary))",
          700: "hsl(160 84% 22%)",
        },
        amber: {
          50: "hsl(var(--amber-bg))",
          100: "hsl(38 100% 92%)",
          400: "hsl(var(--amber-soft))",
          600: "hsl(var(--amber-text))",
          700: "hsl(38 70% 28%)",
        },
        "ct-blue": {
          50: "hsl(var(--blue-bg))",
          100: "hsl(217 100% 92%)",
          500: "hsl(var(--blue-soft))",
          600: "hsl(var(--blue-text))",
          700: "hsl(217 70% 28%)",
        },
        rose: {
          50: "hsl(var(--rose-bg))",
          500: "hsl(var(--rose-soft))",
          600: "hsl(var(--rose-text))",
        },
        slate: {
          50: "hsl(var(--muted))",
          100: "hsl(var(--border))",
          200: "hsl(var(--border))",
          400: "hsl(var(--muted-foreground))",
          500: "hsl(var(--muted-foreground))",
          600: "hsl(215 15% 40%)",
          700: "hsl(215 20% 30%)",
          800: "hsl(var(--foreground))",
          900: "hsl(var(--foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

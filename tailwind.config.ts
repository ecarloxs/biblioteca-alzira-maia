import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", soft: "hsl(var(--success-soft))" },
        warning: { DEFAULT: "hsl(var(--warning))", soft: "hsl(var(--warning-soft))" },
        info: { DEFAULT: "hsl(var(--info))", soft: "hsl(var(--info-soft))" },
        danger: { DEFAULT: "hsl(var(--danger))", soft: "hsl(var(--danger-soft))" },
        sidebar: { DEFAULT: "hsl(var(--sidebar))", foreground: "hsl(var(--sidebar-foreground))", muted: "hsl(var(--sidebar-muted))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 3px)", sm: "calc(var(--radius) - 6px)" },
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Bricolage Grotesque", "Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

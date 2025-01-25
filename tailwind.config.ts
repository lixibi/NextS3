import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgb(var(--border))",
        primary: "rgb(var(--primary))",
        "primary-hover": "rgb(var(--primary-hover))",
        secondary: "rgb(var(--secondary))",
        "secondary-hover": "rgb(var(--secondary-hover))",
        accent: "rgb(var(--accent))",
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        card: "rgb(var(--card))",
        "card-foreground": "rgb(var(--card-foreground))",
        muted: "rgb(var(--muted))",
        "muted-hover": "rgb(var(--muted-hover))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;

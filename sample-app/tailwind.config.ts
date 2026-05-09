import type { Config } from 'tailwindcss'

function withAlpha(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`
}

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--color-background-rgb'),
        card: {
          DEFAULT: withAlpha('--color-card-rgb'),
          foreground: withAlpha('--color-card-foreground-rgb'),
        },
        primary: {
          DEFAULT: withAlpha('--color-primary-rgb'),
          foreground: withAlpha('--color-primary-foreground-rgb'),
        },
        secondary: {
          DEFAULT: withAlpha('--color-secondary-rgb'),
          foreground: withAlpha('--color-secondary-foreground-rgb'),
        },
        loaned: {
          DEFAULT: withAlpha('--color-loaned-rgb'),
          foreground: withAlpha('--color-loaned-foreground-rgb'),
        },
        destructive: {
          DEFAULT: withAlpha('--color-destructive-rgb'),
          foreground: withAlpha('--color-destructive-foreground-rgb'),
        },
        success: {
          DEFAULT: withAlpha('--color-success-rgb'),
          foreground: withAlpha('--color-success-foreground-rgb'),
        },
        muted: {
          DEFAULT: withAlpha('--color-muted-rgb'),
          foreground: withAlpha('--color-muted-foreground-rgb'),
        },
        border: withAlpha('--color-border-rgb'),
        ring: withAlpha('--color-ring-rgb'),
      },
    },
  },
  plugins: [],
} satisfies Config

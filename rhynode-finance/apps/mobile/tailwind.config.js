/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#262626',
        input: '#262626',
        ring: '#10b981',
        background: '#0a0a0f',
        foreground: '#fafafa',
        primary: {
          DEFAULT: '#10b981',
          foreground: '#fafafa',
        },
        secondary: {
          DEFAULT: '#292929',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#f43f5e',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#292929',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#3b82f6',
          foreground: '#fafafa',
        },
        card: {
          DEFAULT: '#151520',
          foreground: '#fafafa',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#fafafa',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#fafafa',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
};

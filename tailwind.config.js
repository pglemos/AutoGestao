/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mx: {
          navy: '#051923',
          dark: '#031B3D',
          'dark-2': '#0F172A',
          teal: '#00A896',
          'teal-light': '#D0F5F2',
          'teal-soft': '#E6FAF7',
          // Legacy pink aliases: deprecated; mapped to brand teal.
          pink: '#00A89D',
          'pink-light': '#E6FAF7',
          action: '#00A89D',
          'action-hover': '#00857D',
          'action-light': '#E6FAF7',
          success: '#22C55E',
          'success-light': '#D1FADD',
          warning: '#F59E0B',
          'warning-light': '#FEF3C7',
          danger: '#EF4444',
          'danger-light': '#FEE2E2',
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          border: '#E5E7EB',
          divider: '#F1F5F9',
          text: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 8px 24px rgba(15, 23, 42, 0.08)',
        popover: '0 16px 40px rgba(15, 23, 42, 0.14)',
        modal: '0 24px 60px rgba(15, 23, 42, 0.22)',
        action: '0 8px 20px rgba(0, 91, 255, 0.20)',
      },
      borderRadius: {
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
}

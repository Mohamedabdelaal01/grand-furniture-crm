/** @type {import('tailwindcss').Config} */

// Wrap a bare-channel OKLCH variable so Tailwind can inject opacity
// (e.g. `bg-accent/10`). The vars live in src/index.css as "L C H".
const ok = (v) => `oklch(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Inter for Latin, Noto Sans Arabic for RTL — both loaded in index.html
        sans: ['Inter', 'Noto Sans Arabic', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ── Existing palettes — kept intact (components still use these) ──────
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        // ── New semantic theme tokens (CSS vars → light/dark aware) ───────────
        background: ok('--background'),
        foreground: ok('--foreground'),
        border:     ok('--border'),
        separator:  ok('--separator'),
        muted:      ok('--muted'),
        focus:      ok('--focus'),
        scrollbar:  ok('--scrollbar'),
        accent: {
          DEFAULT:    ok('--accent'),
          foreground: ok('--accent-foreground'),
        },
        danger: {
          DEFAULT:    ok('--danger'),
          foreground: ok('--danger-foreground'),
        },
        success: {
          DEFAULT:    ok('--success'),
          foreground: ok('--success-foreground'),
        },
        warning: {
          DEFAULT:    ok('--warning'),
          foreground: ok('--warning-foreground'),
        },
        default: {
          DEFAULT:    ok('--default'),
          foreground: ok('--default-foreground'),
        },
        surface: {
          DEFAULT:                ok('--surface'),
          foreground:             ok('--surface-foreground'),
          secondary:              ok('--surface-secondary'),
          'secondary-foreground': ok('--surface-secondary-foreground'),
          tertiary:               ok('--surface-tertiary'),
          'tertiary-foreground':  ok('--surface-tertiary-foreground'),
        },
        overlay: {
          DEFAULT:    ok('--overlay'),
          foreground: ok('--overlay-foreground'),
        },
        segment: {
          DEFAULT:    ok('--segment'),
          foreground: ok('--segment-foreground'),
        },
        field: {
          DEFAULT:     ok('--field-background'),
          foreground:  ok('--field-foreground'),
          placeholder: ok('--field-placeholder'),
          border:      'var(--field-border)', // can be `transparent` — not channel-wrapped
        },
      },
      borderRadius: {
        // Additive named tokens — does NOT override Tailwind's default `rounded`
        field: 'var(--field-radius)',
        theme: 'var(--radius)',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'soft': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}

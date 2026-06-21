import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle — flips the `.dark` class on <html> and persists the choice to
 * localStorage('theme'). The initial class is set BEFORE React mounts by the
 * inline boot script in index.html (default = dark), so there's no flash; this
 * button just keeps that state in sync and lets the user switch.
 */
const STORAGE_KEY = 'theme';

function isDarkNow() {
  return document.documentElement.classList.contains('dark');
}

const ThemeToggle = () => {
  const [dark, setDark] = useState(isDarkNow);

  // Stay in sync if the class is changed elsewhere (e.g. another tab).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const next = e.newValue ? e.newValue === 'dark' : true;
        document.documentElement.classList.toggle('dark', next);
        setDark(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
    // Keep the mobile browser chrome colour roughly aligned with the theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next ? '#0c0c14' : '#f3f4f6');
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label={dark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      className="p-2.5 bg-surface-secondary/50 hover:bg-surface-tertiary text-muted hover:text-accent rounded-xl border border-border/50 transition-all active:scale-95"
    >
      {dark
        ? <Sun  className="w-5 h-5" />
        : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;

import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const ThemeContext = createContext(null);

/* ─── colour tokens ─── */
const lightTokens = {
  bg:             '#F7F7F5',
  surface:        '#FFFFFF',
  surfaceAlt:     '#EEEDFE',
  text:           '#2C2C2A',
  textMuted:      '#6E6E6B',
  textFaint:      '#9C9C97',
  accent:         '#534AB7',
  accentHover:    '#443D9E',
  accentSubtle:   '#EEEDFE',
  sidebarBg:      '#FFFFFF',
  sidebarText:    '#2C2C2A',
  sidebarMuted:   '#6E6E6B',
  sidebarActive:  '#EEEDFE',
  sidebarBorder:  '#E8E8E5',
  border:         '#E8E8E5',
  danger:         '#D93025',
  dangerBg:       'rgba(217,48,37,.08)',
  shadow:         'rgba(0,0,0,.06)',
  shadowHeavy:    'rgba(0,0,0,.12)',
  overlay:        'rgba(0,0,0,.35)',
  topbarBg:       '#FFFFFF',
  notifDot:       '#D93025',
};

const darkTokens = {
  bg:             '#1C1C1E',
  surface:        '#242426',
  surfaceAlt:     '#26215C',
  text:           '#E5E5E3',
  textMuted:      '#9C9C97',
  textFaint:      '#6E6E6B',
  accent:         '#AFA9EC',
  accentHover:    '#C4BFFA',
  accentSubtle:   '#26215C',
  sidebarBg:      '#1C1C1E',
  sidebarText:    '#E5E5E3',
  sidebarMuted:   '#9C9C97',
  sidebarActive:  '#26215C',
  sidebarBorder:  '#333336',
  border:         '#333336',
  danger:         '#FF6B6B',
  dangerBg:       'rgba(255,107,107,.1)',
  shadow:         'rgba(0,0,0,.25)',
  shadowHeavy:    'rgba(0,0,0,.4)',
  overlay:        'rgba(0,0,0,.55)',
  topbarBg:       '#242426',
  notifDot:       '#FF6B6B',
};

const STORAGE_KEY = 'santa-ana-theme';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* noop */ }
    return 'light';
  });

  const tokens = mode === 'dark' ? darkTokens : lightTokens;
  const isDark = mode === 'dark';

  /* Persist preference */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
  }, [mode]);

  /* Set body background to prevent white flash */
  useEffect(() => {
    document.body.style.backgroundColor = tokens.bg;
    document.body.style.color = tokens.text;
    document.body.style.margin = '0';
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }, [tokens.bg, tokens.text]);

  const toggleTheme = () => setMode(m => m === 'light' ? 'dark' : 'light');

  const value = useMemo(() => ({
    mode,
    isDark,
    tokens,
    toggleTheme,
  }), [mode, isDark, tokens]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
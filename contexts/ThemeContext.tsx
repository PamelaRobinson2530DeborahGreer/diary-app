'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import localforage from 'localforage';

type Theme = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'journal-theme-preference';

// 防闪烁：服务端渲染时的初始主题检测脚本
export const ThemeScript = () => {
  const themeScript = `
    (function() {
      try {
        const savedTheme = localStorage.getItem('${THEME_STORAGE_KEY}');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        let shouldUseDark = false;

        if (savedTheme === 'dark') {
          shouldUseDark = true;
        } else if (savedTheme === 'system' || !savedTheme) {
          shouldUseDark = systemPrefersDark;
        }

        if (shouldUseDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        console.error('Theme initialization error:', e);
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // 获取系统主题偏好
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // 计算实际应用的主题
  const resolveTheme = (currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // 初始化加载主题
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = (await localforage.getItem<Theme>(THEME_STORAGE_KEY)) || 'system';
        setThemeState(savedTheme);
        const resolved = resolveTheme(savedTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setMounted(true);
      }
    };

    loadTheme();
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, theme]);

  // 应用主题到 DOM
  const applyTheme = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // 设置主题
  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      const resolved = resolveTheme(newTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);

      // 持久化到存储
      await localforage.setItem(THEME_STORAGE_KEY, newTheme);

      // 同步到 localStorage（用于防闪烁脚本）
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // 防止服务端渲染不匹配
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
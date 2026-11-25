import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

type SidebarContextType = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (val: boolean) => void;
  resetAutoCloseTimer: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
  resetAutoCloseTimer: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cpd_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAutoCloseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Auto-close after 30 seconds if the sidebar is expanded (not collapsed)
    if (!collapsed) {
      timerRef.current = setTimeout(() => {
        setCollapsedState(true);
        try {
          localStorage.setItem('cpd_sidebar_collapsed', JSON.stringify(true));
        } catch {}
      }, 30000); // 30 seconds
    }
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) {
      resetAutoCloseTimer();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [collapsed, resetAutoCloseTimer]);

  const setCollapsed = (val: boolean) => {
    setCollapsedState(val);
    try {
      localStorage.setItem('cpd_sidebar_collapsed', JSON.stringify(val));
    } catch {}
  };

  const toggle = () => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cpd_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed, resetAutoCloseTimer }}>
      {children}
    </SidebarContext.Provider>
  );
};

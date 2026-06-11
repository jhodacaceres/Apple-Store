import { createContext, useContext, useState, useRef } from 'react';

interface AdminThemeContextValue {
  isAdminDarkMode: boolean;
  setIsAdminDarkMode: (val: boolean) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({
  isAdminDarkMode: false,
  setIsAdminDarkMode: () => {},
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [isAdminDarkMode, setDark] = useState(
    () => localStorage.getItem('admin-dark-mode') === 'true',
  );
  const [sweeping, setSweeping]     = useState(false);
  const [sweepTarget, setSweepTarget] = useState(false);
  const sweepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setIsAdminDarkMode = (val: boolean) => {
    sweepTimers.current.forEach(clearTimeout);
    setSweepTarget(val);
    setSweeping(true);
    sweepTimers.current = [
      setTimeout(() => {
        localStorage.setItem('admin-dark-mode', String(val));
        setDark(val);
      }, 260),
      setTimeout(() => setSweeping(false), 600),
    ];
  };

  return (
    <AdminThemeContext.Provider value={{ isAdminDarkMode, setIsAdminDarkMode }}>
      {children}
      {sweeping && (
        <div
          className="theme-sweep fixed inset-0 z-[9999] pointer-events-none"
          style={{ background: sweepTarget ? '#0A0A0A' : '#FAFAFA' }}
        />
      )}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

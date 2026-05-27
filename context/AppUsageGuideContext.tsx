import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { AppUsageGuideModal } from '@/components/settings/AppUsageGuideModal';

type AppUsageGuideContextValue = {
  openAppUsageGuide: () => void;
  closeAppUsageGuide: () => void;
};

const AppUsageGuideContext = createContext<AppUsageGuideContextValue | null>(null);

export function AppUsageGuideProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openAppUsageGuide = useCallback(() => setVisible(true), []);
  const closeAppUsageGuide = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ openAppUsageGuide, closeAppUsageGuide }),
    [openAppUsageGuide, closeAppUsageGuide]
  );

  return (
    <AppUsageGuideContext.Provider value={value}>
      {children}
      <AppUsageGuideModal visible={visible} onClose={closeAppUsageGuide} />
    </AppUsageGuideContext.Provider>
  );
}

export function useAppUsageGuide() {
  const ctx = useContext(AppUsageGuideContext);
  if (!ctx) throw new Error('useAppUsageGuide within AppUsageGuideProvider');
  return ctx;
}

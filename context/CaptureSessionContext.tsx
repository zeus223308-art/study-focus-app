import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type CaptureSessionHandlers = {
  hasDraft: boolean;
  saveDraft: () => Promise<boolean>;
  discardDraft: () => void;
};

type CaptureSessionContextValue = {
  getHandlers: () => CaptureSessionHandlers | null;
  register: (handlers: CaptureSessionHandlers | null) => void;
};

const CaptureSessionContext = createContext<CaptureSessionContextValue | null>(null);

export function CaptureSessionProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<CaptureSessionHandlers | null>(null);
  const [, setRevision] = useState(0);

  const register = useCallback((handlers: CaptureSessionHandlers | null) => {
    handlersRef.current = handlers;
    setRevision((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      getHandlers: () => handlersRef.current,
      register,
    }),
    [register]
  );

  return <CaptureSessionContext.Provider value={value}>{children}</CaptureSessionContext.Provider>;
}

export function useCaptureSession() {
  const ctx = useContext(CaptureSessionContext);
  if (!ctx) throw new Error('CaptureSessionProvider missing');
  return ctx;
}

export function useRegisterCaptureSession(handlers: CaptureSessionHandlers | null) {
  const { register } = useCaptureSession();

  useEffect(() => {
    register(handlers);
    return () => register(null);
  }, [handlers, register]);
}

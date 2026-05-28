import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type SessionState = {
  hasPending: boolean;
  discardDraft: () => void;
};

type PendingLeave = {
  proceed: () => void;
};

type ContextValue = {
  registerSession: (session: SessionState | null) => void;
  requestLeave: (proceed: () => void) => boolean;
  editorFullscreen: boolean;
  setEditorFullscreen: (active: boolean) => void;
};

const CaptureLeaveGuardContext = createContext<ContextValue | null>(null);

export function CaptureLeaveGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const sessionRef = useRef<SessionState | null>(null);
  const [pending, setPending] = useState<PendingLeave | null>(null);
  const [editorFullscreen, setEditorFullscreen] = useState(false);

  const registerSession = useCallback((session: SessionState | null) => {
    sessionRef.current = session;
  }, []);

  const requestLeave = useCallback((proceed: () => void): boolean => {
    if (!sessionRef.current?.hasPending) return false;
    setPending({ proceed });
    return true;
  }, []);

  const onStay = () => setPending(null);

  const onLeave = () => {
    sessionRef.current?.discardDraft();
    pending?.proceed();
    setPending(null);
  };

  return (
    <CaptureLeaveGuardContext.Provider
      value={{ registerSession, requestLeave, editorFullscreen, setEditorFullscreen }}>
      {children}
      <ConfirmDialog
        visible={pending != null}
        title={t('capture.leaveConfirmTitle')}
        message={t('capture.leaveConfirmMessage')}
        cancelLabel={t('capture.leaveConfirmNo')}
        confirmLabel={t('capture.leaveConfirmYes')}
        onCancel={onStay}
        onConfirm={onLeave}
      />
    </CaptureLeaveGuardContext.Provider>
  );
}

export function useCaptureLeaveGuard() {
  const ctx = useContext(CaptureLeaveGuardContext);
  if (!ctx) throw new Error('CaptureLeaveGuardProvider missing');
  return ctx;
}

/** Sync capture draft state every render so tab-bar leave checks are immediate. */
export function useCaptureLeaveRegistration(hasPending: boolean, discardDraft: () => void) {
  const { registerSession } = useCaptureLeaveGuard();
  const discardRef = useRef(discardDraft);
  discardRef.current = discardDraft;

  registerSession(
    hasPending
      ? {
          hasPending: true,
          discardDraft: () => discardRef.current(),
        }
      : null
  );

  useEffect(() => () => registerSession(null), [registerSession]);
}

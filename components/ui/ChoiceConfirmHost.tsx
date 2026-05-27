import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  registerChoiceConfirm,
  type ChoiceConfirmRequest,
} from '@/lib/ui/choice-confirm-registry';

/** Renders Yes/No confirms on web (and anywhere Alert is unreliable). */
export function ChoiceConfirmHost() {
  const [request, setRequest] = useState<ChoiceConfirmRequest | null>(null);

  useEffect(() => {
    registerChoiceConfirm(setRequest);
    return () => registerChoiceConfirm(null);
  }, []);

  const dismiss = () => setRequest(null);

  return (
    <ConfirmDialog
      visible={request != null}
      title={request?.title ?? ''}
      message={request?.message}
      cancelLabel={request?.noLabel ?? ''}
      confirmLabel={request?.yesLabel ?? ''}
      onCancel={() => {
        request?.onNo?.();
        dismiss();
      }}
      onConfirm={() => {
        void request?.onYes();
        dismiss();
      }}
    />
  );
}

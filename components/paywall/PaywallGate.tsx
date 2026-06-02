import { PaywallSheet } from '@/components/paywall/PaywallSheet';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { PaywallReason } from '@/services/storage/types';

/** Renders paywall from any tab when freemium limits are hit. */
export function PaywallGate() {
  const { freemium, paywallVisible, paywallReason, setPaywallVisible, data } = useApp();

  const reason: PaywallReason =
    paywallReason ?? (freemium.reason === 'memos' ? 'memos' : 'images');

  const used =
    reason === 'subjects'
      ? data.subjects.length
      : reason === 'memos'
        ? freemium.usedMemos
        : freemium.usedImages;

  const max =
    reason === 'subjects'
      ? theme.limits.freeSubjects
      : reason === 'memos'
        ? data.settings.memoLimit
        : data.settings.photoLimit;

  return (
    <PaywallSheet
      visible={paywallVisible}
      reason={reason}
      used={used}
      max={max}
      onClose={() => setPaywallVisible(false)}
    />
  );
}

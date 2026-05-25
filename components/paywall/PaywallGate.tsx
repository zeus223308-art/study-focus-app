import { PaywallSheet } from '@/components/paywall/PaywallSheet';
import { useApp } from '@/context/AppContext';

/** Renders paywall from any tab when freemium limits are hit. */
export function PaywallGate() {
  const { freemium, paywallVisible, setPaywallVisible, data } = useApp();

  return (
    <PaywallSheet
      visible={paywallVisible}
      reason={freemium.reason ?? 'images'}
      used={freemium.reason === 'memos' ? freemium.usedMemos : freemium.usedImages}
      max={freemium.reason === 'memos' ? data.settings.memoLimit : data.settings.photoLimit}
      onClose={() => setPaywallVisible(false)}
    />
  );
}

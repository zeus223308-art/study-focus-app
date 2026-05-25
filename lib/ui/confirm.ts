import { Alert, Platform } from 'react-native';

/** Cancel + destructive confirm (delete, trash, etc.). Works on web where Alert.alert is a no-op. */
export function confirmDestructive(options: {
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm?: () => void;
  /** @deprecated Use onConfirm */
  onPress?: () => void;
}) {
  const { title, message, cancelLabel, confirmLabel, onConfirm, onPress } = options;
  const runConfirm = onConfirm ?? onPress;
  if (!runConfirm) return;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof globalThis.confirm === 'function' && globalThis.confirm(text)) {
      runConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: runConfirm },
  ]);
}

/** Yes / No confirm (non-destructive). Works on web via window.confirm. */
export function confirmChoice(options: {
  title: string;
  message?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void | Promise<void>;
  onNo?: () => void;
}) {
  const { title, message, yesLabel, noLabel, onYes, onNo } = options;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof globalThis.confirm === 'function' && globalThis.confirm(text)) {
      void onYes();
    } else {
      onNo?.();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: noLabel, style: 'cancel', onPress: onNo },
    { text: yesLabel, onPress: () => void onYes() },
  ]);
}

/** Simple info toast substitute (Alert is a no-op on web). */
export function showMessage(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web') {
    if (message) globalThis.alert?.(text);
    else globalThis.alert?.(title);
    return;
  }
  Alert.alert(title, message);
}

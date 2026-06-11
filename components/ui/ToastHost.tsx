import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { registerToast, type ToastRequest } from '@/lib/ui/toast-registry';

/** Non-blocking toast — auto-dismiss; does not block navigation (unlike window.alert). */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    registerToast((request) => {
      idRef.current += 1;
      const next: ToastRequest = { ...request, id: idRef.current };
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(next);
      timerRef.current = setTimeout(dismiss, next.durationMs);
    });
    return () => {
      registerToast(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  if (!toast) return null;

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 72 }]}
      pointerEvents="box-none">
      <Pressable style={styles.card} onPress={dismiss} accessibilityRole="button">
        {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: Platform.OS === 'web' ? ('fixed' as const) : 'absolute',
    left: 20,
    right: 20,
    zIndex: 100000,
    alignItems: 'center',
  } as ViewStyle,
  card: {
    maxWidth: 360,
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.grayLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  title: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.graySecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: theme.font.bodySmall,
    fontWeight: '700',
    color: theme.black,
    textAlign: 'center',
    lineHeight: 20,
  },
});

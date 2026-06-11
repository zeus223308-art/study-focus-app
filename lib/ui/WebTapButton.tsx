import { createElement, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

const TAP_COOLDOWN_MS = 450;

type Props = {
  onPress: () => void;
  disabled?: boolean;
  label: string;
  style?: ViewStyle;
  children: ReactNode;
};

/**
 * Native <button> on mobile web — reliable taps inside ScrollView on iOS Safari.
 * RN Pressable often misses touch end inside overflow scrollers on Safari.
 */
export function WebTapButton({ onPress, disabled = false, label, style, children }: Props) {
  const lastTapRef = useRef(0);

  if (Platform.OS !== 'web') return null;

  const flat = StyleSheet.flatten(style) ?? {};
  const css: Record<string, unknown> = {
    width: flat.width,
    height: flat.height,
    minWidth: flat.minWidth,
    minHeight: flat.minHeight,
    flex: flat.flex,
    flexShrink: flat.flexShrink,
    alignSelf: flat.alignSelf,
    marginTop: flat.marginTop,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: disabled ? 'default' : 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    opacity: disabled ? 0.35 : (flat.opacity ?? 1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };

  return createElement(
    'button',
    {
      type: 'button',
      'aria-label': label,
      'aria-disabled': disabled || undefined,
      onClick: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const now = Date.now();
        if (now - lastTapRef.current < TAP_COOLDOWN_MS) return;
        lastTapRef.current = now;
        onPress();
      },
      style: css,
    },
    children
  );
}

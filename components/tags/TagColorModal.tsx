import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { theme } from '@/constants/theme';
import { BUTTON_LABEL_DEFAULT, BUTTON_LABEL_EMPHASIS } from '@/lib/ui/button-label';
import { FREE_TAG_COLORS } from '@/lib/ui/tag-colors';

/** Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc` → normalized `#aabbcc`, else null. */
function normalizeHexColor(input: string): string | null {
  const raw = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return null;
}

type Props = {
  visible: boolean;
  tag: string;
  current: string;
  isPro: boolean;
  title: string;
  freeLabel: string;
  customLabel: string;
  customHint: string;
  applyLabel: string;
  cancelLabel: string;
  onPick: (color: string) => void;
  onRequirePremium: () => void;
  onClose: () => void;
};

export function TagColorModal({
  visible,
  tag,
  current,
  isPro,
  title,
  freeLabel,
  customLabel,
  customHint,
  applyLabel,
  cancelLabel,
  onPick,
  onRequirePremium,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [hex, setHex] = useState('');
  useEffect(() => {
    if (visible) setHex(current.replace(/^#/, '').toUpperCase());
  }, [visible, current]);

  const normalizedHex = normalizeHexColor(hex);
  const renderSwatch = (color: string, locked: boolean) => {
    const selected = color.toLowerCase() === current.toLowerCase();
    return (
      <Pressable
        key={color}
        onPress={() => (locked ? onRequirePremium() : onPick(color))}
        style={styles.swatch}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle
            cx={20}
            cy={20}
            r={18}
            fill={color}
            stroke={selected ? theme.black : 'transparent'}
            strokeWidth={selected ? 3 : 0}
          />
        </Svg>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { marginBottom: Math.max(24, insets.bottom) }]}
          onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {tag ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>{freeLabel}</Text>
          <View style={styles.swatchGrid}>
            {FREE_TAG_COLORS.map((color) => renderSwatch(color, false))}
          </View>

          <Text style={styles.sectionLabel}>{customLabel}</Text>
          {isPro ? (
            <View style={styles.customRow}>
              <View style={styles.customPreview}>
                <Svg width={36} height={36} viewBox="0 0 36 36">
                  <Circle cx={18} cy={18} r={17} fill={normalizedHex ?? current} />
                </Svg>
              </View>
              <View style={styles.hexField}>
                <Text style={styles.hexHash}>#</Text>
                <TextInput
                  style={styles.hexInput}
                  value={hex}
                  onChangeText={(v) => setHex(v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
                  onSubmitEditing={() => normalizedHex && onPick(normalizedHex)}
                  placeholder="FF8800"
                  placeholderTextColor={theme.grayMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                />
              </View>
              <Pressable
                disabled={!normalizedHex}
                onPress={() => normalizedHex && onPick(normalizedHex)}
                style={[styles.applyBtn, !normalizedHex && styles.applyBtnOff]}>
                <Text style={styles.applyBtnText}>{applyLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.customLocked} onPress={onRequirePremium}>
              <Text style={styles.customLockedText}>{customHint}</Text>
            </Pressable>
          )}

          <Pressable style={[styles.btn, styles.btnCancel]} onPress={onClose}>
            <Text style={styles.btnCancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 12,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  tagPill: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  tagPillText: { fontWeight: '800', color: theme.black, fontSize: theme.font.body },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.graySecondary,
    marginTop: 12,
    marginBottom: 2,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 4,
  },
  customPreview: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: theme.surface,
  },
  hexHash: {
    color: theme.grayMuted,
    fontWeight: '800',
    fontSize: theme.font.body,
  },
  hexInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 2,
    color: theme.black,
    fontSize: theme.font.body,
    fontWeight: '700',
    letterSpacing: 1,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  applyBtn: {
    backgroundColor: theme.orange,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  applyBtnOff: {
    backgroundColor: theme.grayLight,
  },
  applyBtnText: {
    ...BUTTON_LABEL_EMPHASIS,
    color: theme.onAccent,
  },
  customLocked: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.grayLight,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  customLockedText: {
    color: theme.graySecondary,
    fontWeight: '700',
    fontSize: theme.font.bodySmall,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  btnCancelText: {
    ...BUTTON_LABEL_DEFAULT,
    color: theme.black,
  },
});

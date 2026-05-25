import * as ImageManipulator from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureInteractiveCrop } from '@/components/capture/CaptureInteractiveCrop';
import { theme } from '@/constants/theme';
import type { CropSelection } from '@/lib/files/interactive-crop';
import { exportCropSelection } from '@/lib/files/interactive-crop';

type Props = {
  uri: string;
  sideLabel: string;
  onConfirm: (uri: string) => void;
  onRetake: () => void;
};

export function CapturePhotoEditor({ uri, sideLabel, onConfirm, onRetake }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [workingUri, setWorkingUri] = useState(uri);
  const [busy, setBusy] = useState(false);
  const [cropReady, setCropReady] = useState(false);
  const cropSelectionRef = useRef<CropSelection | null>(null);

  const rotate = async () => {
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setWorkingUri(result.uri);
      cropSelectionRef.current = null;
      setCropReady(false);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const selection = cropSelectionRef.current;
    if (!selection) return;
    setBusy(true);
    try {
      const finalUri = await exportCropSelection(workingUri, selection);
      onConfirm(finalUri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6, paddingBottom: 10 }]}>
        <Pressable onPress={busy ? undefined : onRetake} hitSlop={12} style={styles.topAction}>
          <Text style={styles.cancelText}>{t('capture.editorCancel')}</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {sideLabel}
        </Text>
        <Pressable
          onPress={busy || !cropReady ? undefined : confirm}
          hitSlop={12}
          style={styles.topAction}>
          <Text style={[styles.doneText, (busy || !cropReady) && styles.doneDisabled]}>
            {t('capture.editorDone')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cropWrap}>
        <CaptureInteractiveCrop
          key={workingUri}
          uri={workingUri}
          onSelectionChange={(next) => {
            cropSelectionRef.current = next;
            setCropReady(Boolean(next));
          }}
        />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={theme.white} size="large" />
          </View>
        ) : null}
      </View>

      <View style={[styles.toolBar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
        <Pressable style={[styles.toolItem, styles.toolActive]} disabled>
          <Text style={[styles.toolLabel, styles.toolLabelActive]}>{t('capture.toolCrop')}</Text>
        </Pressable>
        <Pressable style={styles.toolItem} onPress={busy ? undefined : rotate} disabled={busy}>
          <Text style={styles.toolLabel}>{t('capture.toolRotate')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  topAction: { minWidth: 56, paddingVertical: 6 },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  cancelText: { color: theme.white, fontSize: 16, fontWeight: '600' },
  doneText: { color: theme.orange, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  doneDisabled: { opacity: 0.4 },
  cropWrap: { flex: 1, position: 'relative' },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  toolBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 14,
    backgroundColor: '#141414',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  toolItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  toolActive: { borderBottomWidth: 2, borderBottomColor: theme.orange },
  toolLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  toolLabelActive: { color: theme.white },
});

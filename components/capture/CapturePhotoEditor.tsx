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
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import type { CropTransform } from '@/lib/files/interactive-crop';
import { exportInteractiveCrop } from '@/lib/files/interactive-crop';

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
  const cropTransformRef = useRef<CropTransform | null>(null);

  const rotate = async () => {
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setWorkingUri(result.uri);
      cropTransformRef.current = null;
      setCropReady(false);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const transform = cropTransformRef.current;
    if (!transform) return;
    setBusy(true);
    try {
      const finalUri = await exportInteractiveCrop(workingUri, transform);
      onConfirm(finalUri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.sideLabel}>{sideLabel}</Text>
        <Text style={styles.hint}>{t('capture.editHint')}</Text>
      </View>

      <View style={styles.cropWrap}>
        <CaptureInteractiveCrop
          key={workingUri}
          uri={workingUri}
          onTransformChange={(next) => {
            cropTransformRef.current = next;
            setCropReady(Boolean(next));
          }}
        />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={theme.orange} size="large" />
          </View>
        ) : null}
      </View>

      <View style={[styles.toolbar, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <View style={styles.toolRow}>
          <Pressable onPress={rotate} disabled={busy} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>{t('capture.rotate')}</Text>
          </Pressable>
        </View>
        <Button
          label={t('capture.usePhoto')}
          onPress={confirm}
          disabled={busy || !cropReady}
        />
        <Button label={t('capture.retake')} variant="ghost" onPress={onRetake} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
  topBar: { paddingHorizontal: 20, paddingBottom: 8 },
  sideLabel: { color: theme.white, fontSize: theme.font.heading, fontWeight: '800' },
  hint: { color: theme.grayMuted, fontSize: theme.font.caption, marginTop: 4 },
  cropWrap: { flex: 1, position: 'relative' },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  toolbar: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  toolBtnText: { fontWeight: '700', color: theme.black, fontSize: theme.font.caption },
});

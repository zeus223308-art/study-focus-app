import { Modal, Platform, StyleSheet, View } from 'react-native';

import { VaultDragTrashSheet } from '@/components/files/VaultDragTrashSheet';
import { useApp } from '@/context/AppContext';

/** Full-screen trash popup while dragging a folder toward the bottom. */
export function VaultTrashOverlay() {
  const { vaultTrashSheet } = useApp();

  if (!vaultTrashSheet.visible) {
    return null;
  }

  const sheet = <VaultDragTrashSheet visible ready={vaultTrashSheet.ready} />;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot} pointerEvents="box-none">
        <View style={styles.webBackdrop} pointerEvents="box-none">
          {sheet}
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.nativeBackdrop} pointerEvents="box-none">
        {sheet}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    ...Platform.select({
      web: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
      },
      default: {},
    }),
  },
  webBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
    ...Platform.select({
      web: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {},
    }),
  },
  nativeBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
});

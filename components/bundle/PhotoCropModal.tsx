import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapturePhotoEditor } from '@/components/capture/CapturePhotoEditor';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  uri: string;
  sideLabel: string;
  onConfirm: (uri: string) => void;
  onClose: () => void;
};

export function PhotoCropModal({ visible, uri, sideLabel, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <CapturePhotoEditor
          uri={uri}
          sideLabel={sideLabel}
          lockImagePosition
          onConfirm={async (result) => {
            onConfirm(result.uri);
            onClose();
          }}
          onRetake={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.blackPure },
});

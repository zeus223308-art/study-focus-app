import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SubjectDropTarget } from '@/components/files/SubjectDropTarget';
import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';

type Props = {
  subjectId: string;
  name: string;
  totalLabel: string;
  previewItems: SubjectPreviewItem[];
  onPress: () => void;
  onPreviewGestureLock: (locked: boolean) => void;
};

/** Files tab — subject name above card; swipe problem previews inside the card. */
export function SubjectFolderTile({
  subjectId,
  name,
  totalLabel,
  previewItems,
  onPress,
  onPreviewGestureLock,
}: Props) {
  const { t } = useTranslation();
  const { movingBundleId, dragSourceSubjectId, finishBundleDrop } = useApp();
  const cardRef = useRef<View>(null);

  const tryDropHere = () => {
    if (!movingBundleId || subjectId === dragSourceSubjectId) return;
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const moved = finishBundleDrop(x + width / 2, y + height / 2);
      if (moved) Alert.alert('', t('folder.movedTo', { name: moved }));
    });
  };

  return (
    <SubjectDropTarget subjectId={subjectId} style={styles.wrap}>
      <Text style={styles.name}>{name}</Text>
      <View ref={cardRef} collapsable={false}>
        <SubjectFolderPreview
          variant="vault"
          items={previewItems}
          totalLabel={totalLabel}
          emptyHint={t('vault.previewEmpty')}
          onOpen={() => {
            if (movingBundleId) {
              tryDropHere();
              return;
            }
            onPress();
          }}
          onGestureLock={onPreviewGestureLock}
        />
      </View>
    </SubjectDropTarget>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minWidth: 0,
  },
  name: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
    marginBottom: 8,
    marginLeft: 2,
  },
});

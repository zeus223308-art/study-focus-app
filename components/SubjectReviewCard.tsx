import { StyleSheet, View } from 'react-native';

import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { theme } from '@/constants/theme';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';

type Props = {
  subjectTag: string;
  previewItems: SubjectPreviewItem[];
  totalLabel: string;
  emptyHint: string;
  selected?: boolean;
  onPress: () => void;
};

/** Dashboard due card — subject tag + swipeable problem previews. */
export function SubjectReviewCard({
  subjectTag,
  previewItems,
  totalLabel,
  emptyHint,
  selected,
  onPress,
}: Props) {
  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]}>
      <SubjectFolderPreview
        variant="dashboard"
        subjectTag={subjectTag}
        items={previewItems}
        totalLabel={totalLabel}
        emptyHint={emptyHint}
        onOpen={onPress}
        onGestureLock={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
  },
  wrapSelected: {
    shadowColor: theme.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
});

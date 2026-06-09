import { Platform, StyleSheet, View, type ImageStyle } from 'react-native';

import { SubjectFolderPreview } from '@/components/files/SubjectFolderPreview';
import { SubjectReviewCompleteOverlay } from '@/components/dashboard/SubjectReviewCompleteOverlay';
import { theme } from '@/constants/theme';
import type { SubjectPreviewItem } from '@/lib/files/subject-previews';

const previewBlurWeb: ImageStyle =
  Platform.OS === 'web'
    ? ({ filter: 'blur(6px)', WebkitFilter: 'blur(6px)' } as ImageStyle)
    : {};

type Props = {
  subjectTag: string;
  subjectColor?: string;
  subjectSortOrder?: number;
  previewItems: SubjectPreviewItem[];
  totalLabel: string;
  emptyHint: string;
  selected?: boolean;
  completed?: boolean;
  previewIndex?: number;
  onPreviewIndexChange?: (index: number) => void;
};

/** Dashboard due card — subject tag + swipeable problem previews. */
export function SubjectReviewCard({
  subjectTag,
  subjectColor,
  subjectSortOrder,
  previewItems,
  totalLabel,
  emptyHint,
  selected,
  completed,
  previewIndex,
  onPreviewIndexChange,
}: Props) {
  return (
    <View style={[styles.wrap, selected && !completed && styles.wrapSelected]}>
      <SubjectFolderPreview
        variant="dashboard"
        subjectTag={subjectTag}
        subjectColor={subjectColor}
        subjectSortOrder={subjectSortOrder}
        items={previewItems}
        totalLabel={totalLabel}
        emptyHint={emptyHint}
        onOpen={() => {}}
        onGestureLock={() => {}}
        previewIndex={previewIndex}
        onPreviewIndexChange={completed ? undefined : onPreviewIndexChange}
        dimmed={completed}
        imageStyleExtra={completed ? previewBlurWeb : undefined}
      />
      {completed ? <SubjectReviewCompleteOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  wrapSelected: {
    shadowColor: theme.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
});

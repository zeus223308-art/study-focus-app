import { StyleSheet, Text, View } from 'react-native';

import { AlbumPhotoTile } from '@/components/files/AlbumPhotoTile';
import { ItemDropTarget } from '@/components/files/ItemDropTarget';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { bundleDisplayTitle } from '@/lib/domain/bundle-title';
import type { Language } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import type { ProblemDateSection, SubjectProblemItem } from '@/lib/grouping/bundles';
import { formatStudyDateHeading } from '@/lib/ui/format-study-date';

type Props = {
  section: ProblemDateSection;
  language: Language;
  subjectId: string;
  albumColumns: number;
  contentWidth: number;
  gap: number;
  labels: {
    today: string;
    yesterday: string;
    photoCount: (count: number) => string;
    problemLabel: (n: number) => string;
  };
  onOpen: (bundleId: string, pageId: string) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (item: SubjectProblemItem, moved: boolean, pageX: number, pageY: number) => void;
  onLiftItemForDrag: (item: SubjectProblemItem) => void;
  onPhotoAction?: (item: SubjectProblemItem) => void;
  selectionMode?: 'pick' | null;
  selectedKeys?: Set<string>;
  onToggleSelect?: (item: SubjectProblemItem) => void;
  reorderEnabled?: boolean;
};

function itemKey(item: SubjectProblemItem) {
  return `${item.bundleId}:${item.pageId}`;
}

export function DateAlbumSection({
  section,
  language,
  subjectId,
  albumColumns,
  contentWidth,
  gap,
  labels,
  onOpen,
  onDragMove,
  onDragEnd,
  onLiftItemForDrag,
  onPhotoAction,
  selectionMode,
  selectedKeys,
  onToggleSelect,
  reorderEnabled,
}: Props) {
  const { registerItemDropZone, dragHoverItemKey } = useApp();
  const cellWidth = Math.floor((contentWidth - gap * (albumColumns - 1)) / albumColumns);
  const heading = formatStudyDateHeading(section.studyDate, language, {
    today: labels.today,
    yesterday: labels.yesterday,
  });
  const pickMode = selectionMode === 'pick';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.count}>{labels.photoCount(section.items.length)}</Text>
      </View>
      <View style={[styles.grid, { gap }]}>
        {section.items.map((item, index) => {
          const title = bundleDisplayTitle(item.bundle);
          const countLabel = title ?? labels.problemLabel(index + 1);
          const key = itemKey(item);
          const tile = (
            <AlbumPhotoTile
              bundleId={item.bundleId}
              pageId={item.pageId}
              itemDragKey={key}
              sourceSubjectId={subjectId}
              thumbnailUri={getPreviewImageUri(item.page.asset) ?? ''}
              countLabel={countLabel}
              cellWidth={cellWidth}
              onOpen={() => onOpen(item.bundleId, item.pageId)}
              onLiftForDrag={() => onLiftItemForDrag(item)}
              onDragMove={reorderEnabled && !pickMode ? onDragMove : undefined}
              onDragEnd={
                onDragEnd ? (moved, pageX, pageY) => onDragEnd(item, moved, pageX, pageY) : undefined
              }
              onPhotoAction={onPhotoAction ? () => onPhotoAction(item) : undefined}
              pickMode={pickMode}
              pickSelected={pickMode && (selectedKeys?.has(key) ?? false)}
              onTogglePick={onToggleSelect ? () => onToggleSelect(item) : undefined}
            />
          );

          if (!reorderEnabled || pickMode) {
            return <View key={key}>{tile}</View>;
          }

          return (
            <ItemDropTarget
              key={key}
              itemKey={key}
              register={registerItemDropZone}
              hover={dragHoverItemKey === key}>
              {tile}
            </ItemDropTarget>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  heading: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
  count: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

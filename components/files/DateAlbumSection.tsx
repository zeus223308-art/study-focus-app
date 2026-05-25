import { StyleSheet, Text, View } from 'react-native';

import { AlbumPhotoTile } from '@/components/files/AlbumPhotoTile';
import { theme } from '@/constants/theme';
import { bundleDisplayTitle } from '@/lib/domain/bundle-title';
import type { Language } from '@/lib/domain/types';
import { getPreviewImageUri } from '@/lib/files/display-image-uri';
import type { ProblemDateSection } from '@/lib/grouping/bundles';
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
  onDelete: (bundleId: string, pageId: string) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX: number, pageY: number) => void;
};

export function DateAlbumSection({
  section,
  language,
  subjectId,
  albumColumns,
  contentWidth,
  gap,
  labels,
  onOpen,
  onDelete,
  onDragMove,
  onDragEnd,
}: Props) {
  const cellWidth = Math.floor((contentWidth - gap * (albumColumns - 1)) / albumColumns);
  const heading = formatStudyDateHeading(section.studyDate, language, {
    today: labels.today,
    yesterday: labels.yesterday,
  });

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
          return (
            <AlbumPhotoTile
              key={`${item.bundleId}_${item.pageId}`}
              bundleId={item.bundleId}
              sourceSubjectId={subjectId}
              thumbnailUri={getPreviewImageUri(item.page.asset) ?? ''}
              countLabel={countLabel}
              cellWidth={cellWidth}
              onOpen={() => onOpen(item.bundleId, item.pageId)}
              onDelete={() => onDelete(item.bundleId, item.pageId)}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
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

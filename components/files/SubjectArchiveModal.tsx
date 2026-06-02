import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Button } from '@/components/ui/Button';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import type { Language } from '@/lib/domain/types';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
import {
  groupSubjectProblemsByDate,
  listArchivedSubjectProblems,
  type SubjectProblemItem,
} from '@/lib/grouping/bundles';
import { confirmChoice } from '@/lib/ui/confirm';
import { formatStudyDateHeading } from '@/lib/ui/format-study-date';
import { ALBUM_TILE_GAP, useViewportLayout } from '@/lib/ui/viewport-layout';

type Props = {
  visible: boolean;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
};

function ArchivePhotoGrid({
  items,
  columns,
  contentWidth,
  gap,
  onOpen,
}: {
  items: SubjectProblemItem[];
  columns: number;
  contentWidth: number;
  gap: number;
  onOpen: (item: SubjectProblemItem) => void;
}) {
  const cellW = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  return (
    <View style={[styles.grid, { gap }]}>
      {items.map((item) => {
        const uri = getPreviewImageUri(item.page.asset);
        return (
          <Pressable
            key={`${item.bundleId}:${item.pageId}`}
            onPress={() => onOpen(item)}
            style={({ pressed }) => [
              styles.gridCell,
              { width: cellW, height: cellW },
              pressed && styles.gridCellPressed,
            ]}
            accessibilityRole="button">
            {uri ? (
              <ResolvedImage
                uri={uri}
                asset={item.page.asset}
                style={styles.gridImg}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.gridImg, styles.gridEmpty]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SubjectArchiveModal({ visible, subjectId, subjectName, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, unarchiveBundle, deletePage } = useApp();
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();

  const [previewItem, setPreviewItem] = useState<SubjectProblemItem | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  const archivedProblems = useMemo(
    () => listArchivedSubjectProblems(data.bundles, subjectId),
    [data.bundles, subjectId]
  );
  const dateSections = useMemo(
    () => groupSubjectProblemsByDate(archivedProblems),
    [archivedProblems]
  );

  const pad = viewport.isPhone ? 20 : viewport.horizontalPadding;
  const cardWidth = Math.min(viewport.width - pad * 2, viewport.contentMaxWidth);
  const albumContentWidth = cardWidth - 32;
  const columns = viewport.albumNumColumns;

  const dateLabels = useMemo(
    () => ({
      today: t('folder.dateToday'),
      yesterday: t('folder.dateYesterday'),
    }),
    [t]
  );

  const closeAll = () => {
    setPreviewItem(null);
    setPreviewSide('front');
    onClose();
  };

  const openPreview = (item: SubjectProblemItem) => {
    setPreviewSide('front');
    setPreviewItem(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewSide('front');
  };

  const restoreFromPreview = () => {
    if (!previewItem) return;
    unarchiveBundle(previewItem.bundleId);
    closePreview();
  };

  const confirmDeleteFromPreview = () => {
    if (!previewItem) return;
    const { bundleId, pageId } = previewItem;
    confirmChoice({
      title: t('item.deletePhotoTitle'),
      message: t('item.deletePhotoMessage'),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => {
        deletePage(bundleId, pageId);
        closePreview();
      },
    });
  };

  const sectionHeading = (studyDate: string, count: number, lang: Language) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {formatStudyDateHeading(studyDate, lang, dateLabels)}
      </Text>
      <Text style={styles.sectionCount}>{t('folder.photoCount', { count })}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={previewItem ? closePreview : closeAll}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAll} accessibilityLabel={t('common.close')} />

        {previewItem ? (
          <View style={[styles.previewPanel, { paddingBottom: Math.max(16, insets.bottom) }]}>
            <Pressable style={styles.previewClose} hitSlop={12} onPress={closePreview}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={24}
                tintColor={theme.white}
              />
            </Pressable>

            {previewItem.page.answerAsset ? (
              <View style={styles.previewSideRow}>
                <Pressable
                  onPress={() => setPreviewSide('front')}
                  style={[styles.previewSideChip, previewSide === 'front' && styles.previewSideChipOn]}>
                  <Text
                    style={[
                      styles.previewSideText,
                      previewSide === 'front' && styles.previewSideTextOn,
                    ]}>
                    {t('capture.frontLabel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPreviewSide('back')}
                  style={[styles.previewSideChip, previewSide === 'back' && styles.previewSideChipOn]}>
                  <Text
                    style={[
                      styles.previewSideText,
                      previewSide === 'back' && styles.previewSideTextOn,
                    ]}>
                    {t('capture.backLabel')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.previewImageArea}>
              {(() => {
                const asset =
                  previewSide === 'back' && previewItem.page.answerAsset
                    ? previewItem.page.answerAsset
                    : previewItem.page.asset;
                const uri = getFullImageUri(asset) ?? getPreviewImageUri(asset);
                return uri ? (
                  <ResolvedImage
                    uri={uri}
                    asset={asset}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.previewMissing}>{t('folder.archiveEmpty')}</Text>
                );
              })()}
            </View>

            <View style={styles.previewActions}>
              <Button label={t('folder.restorePhoto')} onPress={restoreFromPreview} />
              <Button
                label={t('item.deletePhoto')}
                variant="ghost"
                onPress={confirmDeleteFromPreview}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                maxHeight: viewport.height - insets.top - insets.bottom - 40,
                paddingTop: 16,
              },
            ]}>
            <Text style={styles.title}>{t('folder.archiveModalTitle', { name: subjectName })}</Text>
            {dateSections.length > 0 ? (
              <Text style={styles.hint}>{t('folder.archiveRestoreHint')}</Text>
            ) : null}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {dateSections.length === 0 ? (
                <Text style={styles.empty}>{t('folder.archiveEmpty')}</Text>
              ) : (
                dateSections.map((section) => (
                  <View key={section.studyDate} style={styles.section}>
                    {sectionHeading(section.studyDate, section.items.length, language)}
                    <ArchivePhotoGrid
                      items={section.items}
                      columns={columns}
                      contentWidth={albumContentWidth}
                      gap={ALBUM_TILE_GAP}
                      onOpen={openPreview}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <Button label={t('appUsageGuide.close')} onPress={closeAll} style={styles.closeBtn} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  card: {
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 1,
    maxWidth: '100%',
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
    marginBottom: 12,
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    marginBottom: 12,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  empty: {
    textAlign: 'center',
    color: theme.gray,
    paddingVertical: 32,
    fontSize: theme.font.body,
  },
  closeBtn: {
    marginTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.black,
  },
  sectionCount: {
    fontSize: theme.font.caption,
    fontWeight: '600',
    color: theme.gray,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    width: '100%',
  },
  gridCell: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.grayLight,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  gridCellPressed: {
    opacity: 0.85,
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  gridEmpty: {
    backgroundColor: theme.grayLight,
  },
  previewPanel: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingTop: 44,
    ...Platform.select({
      web: { position: 'fixed' as const },
      default: {},
    }),
  },
  previewClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSideRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  previewSideChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  previewSideChipOn: { backgroundColor: theme.orange, borderColor: theme.orange },
  previewSideText: { fontWeight: '700', color: theme.white },
  previewSideTextOn: { color: theme.onAccent },
  previewImageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewMissing: {
    color: theme.gray,
    fontSize: theme.font.body,
  },
  previewActions: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});

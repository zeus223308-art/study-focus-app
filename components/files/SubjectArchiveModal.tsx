import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolView } from 'expo-symbols';

import { DateAlbumSection } from '@/components/files/DateAlbumSection';
import { Button } from '@/components/ui/Button';
import { ResolvedImage } from '@/components/ui/ResolvedImage';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import { getFullImageUri, getPreviewImageUri } from '@/lib/files/display-image-uri';
import {
  groupSubjectProblemsByDate,
  listArchivedSubjectProblems,
  type SubjectProblemItem,
} from '@/lib/grouping/bundles';
import { confirmChoice } from '@/lib/ui/confirm';
import { ALBUM_TILE_GAP, useViewportLayout } from '@/lib/ui/viewport-layout';

function itemKey(item: SubjectProblemItem) {
  return `${item.bundleId}:${item.pageId}`;
}

type Props = {
  visible: boolean;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
};

export function SubjectArchiveModal({ visible, subjectId, subjectName, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, unarchiveBundle, deletePage } = useApp();
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();

  const [restoreSelectMode, setRestoreSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
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

  const albumLabels = useMemo(
    () => ({
      today: t('folder.dateToday'),
      yesterday: t('folder.dateYesterday'),
      photoCount: (count: number) => t('folder.photoCount', { count }),
      problemLabel: (n: number) => t('folder.problemLabel', { n }),
    }),
    [t]
  );

  const closeAll = () => {
    setRestoreSelectMode(false);
    setSelectedKeys(new Set());
    onClose();
  };

  const toggleSelect = (item: SubjectProblemItem) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openPreview = (bundleId: string, pageId: string) => {
    const found = archivedProblems.find(
      (p) => p.bundleId === bundleId && p.pageId === pageId
    );
    if (!found) return;
    setPreviewSide('front');
    setPreviewItem(found);
  };

  const restoreFromPreview = () => {
    if (!previewItem) return;
    unarchiveBundle(previewItem.bundleId);
    setPreviewItem(null);
  };

  const confirmRestore = () => {
    const bundleIds = new Set<string>();
    for (const key of selectedKeys) {
      bundleIds.add(key.split(':')[0]!);
    }
    for (const id of bundleIds) {
      unarchiveBundle(id);
    }
    setRestoreSelectMode(false);
    setSelectedKeys(new Set());
    onClose();
  };

  const confirmDeleteProblem = (bundleId: string, pageId: string) => {
    confirmChoice({
      title: t('item.deletePhotoTitle'),
      message: t('item.deletePhotoMessage'),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => deletePage(bundleId, pageId),
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
        statusBarTranslucent
        presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAll} />
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
            {dateSections.length > 0 && !restoreSelectMode ? (
              <Text style={styles.hint}>{t('folder.archiveRestoreHint')}</Text>
            ) : null}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              {dateSections.length === 0 ? (
                <Text style={styles.empty}>{t('folder.archiveEmpty')}</Text>
              ) : (
                dateSections.map((section) => (
                  <DateAlbumSection
                    key={section.studyDate}
                    section={section}
                    language={language}
                    subjectId={subjectId}
                    albumColumns={viewport.albumNumColumns}
                    contentWidth={albumContentWidth}
                    gap={ALBUM_TILE_GAP}
                    labels={albumLabels}
                    selectionMode={restoreSelectMode ? 'pick' : null}
                    selectedKeys={selectedKeys}
                    onToggleSelect={toggleSelect}
                    onLiftItemForDrag={() => {}}
                    onDeleteHold={(item) => confirmDeleteProblem(item.bundleId, item.pageId)}
                    onOpen={(bundleId, pageId) => openPreview(bundleId, pageId)}
                    reorderEnabled={false}
                  />
                ))
              )}
            </ScrollView>
            {restoreSelectMode ? (
              <View style={styles.selectActions}>
                <Button
                  label={t('folder.restoreSelected', { count: selectedKeys.size })}
                  onPress={confirmRestore}
                  disabled={selectedKeys.size === 0}
                />
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  onPress={() => {
                    setRestoreSelectMode(false);
                    setSelectedKeys(new Set());
                  }}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={styles.selectActions}>
                {dateSections.length > 0 ? (
                  <Button
                    label={t('folder.restoreMultiple')}
                    variant="secondary"
                    onPress={() => {
                      setSelectedKeys(new Set());
                      setRestoreSelectMode(true);
                    }}
                  />
                ) : null}
                <Button
                  label={t('appUsageGuide.close')}
                  variant="ghost"
                  onPress={closeAll}
                  style={dateSections.length > 0 ? { marginTop: 8 } : undefined}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewItem(null)}
        statusBarTranslucent
        presentationStyle="overFullScreen">
        <View style={styles.previewRoot}>
          <Pressable style={styles.previewClose} hitSlop={12} onPress={() => setPreviewItem(null)}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={24}
              tintColor={theme.white}
            />
          </Pressable>

          {previewItem ? (
            <>
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
                  ) : null;
                })()}
              </View>

              <View style={[styles.previewActions, { paddingBottom: Math.max(16, insets.bottom) }]}>
                <Button label={t('folder.restorePhoto')} onPress={restoreFromPreview} />
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </>
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
  selectActions: {
    marginTop: 12,
  },
  previewRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0 },
      default: {},
    }),
  },
  previewClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 2,
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
    marginTop: 52,
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
    paddingVertical: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});

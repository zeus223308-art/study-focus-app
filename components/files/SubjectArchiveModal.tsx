import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateAlbumSection } from '@/components/files/DateAlbumSection';
import { PhotoActionSheet } from '@/components/files/PhotoActionSheet';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp, useLanguage } from '@/context/AppContext';
import {
  groupSubjectProblemsByDate,
  listArchivedSubjectProblems,
  type SubjectProblemItem,
} from '@/lib/grouping/bundles';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const ALBUM_GAP = 8;

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
  const { data, unarchiveBundle } = useApp();
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();

  const [actionItem, setActionItem] = useState<SubjectProblemItem | null>(null);
  const [restoreSelectMode, setRestoreSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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
    setActionItem(null);
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
                    gap={ALBUM_GAP}
                    labels={albumLabels}
                    selectionMode={restoreSelectMode ? 'pick' : null}
                    selectedKeys={selectedKeys}
                    onToggleSelect={toggleSelect}
                    onPhotoAction={(item) => setActionItem(item)}
                    onOpen={() => {}}
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
              <Button label={t('appUsageGuide.close')} onPress={closeAll} style={styles.closeBtn} />
            )}
          </View>
        </View>
      </Modal>

      <PhotoActionSheet
        visible={actionItem !== null}
        restoreLabel={t('folder.restoreFromArchive')}
        saveToArchiveLabel={t('folder.saveToArchive')}
        cancelLabel={t('common.cancel')}
        hideSaveToArchive
        onRestore={() => {
          if (actionItem) {
            setActionItem(null);
            setRestoreSelectMode(true);
            setSelectedKeys(new Set([itemKey(actionItem)]));
          }
        }}
        onSaveToArchive={() => setActionItem(null)}
        onClose={() => setActionItem(null)}
      />
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
});

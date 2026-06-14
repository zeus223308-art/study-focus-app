import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrashCoverImage } from '@/components/trash/TrashCoverImage';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  canRestoreFromBackup,
  filterActiveTrash,
  isTrashEntryWithPhotos,
} from '@/lib/trash/lifecycle';
import { trashEntriesForSubject } from '@/lib/trash/subject-trash';
import { webFixedBackdropStyle } from '@/lib/ui/web-fixed-overlay';
import { webHairlineBottom } from '@/lib/ui/web-divider';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

const THUMB = 64;
const THUMB_GAP = 8;

type Props = {
  visible: boolean;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
};

/** Subject-scoped trash: review and restore photos deleted from this folder. */
export function SubjectTrashModal({ visible, subjectId, subjectName, onClose }: Props) {
  const { t } = useTranslation();
  const { data, restoreTrash, restoreSubjectTrash } = useApp();
  const insets = useSafeAreaInsets();
  const viewport = useViewportLayout();

  const entries = useMemo(() => {
    const active = filterActiveTrash(data.trash);
    return trashEntriesForSubject(active, subjectId)
      .filter((e) => isTrashEntryWithPhotos(e) && canRestoreFromBackup(e))
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [data.trash, subjectId]);

  const pad = viewport.isPhone ? 20 : viewport.horizontalPadding;
  const cardWidth = Math.min(viewport.width - pad * 2, viewport.contentMaxWidth);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              maxHeight: viewport.height - insets.top - insets.bottom - 40,
            },
          ]}>
          <Text style={styles.title}>{t('trash.subjectModalTitle', { name: subjectName })}</Text>
          <Text style={styles.hint}>{t('trash.autoDeleteHint')}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {entries.length === 0 ? (
              <Text style={styles.empty}>{t('trash.subjectModalEmpty')}</Text>
            ) : (
              entries.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={styles.thumbWrap}>
                    {entry.bundleSnapshot.pages.map((page) => (
                        <View key={page.id} style={styles.thumbSlot}>
                          <TrashCoverImage
                            bundleId={entry.bundleSnapshot.id}
                            pageId={page.id}
                            asset={page.asset}
                            style={styles.thumb}
                          />
                        </View>
                      ))}
                  </View>
                  <Pressable
                    onPress={() => restoreTrash(entry.id)}
                    hitSlop={8}
                    style={styles.restoreBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('trash.restorePhoto')}>
                    <Text style={styles.restoreText}>{t('trash.restorePhoto')}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {entries.length > 0 ? (
            <Button
              label={t('trash.restoreAll')}
              onPress={() => {
                restoreSubjectTrash(subjectId);
                onClose();
              }}
              style={styles.actionBtn}
            />
          ) : null}
          <Button
            label={t('appUsageGuide.close')}
            variant="ghost"
            onPress={onClose}
            style={styles.closeBtn}
          />
        </View>
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
    ...webFixedBackdropStyle,
  },
  card: {
    backgroundColor: theme.beige,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 1,
    maxWidth: '100%',
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: '800',
    color: theme.black,
    textAlign: 'center',
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  empty: {
    textAlign: 'center',
    color: theme.gray,
    paddingVertical: 32,
    fontSize: theme.font.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    ...webHairlineBottom,
  },
  thumbWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
  },
  thumbSlot: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8 },
  restoreBtn: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.orange,
    backgroundColor: theme.surface,
  },
  restoreText: { color: theme.orange, fontWeight: '700', fontSize: theme.font.caption },
  actionBtn: { marginTop: 12 },
  closeBtn: { marginTop: 8 },
});

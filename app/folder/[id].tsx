import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { BundleGalleryCard } from '@/components/files/BundleGalleryCard';
import { DragMoveGhost } from '@/components/files/DragMoveGhost';
import { SubjectDropDock } from '@/components/files/SubjectDropDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { bundleDisplayTitle } from '@/lib/domain/bundle-title';
import { listSubjectProblems } from '@/lib/grouping/bundles';
import { pickForImport } from '@/lib/import/pick-for-import';
import { confirmDestructive, showMessage } from '@/lib/ui/confirm';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    data,
    localToday,
    importPhotosToSubject,
    updateDragHover,
    finishBundleDrop,
    movingBundleId,
    cancelMovingBundle,
    deletePage,
  } = useApp();
  const [importing, setImporting] = useState(false);
  const [ghost, setGhost] = useState({ x: 0, y: 0, visible: false });
  const viewport = useViewportLayout();

  const subject = data.subjects.find((s) => s.id === id);
  const problems = useMemo(
    () => listSubjectProblems(data.bundles, id ?? ''),
    [data.bundles, id]
  );

  const importNewProblem = async () => {
    if (!subject || importing) return;

    const picked = await pickForImport({
      title: t('folder.importSourceTitle'),
      album: t('folder.importAlbum'),
      files: t('folder.importFiles'),
      cancel: t('common.cancel'),
      unsupportedOnly: t('folder.importUnsupportedOnly'),
      unsupportedSkipped: t('folder.importUnsupportedSkipped'),
    });
    if (!picked.ok) {
      if (picked.reason === 'denied') {
        Alert.alert('', t('folder.importPermission'));
      }
      return;
    }

    setImporting(true);
    try {
      const saved = await importPhotosToSubject(
        subject.id,
        picked.files.map((f) => f.uri),
        localToday
      );
      if (saved > 0) {
        showMessage('', t('folder.importSaved', { count: saved }));
      }
    } finally {
      setImporting(false);
    }
  };

  const onDragMove = (pageX: number, pageY: number) => {
    setGhost({ x: pageX, y: pageY, visible: true });
    updateDragHover(pageX, pageY);
  };

  const confirmDeleteProblem = (bundleId: string, pageId: string) => {
    confirmDestructive({
      title: t('item.deletePhotoTitle'),
      message: t('item.deletePhotoMessage'),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('item.deletePhoto'),
      onConfirm: () => deletePage(bundleId, pageId),
    });
  };

  const onDragEnd = (pageX: number, pageY: number) => {
    setGhost({ x: pageX, y: pageY, visible: false });
    const name = finishBundleDrop(pageX, pageY);
    if (name) {
      Alert.alert('', t('folder.movedTo', { name }));
    }
  };

  if (!subject) return null;

  const addProblemZone = (
    <Pressable
      onPress={importNewProblem}
      disabled={importing}
      style={({ pressed }) => [styles.addZone, pressed && styles.addZonePressed]}
      accessibilityLabel={t('folder.addProblem')}>
      {importing ? (
        <ActivityIndicator color={theme.orange} />
      ) : (
        <>
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add', web: 'add' }}
            size={28}
            tintColor={theme.orange}
          />
          <Text style={styles.addTitle}>{t('folder.addProblem')}</Text>
          <Text style={styles.addHint}>{t('folder.addProblemHint')}</Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Screen padded={false}>
        <View style={styles.header}>
          <ScreenHeader title={subject.name} showBack backFallback="/(tabs)/vault" />
          {movingBundleId && (
            <Pressable onPress={cancelMovingBundle} style={styles.cancelMove}>
              <Text style={styles.cancelMoveText}>{t('common.cancel')}</Text>
            </Pressable>
          )}
        </View>
        <FlatList
          data={problems}
          numColumns={viewport.listNumColumns}
          key={viewport.listNumColumns}
          columnWrapperStyle={viewport.listNumColumns > 1 ? styles.columnRow : undefined}
          contentContainerStyle={[
            styles.list,
            problems.length === 0 && styles.listEmpty,
            viewport.isTablet && { maxWidth: viewport.contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          keyExtractor={(item) => `${item.bundleId}_${item.pageId}`}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{t('folder.empty')}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const title = bundleDisplayTitle(item.bundle);
            return (
              <View style={viewport.listNumColumns > 1 ? styles.gridCell : undefined}>
              <BundleGalleryCard
                bundleId={item.bundleId}
                sourceSubjectId={subject.id}
                thumbnailUri={item.page.asset.thumbnailUri}
                titleLabel={title}
                dateLabel={item.bundle.studyDate}
                countLabel={t('folder.problemLabel', { n: index + 1 })}
                onOpen={() =>
                  router.push({
                    pathname: '/bundle/[id]',
                    params: { id: item.bundleId, pageId: item.pageId },
                  })
                }
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onDelete={() => confirmDeleteProblem(item.bundleId, item.pageId)}
              />
              </View>
            );
          }}
        />
        <View style={styles.footerAdd}>{addProblemZone}</View>
      </Screen>
      <SubjectDropDock currentSubjectId={subject.id} subjects={data.subjects} />
      <DragMoveGhost pageX={ghost.x} pageY={ghost.y} visible={ghost.visible} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20 },
  cancelMove: { alignSelf: 'flex-end', marginTop: -12, marginBottom: 8 },
  cancelMoveText: { fontSize: theme.font.caption, fontWeight: '700', color: theme.orange },
  emptyWrap: { paddingHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', color: theme.gray, marginTop: 24, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  columnRow: { gap: 12, marginBottom: 12 },
  gridCell: { flex: 1, minWidth: 0 },
  footerAdd: { paddingHorizontal: 16, paddingBottom: 8 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  addZone: {
    marginTop: 8,
    minHeight: 120,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.orange,
    backgroundColor: theme.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  addZonePressed: { opacity: 0.85 },
  addTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.orange,
  },
  addHint: {
    fontSize: theme.font.caption,
    color: theme.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
});

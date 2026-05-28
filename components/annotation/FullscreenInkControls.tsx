import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { HIGHLIGHTER_TOOLS } from '@/lib/domain/defaults';
import { inkToolKind, inkToolLabelKey } from '@/lib/domain/ink-tool-labels';
import { widthOptionsForTool } from '@/lib/domain/ink-sizes';
import type { InkToolId } from '@/lib/domain/types';
import type { FullscreenViewerLayout } from '@/lib/ui/fullscreen-viewer-layout';

import type { InkPickerFlow } from './use-fullscreen-ink-flow';

type InkKind = 'pen' | 'highlighter' | 'eraser';

type FlowApi = {
  flow: InkPickerFlow;
  activeKind: ReturnType<typeof inkToolKind>;
  openKind: (kind: InkKind) => void;
  pickColor: (id: InkToolId) => void;
  pickSize: (width: number) => void;
};

type Props = {
  tool: InkToolId;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  layout: FullscreenViewerLayout;
  flowApi: FlowApi;
  /** 도구 버튼만 (태블릿 가로 상단 바) */
  kindOnly?: boolean;
  /** 색상·굵기 패널만 */
  pickerOnly?: boolean;
};

function colorForTool(id: InkToolId): string {
  if (id === 'pen-black') return '#000000';
  if (id === 'pen-white') return '#FFFFFF';
  if (id === 'pen-red') return '#DC2626';
  if (id === 'pen-blue') return '#2563EB';
  const hi = HIGHLIGHTER_TOOLS.find((h) => h.id === id);
  if (hi) return hi.color;
  return theme.gray;
}

const PEN_COLOR_CHOICES: { id: InkToolId; color: string }[] = [
  { id: 'pen-black', color: '#000000' },
  { id: 'pen-white', color: '#FFFFFF' },
  { id: 'pen-red', color: '#DC2626' },
  { id: 'pen-blue', color: '#2563EB' },
];

export function FullscreenInkControls({
  tool,
  penWidth,
  highlighterWidth,
  eraserWidth,
  layout,
  flowApi,
  kindOnly = false,
  pickerOnly = false,
}: Props) {
  const { t } = useTranslation();
  const { flow, activeKind, openKind, pickColor, pickSize } = flowApi;
  const m = layout.metrics;

  const dynamic = useMemo(
    () =>
      StyleSheet.create({
        kindBtn: {
          paddingHorizontal: m.kindBtnPaddingH,
          paddingVertical: m.kindBtnPaddingV,
          borderRadius: theme.radius.pill,
        },
        kindBtnText: { fontSize: m.kindFontSize, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
        picker: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: theme.radius.md,
          padding: m.pickerPadding,
          width: '100%',
          maxWidth: m.pickerMaxWidth,
        },
        pickerTitle: {
          fontSize: m.chipLabelSize + 1,
          fontWeight: '800',
          color: theme.gray,
          marginBottom: m.toolbarGap,
          textAlign: 'center',
        },
        pickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: m.pickerGap },
        swatch: {
          width: m.swatchSize,
          height: m.swatchSize,
          borderRadius: m.swatchSize / 2,
          borderWidth: 1,
          borderColor: theme.grayLight,
        },
        chipLabel: { fontSize: m.chipLabelSize, fontWeight: '700', color: theme.black },
        sizeChip: {
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: m.kindBtnPaddingH * 0.6,
          paddingVertical: m.kindBtnPaddingV * 0.75,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.grayLight,
          minWidth: layout.isPhone ? 52 : 64,
        },
      }),
    [m, layout.isPhone]
  );

  const kindBtn = (kind: InkKind, title: string) => (
    <Pressable
      onPress={() => openKind(kind)}
      style={[dynamic.kindBtn, flow === null && activeKind === kind && styles.kindBtnOn]}>
      <Text style={[dynamic.kindBtnText, flow === null && activeKind === kind && styles.kindBtnTextOn]}>
        {title}
      </Text>
    </Pressable>
  );

  const kindRow = (
    <View style={[styles.kindRow, { maxWidth: layout.inkToolbarMaxWidth }]}>
      {kindBtn('pen', t('item.inkGroupPen'))}
      {kindBtn('highlighter', t('item.inkGroupHighlighter'))}
      {kindBtn('eraser', t('item.inkGroupEraser'))}
    </View>
  );

  if (kindOnly) {
    return <View style={styles.kindOnlyWrap}>{kindRow}</View>;
  }

  const colorTools: { id: InkToolId }[] =
    flow?.step === 'color' && flow.kind === 'pen'
      ? PEN_COLOR_CHOICES.map((c) => ({ id: c.id }))
      : flow?.step === 'color' && flow.kind === 'highlighter'
        ? HIGHLIGHTER_TOOLS.map((h) => ({ id: h.id }))
        : [];

  const sizeToolId = flow?.step === 'size' ? flow.toolId : tool;
  const sizeOptions = flow?.step === 'size' ? widthOptionsForTool(sizeToolId) : [];
  const sizeCurrent =
    flow?.kind === 'eraser'
      ? eraserWidth
      : flow?.kind === 'highlighter'
        ? highlighterWidth
        : penWidth;

  const label = (id: InkToolId) => t(`item.${inkToolLabelKey(id)}`);

  const picker =
    flow?.step === 'color' ? (
      <View style={dynamic.picker}>
        <Text style={dynamic.pickerTitle}>
          {flow.kind === 'pen' ? t('item.pickPenColor') : t('item.pickHighlighterColor')}
        </Text>
        <View style={dynamic.pickerRow}>
          {colorTools.map((ink) => (
            <Pressable key={ink.id} onPress={() => pickColor(ink.id)} style={styles.colorChip}>
              <View
                style={[
                  dynamic.swatch,
                  { backgroundColor: colorForTool(ink.id) },
                  ink.id === 'pen-white' && styles.whiteSwatch,
                ]}
              />
              <Text style={dynamic.chipLabel}>{label(ink.id)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ) : flow?.step === 'size' ? (
      <View style={dynamic.picker}>
        <Text style={dynamic.pickerTitle}>
          {flow.kind === 'eraser'
            ? t('item.eraserSize')
            : flow.kind === 'pen'
              ? t('item.penStrokeSize')
              : t('item.highlighterStrokeSize')}
        </Text>
        <View style={dynamic.pickerRow}>
          {sizeOptions.map((w, i) => (
            <Pressable
              key={w}
              onPress={() => pickSize(w)}
              style={[dynamic.sizeChip, Math.abs(sizeCurrent - w) < 0.01 && styles.sizeChipOn]}>
              <View
                style={[
                  styles.sizeDot,
                  flow.kind === 'eraser' && styles.sizeDotEraser,
                  {
                    width: Math.min(m.sizeDotMax, 6 + w * 0.4),
                    height: Math.min(m.sizeDotMax, 6 + w * 0.4),
                    borderRadius: flow.kind === 'eraser' ? 3 : 99,
                    backgroundColor: flow.kind === 'eraser' ? theme.gray : colorForTool(sizeToolId),
                  },
                ]}
              />
              <Text style={dynamic.chipLabel}>{t('item.strokeSizeStep', { step: i + 1 })}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ) : null;

  if (pickerOnly) {
    if (!picker) return null;
    return (
      <View style={[styles.pickerOnlyWrap, { paddingHorizontal: layout.isPhone ? 12 : 24 }]}>
        {picker}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { gap: m.toolbarGap, paddingHorizontal: layout.isPhone ? 12 : 20 }]}>
      {kindRow}
      {picker}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  kindOnlyWrap: { alignItems: 'center', justifyContent: 'center' },
  pickerOnlyWrap: { alignItems: 'center', width: '100%', marginBottom: 4 },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  kindBtnOn: { backgroundColor: theme.orange },
  kindBtnTextOn: { color: theme.white },
  colorChip: { alignItems: 'center', gap: 4, minWidth: 48 },
  whiteSwatch: { borderColor: '#B8B8B8', borderWidth: 1.5 },
  sizeChipOn: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
  sizeDot: { opacity: 0.95 },
  sizeDotEraser: { backgroundColor: theme.gray },
});

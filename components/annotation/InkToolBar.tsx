import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { HIGHLIGHTER_TOOLS, PEN_TOOLS } from '@/lib/domain/defaults';
import { inkToolKind, inkToolLabelKey } from '@/lib/domain/ink-tool-labels';
import {
  ERASER_WIDTHS,
  HIGHLIGHTER_WIDTHS,
  PEN_WIDTHS,
  isHighlighterTool,
  widthOptionsForTool,
} from '@/lib/domain/ink-sizes';
import type { InkToolId } from '@/lib/domain/types';
import { useViewportLayout } from '@/lib/ui/viewport-layout';

type Props = {
  tool: InkToolId;
  penWidth: number;
  highlighterWidth: number;
  eraserWidth: number;
  onToolChange: (tool: InkToolId) => void;
  onPenWidthChange: (width: number) => void;
  onHighlighterWidthChange: (width: number) => void;
  onEraserWidthChange: (width: number) => void;
  onBeforeToolChange?: () => void;
};

type PickerTarget = InkToolId | null;

function colorForTool(id: InkToolId): string {
  const pen = PEN_TOOLS.find((p) => p.id === id);
  if (pen) return pen.color;
  const hi = HIGHLIGHTER_TOOLS.find((h) => h.id === id);
  if (hi) return hi.color;
  return theme.gray;
}

export function InkToolBar({
  tool,
  penWidth,
  highlighterWidth,
  eraserWidth,
  onToolChange,
  onPenWidthChange,
  onHighlighterWidthChange,
  onEraserWidthChange,
  onBeforeToolChange,
}: Props) {
  const { t } = useTranslation();
  const viewport = useViewportLayout();
  const [pickerFor, setPickerFor] = useState<PickerTarget>(null);
  const chipPad = viewport.isPhone ? 10 : 14;
  const swatchSize = viewport.isPhone ? 22 : 28;
  const sizeDotMax = viewport.isPhone ? 28 : 34;

  const label = (id: InkToolId) => t(`item.${inkToolLabelKey(id)}`);

  const activeWidth = useMemo(() => {
    if (tool === 'eraser') return eraserWidth;
    if (isHighlighterTool(tool)) return highlighterWidth;
    return penWidth;
  }, [tool, penWidth, highlighterWidth, eraserWidth]);

  const openPicker = (ink: InkToolId) => {
    onBeforeToolChange?.();
    onToolChange(ink);
    setPickerFor(ink);
  };

  const applyWidth = (ink: InkToolId, width: number) => {
    if (ink === 'eraser') onEraserWidthChange(width);
    else if (isHighlighterTool(ink)) onHighlighterWidthChange(width);
    else onPenWidthChange(width);
    setPickerFor(null);
  };

  const pickerKind = pickerFor ? inkToolKind(pickerFor) : null;
  const pickerWidths = pickerFor ? widthOptionsForTool(pickerFor) : [];
  const pickerCurrent =
    pickerFor === 'eraser'
      ? eraserWidth
      : pickerFor && isHighlighterTool(pickerFor)
        ? highlighterWidth
        : penWidth;

  const pickerTitle =
    pickerKind === 'eraser'
      ? t('item.eraserSize')
      : pickerKind === 'highlighter'
        ? t('item.highlighterStrokeSize')
        : pickerKind === 'pen'
          ? t('item.penStrokeSize')
          : '';

  const widthHint =
    tool === 'eraser'
      ? t('item.currentEraserSize', {
          step: ERASER_WIDTHS.findIndex((w) => Math.abs(w - eraserWidth) < 0.01) + 1 || 2,
        })
      : isHighlighterTool(tool)
        ? t('item.currentHighlighterSize', {
            step:
              HIGHLIGHTER_WIDTHS.findIndex((w) => Math.abs(w - highlighterWidth) < 0.01) + 1 || 2,
          })
        : t('item.currentPenSize', {
            step: PEN_WIDTHS.findIndex((w) => Math.abs(w - penWidth) < 0.01) + 1 || 2,
          });

  const renderColorChip = (ink: { id: InkToolId }) => (
    <Pressable
      key={ink.id}
      onPress={() => openPicker(ink.id)}
      style={[
        styles.colorChip,
        { paddingHorizontal: chipPad, paddingVertical: chipPad * 0.8 },
        tool === ink.id && styles.colorChipOn,
      ]}>
      <View
        style={[
          styles.colorSwatch,
          { width: swatchSize, height: swatchSize, borderRadius: swatchSize / 2 },
          { backgroundColor: colorForTool(ink.id) },
        ]}
      />
      <Text style={[styles.colorLabel, tool === ink.id && styles.colorLabelOn]}>{label(ink.id)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t('item.inkGroupPen')}</Text>
        <View style={styles.colorRow}>{PEN_TOOLS.map(renderColorChip)}</View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t('item.inkGroupHighlighter')}</Text>
        <View style={styles.colorRow}>{HIGHLIGHTER_TOOLS.map(renderColorChip)}</View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t('item.inkGroupEraser')}</Text>
        <Pressable
          onPress={() => openPicker('eraser')}
          style={[styles.eraserChip, tool === 'eraser' && styles.colorChipOn]}>
          <Text style={[styles.eraserLabel, tool === 'eraser' && styles.colorLabelOn]}>
            {t('item.inkEraser')}
          </Text>
        </Pressable>
      </View>

      {pickerFor ? (
        <View style={styles.sizePicker}>
          <Text style={styles.sizePickerTitle}>{pickerTitle}</Text>
          <View style={styles.sizeRow}>
            {pickerWidths.map((w, i) => (
              <Pressable
                key={w}
                onPress={() => applyWidth(pickerFor, w)}
                style={[
                  styles.sizeChip,
                  Math.abs(pickerCurrent - w) < 0.01 && styles.sizeChipOn,
                ]}>
                <View
                  style={[
                    styles.sizeDot,
                    pickerKind === 'eraser' && styles.sizeDotEraser,
                    {
                      width: Math.min(sizeDotMax, 8 + w * 0.45),
                      height: Math.min(sizeDotMax, 8 + w * 0.45),
                      borderRadius: pickerKind === 'eraser' ? 4 : 999,
                      backgroundColor:
                        pickerKind === 'eraser' ? theme.gray : colorForTool(pickerFor),
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.sizeLabel,
                    Math.abs(pickerCurrent - w) < 0.01 && styles.sizeLabelOn,
                  ]}>
                  {t('item.strokeSizeStep', { step: i + 1 })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.widthHint}>{widthHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 12 },
  group: { gap: 8 },
  groupTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.gray,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    minWidth: 52,
  },
  colorChipOn: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
  colorSwatch: {
    borderWidth: 1,
    borderColor: theme.grayLight,
  },
  colorLabel: { fontSize: 11, fontWeight: '700', color: theme.black },
  colorLabelOn: { color: theme.orange },
  eraserChip: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
  },
  eraserLabel: { fontSize: 12, fontWeight: '800', color: theme.black },
  sizePicker: {
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.orange,
  },
  sizePickerTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.gray,
    marginBottom: 10,
  },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeChip: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.grayLight,
    minWidth: 56,
  },
  sizeChipOn: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
  sizeDot: { opacity: 0.9 },
  sizeDotEraser: { backgroundColor: theme.gray },
  sizeLabel: { fontSize: 11, fontWeight: '700', color: theme.gray },
  sizeLabelOn: { color: theme.orange },
  widthHint: {
    fontSize: 11,
    color: theme.gray,
    fontWeight: '600',
  },
});

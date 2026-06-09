import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import {
  MEMO_TEXT_BOX_DEFAULT_FILL,
  memoTextBoxSurface,
  normalizeMemoTextBoxFill,
  normalizeMemoTextBoxTone,
} from '@/lib/domain/memo-text-box-style';
import type { MemoTextBox, MemoTextBoxTone } from '@/lib/domain/types';

export type { MemoTextBox };

type Props = {
  box: MemoTextBox;
  active: boolean;
  editing: boolean;
  interactive: boolean;
  surfaceWidth: number;
  surfaceHeight: number;
  placeholder: string;
  toneLightLabel: string;
  toneDarkLabel: string;
  onChange: (patch: Partial<MemoTextBox>) => void;
  onActivate: () => void;
  onRemove: () => void;
};

type LiveRect = { x: number; y: number; width: number; height: number };
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const MIN_W = 72;
const MIN_H = 40;
const CORNER_HIT = 26;
const DRAG_STRIP = 10;

const GESTURE_WEB: ViewStyle =
  Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as object) : {};

function resizeFromCorner(
  corner: Corner,
  origin: LiveRect,
  dx: number,
  dy: number,
  sw: number,
  sh: number
): LiveRect {
  let { x, y, width, height } = origin;

  if (corner === 'br') {
    width = Math.max(MIN_W, Math.min(sw - x, origin.width + dx));
    height = Math.max(MIN_H, Math.min(sh - y, origin.height + dy));
  } else if (corner === 'bl') {
    const right = origin.x + origin.width;
    let nx = origin.x + dx;
    let nw = right - nx;
    if (nw < MIN_W) {
      nw = MIN_W;
      nx = right - MIN_W;
    }
    if (nx < 0) {
      nx = 0;
      nw = right;
    }
    x = nx;
    width = nw;
    height = Math.max(MIN_H, Math.min(sh - y, origin.height + dy));
  } else if (corner === 'tr') {
    width = Math.max(MIN_W, Math.min(sw - x, origin.width + dx));
    const bottom = origin.y + origin.height;
    let ny = origin.y + dy;
    let nh = bottom - ny;
    if (nh < MIN_H) {
      nh = MIN_H;
      ny = bottom - MIN_H;
    }
    if (ny < 0) {
      ny = 0;
      nh = bottom;
    }
    y = ny;
    height = nh;
  } else {
    const right = origin.x + origin.width;
    const bottom = origin.y + origin.height;
    let nx = origin.x + dx;
    let nw = right - nx;
    if (nw < MIN_W) {
      nw = MIN_W;
      nx = right - MIN_W;
    }
    if (nx < 0) {
      nx = 0;
      nw = right;
    }
    let ny = origin.y + dy;
    let nh = bottom - ny;
    if (nh < MIN_H) {
      nh = MIN_H;
      ny = bottom - MIN_H;
    }
    if (ny < 0) {
      ny = 0;
      nh = bottom;
    }
    x = nx;
    y = ny;
    width = nw;
    height = nh;
  }

  return { x, y, width, height };
}

function OpacitySlider({
  value,
  knobColor,
  onChange,
}: {
  value: number;
  knobColor: string;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const dragging = useRef(false);

  const setFromX = useCallback(
    (localX: number) => {
      if (trackWidth <= 0) return;
      const next = Math.max(0, Math.min(1, localX / trackWidth));
      onChange(next);
    },
    [onChange, trackWidth]
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    dragging.current = true;
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    const localX = t.locationX ?? 0;
    setFromX(localX);
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    if (!dragging.current) return;
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    setFromX(t.locationX ?? 0);
  };

  const onTouchEnd = () => {
    dragging.current = false;
  };

  const knobLeft = Math.max(0, Math.min(1, value)) * Math.max(0, trackWidth - 14);

  return (
    <View
      style={[styles.sliderTrack, GESTURE_WEB]}
      onLayout={onTrackLayout}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      accessibilityRole="adjustable"
      accessibilityLabel="Text box opacity">
      <View style={styles.sliderGradient} pointerEvents="none" />
      <View
        style={[
          styles.sliderKnob,
          {
            left: knobLeft,
            backgroundColor: knobColor,
            borderColor: value >= 0.72 ? theme.grayLight : theme.orange,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

export function MemoTextBoxView({
  box,
  active,
  editing,
  interactive,
  surfaceWidth,
  surfaceHeight,
  placeholder,
  toneLightLabel,
  toneDarkLabel,
  onChange,
  onActivate,
  onRemove,
}: Props) {
  const tone = normalizeMemoTextBoxTone(box.tone);
  const fillLevel = normalizeMemoTextBoxFill(box.fillLevel);
  const surface = memoTextBoxSurface(tone, fillLevel);

  const [liveRect, setLiveRect] = useState<LiveRect | null>(null);

  const boxRef = useRef(box);
  const surfaceRef = useRef({ width: surfaceWidth, height: surfaceHeight });
  const flagsRef = useRef({ interactive, active, editing });
  const liveRectRef = useRef<LiveRect | null>(null);
  const dragOrigin = useRef<LiveRect | null>(null);
  const resizeOrigin = useRef<LiveRect | null>(null);
  const resizeCornerRef = useRef<Corner>('br');
  const draggingRef = useRef(false);
  const touchStartRef = useRef({ pageX: 0, pageY: 0 });

  boxRef.current = box;
  surfaceRef.current = { width: surfaceWidth, height: surfaceHeight };
  flagsRef.current = { interactive, active, editing };

  useEffect(() => {
    liveRectRef.current = null;
    draggingRef.current = false;
    setLiveRect(null);
  }, [box.id]);

  const rect: LiveRect = liveRect ?? {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };

  const canEdit = () => {
    const f = flagsRef.current;
    return f.interactive && f.active && f.editing;
  };

  const currentRect = (): LiveRect => {
    const b = boxRef.current;
    return liveRectRef.current ?? {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
    };
  };

  const clampMove = (x: number, y: number, w: number, h: number) => {
    const sw = surfaceRef.current.width;
    const sh = surfaceRef.current.height;
    return {
      x: Math.max(0, Math.min(sw - w, x)),
      y: Math.max(0, Math.min(sh - h, y)),
      width: w,
      height: h,
    };
  };

  const setLive = (next: LiveRect) => {
    liveRectRef.current = next;
    setLiveRect(next);
  };

  const applyDragDelta = (dx: number, dy: number) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    const next = clampMove(origin.x + dx, origin.y + dy, origin.width, origin.height);
    setLive(next);
  };

  const bindMoveGesture = () => ({
    onTouchStart: (e: GestureResponderEvent) => {
      if (!canEdit()) return;
      const t = e.nativeEvent.touches[0];
      if (!t) return;
      const r = currentRect();
      dragOrigin.current = r;
      touchStartRef.current = { pageX: t.pageX, pageY: t.pageY };
      draggingRef.current = true;
      onActivate();
    },
    onTouchMove: (e: GestureResponderEvent) => {
      if (!draggingRef.current) return;
      const t = e.nativeEvent.touches[0];
      if (!t) return;
      applyDragDelta(t.pageX - touchStartRef.current.pageX, t.pageY - touchStartRef.current.pageY);
    },
    onTouchEnd: () => {
      if (!draggingRef.current) return;
      const cur = liveRectRef.current;
      if (cur) onChange({ x: cur.x, y: cur.y });
      liveRectRef.current = null;
      draggingRef.current = false;
      setLiveRect(null);
    },
    onTouchCancel: () => {
      liveRectRef.current = null;
      draggingRef.current = false;
      setLiveRect(null);
    },
  });

  const movePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canEdit(),
      onStartShouldSetPanResponderCapture: () => canEdit(),
      onMoveShouldSetPanResponder: () => draggingRef.current || canEdit(),
      onPanResponderGrant: () => {
        dragOrigin.current = currentRect();
        draggingRef.current = true;
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        if (!draggingRef.current) return;
        applyDragDelta(g.dx, g.dy);
      },
      onPanResponderRelease: () => {
        const cur = liveRectRef.current;
        if (cur) onChange({ x: cur.x, y: cur.y });
        liveRectRef.current = null;
        draggingRef.current = false;
        setLiveRect(null);
      },
      onPanResponderTerminate: () => {
        liveRectRef.current = null;
        draggingRef.current = false;
        setLiveRect(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const makeResizePan = (corner: Corner) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => canEdit(),
      onStartShouldSetPanResponderCapture: () => canEdit(),
      onMoveShouldSetPanResponder: () => canEdit(),
      onPanResponderGrant: () => {
        resizeCornerRef.current = corner;
        resizeOrigin.current = currentRect();
        onActivate();
      },
      onPanResponderMove: (_, g) => {
        const origin = resizeOrigin.current;
        if (!origin) return;
        const sw = surfaceRef.current.width;
        const sh = surfaceRef.current.height;
        const next = resizeFromCorner(corner, origin, g.dx, g.dy, sw, sh);
        setLive(next);
      },
      onPanResponderRelease: () => {
        const cur = liveRectRef.current;
        if (cur) onChange({ x: cur.x, y: cur.y, width: cur.width, height: cur.height });
        liveRectRef.current = null;
        setLiveRect(null);
      },
      onPanResponderTerminate: () => {
        liveRectRef.current = null;
        setLiveRect(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });

  const resizeTL = useRef(makeResizePan('tl')).current;
  const resizeTR = useRef(makeResizePan('tr')).current;
  const resizeBL = useRef(makeResizePan('bl')).current;
  const resizeBR = useRef(makeResizePan('br')).current;

  const moveGesture = bindMoveGesture();
  const showChrome = active && editing;

  const toggleTone = () => {
    const next: MemoTextBoxTone = tone === 'light' ? 'dark' : 'light';
    onChange({ tone: next });
  };

  const cornerHandle = (corner: Corner, pan: ReturnType<typeof PanResponder.create>, style: ViewStyle) =>
    showChrome ? (
      <View
        key={corner}
        style={[styles.cornerHit, style, GESTURE_WEB]}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Resize text box"
      />
    ) : null;

  return (
    <View
      style={[
        styles.textBox,
        {
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          backgroundColor: surface.backgroundColor,
          zIndex: showChrome ? 8 : 4,
        },
        showChrome ? styles.textBoxEditing : styles.textBoxIdle,
        active && !editing && styles.textBoxSelected,
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}>
      {showChrome ? (
        <View style={styles.textBoxHeader}>
          <Pressable
            onPress={toggleTone}
            hitSlop={8}
            style={styles.dotsBtn}
            accessibilityRole="button"
            accessibilityLabel={tone === 'light' ? toneLightLabel : toneDarkLabel}>
            <Text style={[styles.dragHint, { color: surface.hintColor }]}>⋯</Text>
          </Pressable>
          <OpacitySlider
            value={fillLevel}
            knobColor={surface.sliderKnobColor}
            onChange={(fillLevel) => onChange({ fillLevel })}
          />
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>×</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        {showChrome ? (
          <>
            <View
              style={[styles.dragStripTop, GESTURE_WEB]}
              {...moveGesture}
              {...movePan.panHandlers}
            />
            <View style={styles.bodyMid}>
              <View
                style={[styles.dragStripSide, GESTURE_WEB]}
                {...moveGesture}
                {...movePan.panHandlers}
              />
              <View style={styles.textColumn}>
                <TextInput
                  style={[styles.textInput, { color: surface.textColor }]}
                  multiline
                  value={box.text}
                  editable={showChrome}
                  onChangeText={(text) => onChange({ text })}
                  onFocus={onActivate}
                  placeholder={placeholder}
                  placeholderTextColor={surface.placeholderColor}
                />
                <View
                  style={[styles.dragFill, GESTURE_WEB]}
                  {...moveGesture}
                  {...movePan.panHandlers}
                />
              </View>
              <View
                style={[styles.dragStripSide, GESTURE_WEB]}
                {...moveGesture}
                {...movePan.panHandlers}
              />
            </View>
            <View
              style={[styles.dragStripBottom, GESTURE_WEB]}
              {...moveGesture}
              {...movePan.panHandlers}
            />
          </>
        ) : (
          <TextInput
            style={[styles.textInput, styles.textInputIdle, { color: surface.textColor }]}
            multiline
            value={box.text}
            editable={false}
            placeholder={placeholder}
            placeholderTextColor={surface.placeholderColor}
          />
        )}
      </View>

      {cornerHandle('tl', resizeTL, { left: 0, top: 0 })}
      {cornerHandle('tr', resizeTR, { right: 0, top: 0 })}
      {cornerHandle('bl', resizeBL, { left: 0, bottom: 0 })}
      {cornerHandle('br', resizeBR, { right: 0, bottom: 0 })}
    </View>
  );
}

const styles = StyleSheet.create({
  textBox: {
    position: 'absolute',
    borderRadius: 6,
    padding: 4,
  },
  textBoxEditing: {
    borderWidth: 2,
    borderColor: theme.orange,
  },
  textBoxIdle: {
    borderWidth: 0,
  },
  textBoxSelected: {
    borderWidth: 1,
    borderColor: theme.orange,
    borderStyle: 'dashed',
  },
  textBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 26,
    gap: 6,
  },
  dotsBtn: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHint: { fontWeight: '800', fontSize: 16, lineHeight: 18 },
  sliderTrack: {
    flex: 1,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.grayLight,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 72,
  },
  sliderGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.grayLight,
    opacity: 0.35,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0), rgba(0,0,0,0.85))',
          opacity: 1,
        } as object)
      : {
          borderLeftWidth: 0,
        }),
  },
  sliderKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    top: 3,
  },
  deleteChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteChipText: { color: theme.onAccent, fontWeight: '800', fontSize: 14, lineHeight: 16 },
  body: {
    flex: 1,
    minHeight: 0,
  },
  dragStripTop: {
    height: DRAG_STRIP,
    width: '100%',
  },
  dragStripBottom: {
    height: DRAG_STRIP,
    width: '100%',
  },
  bodyMid: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  dragStripSide: {
    width: DRAG_STRIP,
    alignSelf: 'stretch',
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  dragFill: {
    flex: 1,
    minHeight: 8,
  },
  textInput: {
    fontSize: 14,
    textAlignVertical: 'top',
    padding: 0,
    backgroundColor: 'transparent',
    minHeight: 20,
  },
  textInputIdle: {
    flex: 1,
  },
  cornerHit: {
    position: 'absolute',
    width: CORNER_HIT,
    height: CORNER_HIT,
    zIndex: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'nwse-resize' } as object) : null),
  },
});

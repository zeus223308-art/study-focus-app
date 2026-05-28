import { useEffect, useState } from 'react';

import { PEN_TOOLS, HIGHLIGHTER_TOOLS } from '@/lib/domain/defaults';
import { inkToolKind } from '@/lib/domain/ink-tool-labels';
import type { InkToolId } from '@/lib/domain/types';

type InkKind = 'pen' | 'highlighter' | 'eraser';

export type InkPickerFlow =
  | null
  | { kind: 'pen' | 'highlighter'; step: 'color' }
  | { kind: InkKind; step: 'size'; toolId: InkToolId };

type Params = {
  visible: boolean;
  tool: InkToolId;
  onToolChange: (tool: InkToolId) => void;
  onPenWidthChange: (w: number) => void;
  onHighlighterWidthChange: (w: number) => void;
  onEraserWidthChange: (w: number) => void;
  onBeforeInkUse?: () => void;
};

export function useFullscreenInkFlow({
  visible,
  tool,
  onToolChange,
  onPenWidthChange,
  onHighlighterWidthChange,
  onEraserWidthChange,
  onBeforeInkUse,
}: Params) {
  const [flow, setFlow] = useState<InkPickerFlow>(null);

  useEffect(() => {
    if (!visible) setFlow(null);
  }, [visible]);

  const activeKind = inkToolKind(tool);

  const openKind = (kind: InkKind) => {
    onBeforeInkUse?.();
    if (kind === 'eraser') {
      onToolChange('eraser');
      setFlow({ kind: 'eraser', step: 'size', toolId: 'eraser' });
      return;
    }
    if (kind === 'pen') {
      const nextPenTool = inkToolKind(tool) === 'pen' ? tool : PEN_TOOLS[0].id;
      onToolChange(nextPenTool);
      setFlow({ kind: 'pen', step: 'color' });
      return;
    }
    const nextHighlighterTool =
      inkToolKind(tool) === 'highlighter' ? tool : HIGHLIGHTER_TOOLS[0].id;
    onToolChange(nextHighlighterTool);
    setFlow({ kind: 'highlighter', step: 'color' });
  };

  const pickColor = (id: InkToolId) => {
    if (!flow || flow.step !== 'color') return;
    onToolChange(id);
    setFlow({ kind: flow.kind, step: 'size', toolId: id });
  };

  const pickSize = (width: number) => {
    if (!flow || flow.step !== 'size') return;
    if (flow.kind === 'eraser') onEraserWidthChange(width);
    else if (flow.kind === 'highlighter') onHighlighterWidthChange(width);
    else onPenWidthChange(width);
    onToolChange(flow.toolId);
    setFlow(null);
  };

  const clearFlow = () => setFlow(null);

  return { flow, activeKind, openKind, pickColor, pickSize, clearFlow };
}

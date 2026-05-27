/** Resolve the underlying DOM node from a react-native-web host ref. */
export function resolveWebElement(node: unknown): HTMLElement | null {
  if (node == null || typeof window === 'undefined') return null;

  if (node instanceof HTMLElement) return node;

  const any = node as {
    nodeType?: number;
    tagName?: string;
    getScrollableNode?: () => HTMLElement;
    _touchableNode?: HTMLElement;
  };

  if (typeof any.nodeType === 'number' && any.tagName) {
    return node as HTMLElement;
  }

  if (typeof any.getScrollableNode === 'function') {
    const scrollable = any.getScrollableNode();
    if (scrollable instanceof HTMLElement) return scrollable;
  }

  if (any._touchableNode instanceof HTMLElement) {
    return any._touchableNode;
  }

  return null;
}

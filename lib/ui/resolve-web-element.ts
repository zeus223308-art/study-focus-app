/** Resolve the underlying DOM node from a react-native-web host ref. */
export function resolveWebElement(node: unknown): HTMLElement | null {
  if (node == null || typeof window === 'undefined') return null;
  if (node instanceof HTMLElement) return node;

  const candidate = node as {
    getScrollableNode?: () => HTMLElement;
    _touchableNode?: HTMLElement;
    childNodes?: NodeList;
  };

  if (typeof candidate.getScrollableNode === 'function') {
    const scrollable = candidate.getScrollableNode();
    if (scrollable instanceof HTMLElement) return scrollable;
  }

  if (candidate._touchableNode instanceof HTMLElement) {
    return candidate._touchableNode;
  }

  if (node instanceof Node && 'childNodes' in node) {
    const first = (node as HTMLElement).firstElementChild;
    if (first instanceof HTMLElement) return first;
  }

  return null;
}

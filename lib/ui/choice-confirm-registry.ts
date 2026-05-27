export type ChoiceConfirmRequest = {
  title: string;
  message?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void | Promise<void>;
  onNo?: () => void;
};

let showChoiceConfirm: ((request: ChoiceConfirmRequest) => void) | null = null;

export function registerChoiceConfirm(
  handler: ((request: ChoiceConfirmRequest) => void) | null
) {
  showChoiceConfirm = handler;
}

export function presentChoiceConfirm(request: ChoiceConfirmRequest) {
  showChoiceConfirm?.(request);
}

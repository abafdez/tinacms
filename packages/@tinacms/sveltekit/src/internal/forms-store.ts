import { escapeAttr } from './escape';

export interface CollectedForm {
  id: string;
  query: string;
  variables: object;
  data: object;
  priority?: 'primary';
}

export const TINA_FORMS: unique symbol = Symbol.for(
  '@tinacms/sveltekit/forms'
) as never;

export interface TinaLocals {
  [TINA_FORMS]?: CollectedForm[];
}

export function recordForm(locals: TinaLocals, form: CollectedForm): void {
  const forms = locals[TINA_FORMS];
  if (!forms) return;

  const existing = forms.find((entry) => entry.id === form.id);
  if (existing) {
    if (form.priority === 'primary') existing.priority = 'primary';
    return;
  }
  forms.push(form);
}

export function sortByPriority(forms: CollectedForm[]): CollectedForm[] {
  return [...forms].sort(
    (a, b) =>
      (a.priority === 'primary' ? 0 : 1) - (b.priority === 'primary' ? 0 : 1)
  );
}

export function renderFormPayloadDiv(
  form: CollectedForm,
  primary: boolean
): string {
  return `<div data-tina-form="${escapeAttr(JSON.stringify(form))}"${
    primary ? ' data-tina-primary' : ''
  } hidden></div>`;
}

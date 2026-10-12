import type { Handle } from '@sveltejs/kit/hooks';
import { EDIT_COOKIE_HEADER, isEditMode } from './is-edit-mode';
import {
  renderFormPayloadDiv,
  sortByPriority,
  TINA_FORMS,
  type TinaLocals,
} from './internal/forms-store';

const HEAD_CLOSE = '</head>';

/**
 * SvelteKit server hook for Tina visual editing. Compose this with other
 * handles using `sequence` from `@sveltejs/kit/hooks`.
 */
export const tinaHandle: Handle = async ({ event, resolve }) => {
  const locals = event.locals as TinaLocals;
  locals[TINA_FORMS] = [];

  const response = await resolve(event);
  if (!isEditMode(event.request)) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.append('Set-Cookie', EDIT_COOKIE_HEADER);

  const contentType = headers.get('content-type') ?? '';
  if (
    !contentType.includes('text/html') ||
    response.status === 204 ||
    response.status === 304
  ) {
    return new Response(
      response.status === 204 || response.status === 304 ? null : response.body,
      {
        status: response.status,
        statusText: response.statusText,
        headers,
      }
    );
  }

  const html = await response.text();
  const headEnd = html.indexOf(HEAD_CLOSE);
  if (headEnd === -1) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const forms = sortByPriority(locals[TINA_FORMS] ?? [])
    .map((form, index) => renderFormPayloadDiv(form, index === 0))
    .join('');
  const bridge =
    '<script type="module">import{init}from"/admin/bridge.js";init();</script>';

  return new Response(
    html.slice(0, headEnd) + forms + bridge + html.slice(headEnd),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    }
  );
};

export default tinaHandle;

import { addMetadata, hashFromQuery } from '@tinacms/bridge/metadata';
import { readOverlay } from '@tinacms/bridge/preview';
import type { RequestEvent } from '@sveltejs/kit';
import { recordForm, type TinaLocals } from './internal/forms-store';

export interface QueryResult<TData> {
  data: TData;
  query: string;
  variables: Record<string, unknown>;
  id: string;
}

type ClientResult<TData> =
  | {
      data: TData;
      query: string;
      variables: Record<string, unknown>;
    }
  | null
  | undefined;

export interface RequestOptions {
  priority?: 'primary';
}

export async function requestWithMetadata<TData>(
  source: ClientResult<TData> | Promise<ClientResult<TData>>,
  event: Pick<RequestEvent, 'request' | 'locals'>,
  options?: RequestOptions
): Promise<QueryResult<TData>> {
  let result: ClientResult<TData> = null;
  try {
    result = (await source) ?? null;
  } catch (error) {
    console.warn('[@tinacms/sveltekit] client query failed', error);
  }

  const query = result?.query ?? '';
  const variables = result?.variables ?? {};
  const id = hashFromQuery(JSON.stringify({ query, variables }));
  const data = (result?.data ?? {}) as TData;
  const overlay = await readOverlay<TData>(event.request, id);
  const resolvedData = overlay === undefined ? data : overlay;
  const enriched = {
    data: addMetadata(id, resolvedData) as TData,
    query,
    variables,
    id,
  };

  recordForm(event.locals as TinaLocals, {
    id,
    query,
    variables,
    data: enriched.data as unknown as object,
    priority: options?.priority,
  });

  return enriched;
}

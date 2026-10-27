import { addMetadata, hashFromQuery } from '@tinacms/bridge/metadata';
import { readOverlay } from '@tinacms/bridge/preview';
import { recordForm } from './internal/forms-store';
import { requestStore } from './internal/request-context';

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
  /** Mark the page's own document so the admin opens it on load instead
   *  of a layout-level global. Mirrors `useTina`'s
   *  `experimental___selectFormByFormId`. */
  priority?: 'primary';
}

export async function requestWithMetadata<TData>(
  source: ClientResult<TData> | Promise<ClientResult<TData>>,
  options?: RequestOptions
): Promise<QueryResult<TData>> {
  let result: ClientResult<TData> = null;
  try {
    result = (await source) ?? null;
  } catch (error) {
    // The client throws for a missing document and for a failed request
    // alike; both resolve to empty data so the page can answer with a 404.
    console.warn('[@tinacms/astro] client query failed', error);
  }

  const query = result?.query ?? '';
  const variables = result?.variables ?? {};
  const id = hashFromQuery(JSON.stringify({ query, variables }));
  const data = (result?.data ?? {}) as TData;

  const request = requestStore.getStore();
  let resolvedData: TData = data;
  if (request) {
    const overlay = await readOverlay<TData>(request, id);
    if (overlay !== undefined) {
      resolvedData = overlay;
    }
  }

  const enriched = {
    data: addMetadata(id, resolvedData) as TData,
    query,
    variables,
    id,
  };

  // A failed query has nothing the editor could open. Recording is a no-op
  // outside a request scope (static builds).
  if (query) {
    recordForm({
      id,
      query,
      variables,
      data: enriched.data as unknown as object,
      priority: options?.priority,
    });
  }

  return enriched;
}

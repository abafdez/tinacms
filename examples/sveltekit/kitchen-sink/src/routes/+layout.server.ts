import type { LayoutServerLoad } from './$types';
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '#tina/__generated__/client.ts';

export const load: LayoutServerLoad = async (event) => {
  let globalQuery = null;
  try {
    globalQuery = await requestWithMetadata(
      client.queries.global({ relativePath: 'index.json' }),
      event
    );
  } catch {
    // Graceful fallback if Tina local server is not running during simple checks
  }
  return { globalQuery };
};

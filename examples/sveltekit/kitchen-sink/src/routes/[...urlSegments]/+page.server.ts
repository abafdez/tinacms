import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '#tina/__generated__/client.ts';

export const prerender = true;

export const entries: EntryGenerator = async () => {
  const response = await client.queries.pageConnection({ first: 1000 });
  return (
    response.data.pageConnection.edges?.flatMap((edge) => {
      const urlSegments = edge?.node?._sys.breadcrumbs.join('/');
      return urlSegments && urlSegments !== 'home' ? [{ urlSegments }] : [];
    }) ?? []
  );
};

export const load: PageServerLoad = async (event) => {
  try {
    const pageQuery = await requestWithMetadata(
      client.queries.page({ relativePath: `${event.params.urlSegments}.md` }),
      event,
      { priority: 'primary' }
    );
    return { pageQuery };
  } catch {
    error(404, 'Page not found');
  }
};

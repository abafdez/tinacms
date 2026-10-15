import type { PageServerLoad, EntryGenerator } from './$types';
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '#tina/__generated__/client.ts';

export const prerender = true;

export const entries: EntryGenerator = async () => {
  const response = await client.queries.authorConnection({ first: 1000 });
  return (
    response.data.authorConnection.edges?.flatMap((edge) => {
      const slug = edge?.node?._sys.filename;
      return slug ? [{ slug }] : [];
    }) ?? []
  );
};

export const load: PageServerLoad = async (event) => {
  const authorQuery = await requestWithMetadata(
    client.queries.author({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: 'primary' }
  );

  return { authorQuery };
};

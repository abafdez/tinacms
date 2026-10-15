import { requestWithMetadata } from "@tinacms/sveltekit/data";
import client from "#tina/__generated__/client.ts";
export const prerender = true;

export async function entries() {
  const response = await client.queries.postConnection({ first: 1000 });
  return (
    response.data.postConnection.edges?.flatMap((edge) => {
      const slug = edge?.node?._sys.breadcrumbs?.join('/');
      return slug ? [{ slug }] : [];
    }) ?? []
  );
}

export function load(event) {
  return requestWithMetadata(
    client.queries.post({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: "primary" },
  );
}

// import { error } from '@sveltejs/kit';
// import client from '#tina/__generated__/client.ts';

// export async function load({ params }) {
// 	try {
// 		const post = await client.queries.post({ relativePath: `${params.slug}.md` });
// 		console.log(post.data);
// 		return {
// 			title: post.data.post.title,
// 			body: post.data.post.body
// 		};
// 	} catch (err) {
// 		console.log(err);
// 		throw error(404, `Post "${params.slug}" not found`);
// 	}
// }
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '#tina/__generated__/client.ts';

export const prerender = true;

export async function entries() {
  const response = await client.queries.postConnection();
  return (
    response.data.postConnection.edges?.flatMap((edge) => {
      const slug = edge?.node?._sys.filename;
      return slug ? [{ slug }] : [];
    }) ?? []
  );
}

export function load(event) {
  return requestWithMetadata(
    client.queries.post({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: 'primary' }
  );
}

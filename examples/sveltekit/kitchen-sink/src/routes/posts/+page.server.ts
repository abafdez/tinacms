import client from '#tina/__generated__/client.ts';
export const prerender = true;

export async function load() {
	const postsResponse = await client.queries.postConnection();
	const posts = postsResponse.data.postConnection.edges?.map((post) => {
		return { slug: post?.node?._sys.filename, title: post?.node?.title };
	});
	return { posts };
}
import { error } from '@sveltejs/kit';
import client from '#tina/__generated__/client.ts';

export async function load({ params }) {
	try {
		const post = await client.queries.post({ relativePath: `${params.slug}.md` });
		console.log(post.data);
		return {
			title: post.data.post.title,
			body: post.data.post.body
		};
	} catch (err) {
		console.log(err);
		throw error(404, `Post "${params.slug}" not found`);
	}
}

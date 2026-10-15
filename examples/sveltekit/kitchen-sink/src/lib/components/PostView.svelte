<script lang="ts">
	import { tinaField } from '@tinacms/sveltekit';
	import { subscribeToTinaData } from '@tinacms/sveltekit/data';
	import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
	import type { QueryResult } from '@tinacms/sveltekit/data';
	import type { PostQuery } from '#tina/__generated__/types.ts';

	let { query }: { query: QueryResult<PostQuery> } = $props();
	let preview = $state<{ id: string; data: PostQuery }>();

	$effect(() => {
		const currentQuery = query;
		return subscribeToTinaData(currentQuery, (data) => {
			preview = { id: currentQuery.id, data };
		});
	});

	let post = $derived(
		(preview?.id === query.id ? preview.data : query.data).post
	);
</script>

<h1 data-tina-field={tinaField(post, 'title')}>{post.title}</h1>
<div data-tina-field={tinaField(post, 'body')}>
	<TinaMarkdown content={post.body} />
</div>

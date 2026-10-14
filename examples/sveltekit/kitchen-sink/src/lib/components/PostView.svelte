<script lang="ts">
	import { tinaField } from '@tinacms/sveltekit';
	import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
	import type { QueryResult } from '@tinacms/sveltekit/data';
	import type { PostQuery } from '#tina/__generated__/types.ts';

	let { query }: { query: QueryResult<PostQuery> } = $props();
	let post = $derived(query.data.post);
</script>

<h1 data-tina-field={tinaField(post, 'title')}>{post.title}</h1>
<div data-tina-field={tinaField(post, 'body')}>
	<TinaMarkdown content={post.body} />
</div>

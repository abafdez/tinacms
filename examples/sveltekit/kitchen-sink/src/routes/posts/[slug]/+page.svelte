
<script lang="ts">
	import TinaIsland from '@tinacms/sveltekit/TinaIsland.svelte';
	import PostView from '#lib/components/PostView.svelte';

  let { data } = $props();
</script>

<TinaIsland
	name="post"
	wrapper={{ tag: 'article', className: 'post-content' }}
	params={{ slug: data.data.post._sys.filename }}
	primary
	managed
>
	<PostView query={data} />
</TinaIsland>

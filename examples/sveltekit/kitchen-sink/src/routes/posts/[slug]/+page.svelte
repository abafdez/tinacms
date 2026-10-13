
<script lang="ts">
  import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
  import { tinaField } from '@tinacms/sveltekit';
  // import Callout from '#lib/components/Callout.svelte';

  let { data } = $props();
  // const components = { Callout };
</script>

<div data-tina-field={tinaField(data.data.post.body, 'body')}>
  <TinaMarkdown content={data.data.post.body} />
</div>
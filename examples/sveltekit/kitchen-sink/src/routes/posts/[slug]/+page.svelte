
<script lang="ts">
  import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
  import { subscribeToTinaData } from '@tinacms/sveltekit/data';
  import { tinaField } from '@tinacms/sveltekit';

  let { data } = $props();
  let post = $state(data.data.post);

  $effect(() => {
    const query = data;
    post = query.data.post;
    return subscribeToTinaData(query, (updated) => {
      post = updated.post;
    });
  });
</script>

<div data-tina-field={tinaField(post, 'body')}>
  <TinaMarkdown content={post.body} />
</div>
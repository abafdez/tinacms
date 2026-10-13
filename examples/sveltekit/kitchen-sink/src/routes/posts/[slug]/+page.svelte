<script lang="ts">
//   import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
  let { data } = $props();
</script>

<article>
  <!-- data-tina-field highlights the field when clicked inside visual editing -->
  <h1 >
    {data.title}
  </h1>
  <!-- TODO: Rich-text body rendered via Svelte 5 TinaMarkdown -->
    <!-- <TinaMarkdown
      content={data.body}
    /> -->
    <pre>{JSON.stringify(data.body, null, 2)}</pre>
</article>

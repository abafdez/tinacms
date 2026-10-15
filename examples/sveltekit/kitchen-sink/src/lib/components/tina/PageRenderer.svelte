<script lang="ts">
  import Blocks from '../blocks/Blocks.svelte';
  import { tinaField } from '@tinacms/sveltekit';
  import { subscribeToTinaData, type QueryResult } from '@tinacms/sveltekit/data';

  let { query }: { query: QueryResult<any> } = $props();
  let preview = $state<{ id: string; data: any }>();

  $effect(() => {
    const currentQuery = query;
    return subscribeToTinaData(currentQuery, (data) => {
      preview = { id: currentQuery.id, data };
    });
  });

  const page = $derived(
    (preview?.id === query.id ? preview.data : query.data)?.page
  );
</script>

{#if !page}
  <div class="page-error">Error: No page data found</div>
{:else}
  <div data-tina-field={tinaField(page, 'blocks')}>
    {#if page.blocks && page.blocks.length > 0}
      <Blocks blocks={page.blocks} />
    {:else}
      <div class="empty-page">No blocks to display</div>
    {/if}
  </div>
{/if}

<style>
  .page-error {
    padding: var(--space-8);
    color: #dc2626;
    text-align: center;
  }

  .empty-page {
    padding: var(--space-8);
    text-align: center;
    color: var(--text-muted);
  }
</style>

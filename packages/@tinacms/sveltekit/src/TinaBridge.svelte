<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';

  let refreshForms: (() => void) | undefined;

  afterNavigate(() => refreshForms?.());

  onMount(() => {
    if (window.parent === window) return;

    void import(/* @vite-ignore */ '/admin/bridge.js').then((bridge) => {
      bridge.init();
      refreshForms = bridge.refreshForms;
    });
  });
</script>

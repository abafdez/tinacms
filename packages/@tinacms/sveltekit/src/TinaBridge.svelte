<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';

  let refreshForms: (() => void) | undefined;

  afterNavigate(() => refreshForms?.());

  onMount(() => {
    if (window.parent === window) return;
    console.log('Loading Tina Bridge...');
    const bridgeUrl = new URL('/admin/bridge.js', window.location.href).href;
    void import(/* @vite-ignore */ bridgeUrl).then((bridge) => {
      bridge.init();
      refreshForms = bridge.refreshForms;
    });
  });
</script>

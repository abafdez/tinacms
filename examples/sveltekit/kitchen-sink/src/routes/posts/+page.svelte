<script>
	let { data } = $props();
</script>

<h1>Blog Posts</h1>
<ul>
	{#each data.posts as post (post.slug)}
	<li>
			<a href="/posts/{post.slug}">
				<h2>{post.title}</h2>
			</a>
		</li>
	{/each}
</ul>
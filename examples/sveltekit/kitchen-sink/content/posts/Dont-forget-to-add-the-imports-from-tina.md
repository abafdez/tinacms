---
title: Don't forget to add the imports from tina!
---

In sveltekit 3 we've lost the $lib kind of aliases, now we set the aliases in the node.js way. go to package.json and this to the import object.

```json
"imports": {
		"#lib": "./src/lib/index.js",
		"#lib/*": "./src/lib/*",
		"#tina/*": "./tina/*"
	} 

```

> Bonus! → Add also the content folder to reference your posts!

```json
"#content/*": "./content/*"
```

import { defineConfig } from "tinacms";

import Announcement from "./collections/announcement";
import Author from "./collections/author";
import Blog from "./collections/blog";
import Global from "./collections/global";
import Page from "./collections/page";
import Post from "./collections/post";
import SEO from "./collections/seo";
import Tag from "./collections/tag";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  localContentPath: "../../../shared",
  build: {
    outputFolder: "admin",
    publicFolder: "static",
  },
  // Disable telemetry to avoid sending any data to Tina during development
  telemetry: "disabled",
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [Tag, Author, Global, Post, Blog, Page, SEO, Announcement],
  },
});

import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://kwesilarry1.github.io",
  integrations: [sitemap()],
});
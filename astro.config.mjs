import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://docs.astro.build/en/guides/deploy/github/
export default defineConfig({
  site: 'https://ashifkhan.com',
  output: 'static',
  integrations: [react()],
});
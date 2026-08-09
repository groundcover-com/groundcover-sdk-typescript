import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  output: 'src/_generated',
  types: {
    enums: 'javascript',
  },
});

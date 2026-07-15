import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: '/tmp/openapi3.yaml',
  output: 'src/_generated',
  types: {
    enums: 'javascript',
  },
});

import { initClient, metricsQuery } from '../../src/index.js';

async function run() {
  const client = initClient();
  const now = new Date();
  const start = new Date(now.getTime() - 15 * 60 * 1000);

  const result = await metricsQuery({
    client,
    body: {
      start: start.toISOString(),
      end: now.toISOString(),
      step: '1m',
      queryType: 'RANGE',
      promql: 'up',
    },
  });

  console.log('Error:', result.error);
  console.log('Data:', result.data);
  console.log('Response Status:', result.response?.status);
}

run().catch(console.error);

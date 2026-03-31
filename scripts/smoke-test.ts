import { DiscoveryService } from '../src/engine/discovery-service.js';

async function main() {
  const service = new DiscoveryService();
  const baseUrl = process.env.IUT_URL || 'https://api.georobotix.io/ogc/t18/api';

  console.log(`\n=== CS API Compliance Assessor -- Smoke Test ===`);
  console.log(`Target: ${baseUrl}\n`);

  try {
    const result = await service.discover(
      baseUrl,
      { type: 'none' as const },
      { timeoutMs: 30000, concurrency: 5 }
    );

    console.log(`Discovery successful!\n`);
    console.log(`Conformance classes declared: ${result.declaredClasses.length}`);
    result.declaredClasses.forEach(c => {
      console.log(`  ${c.supported ? '[OK]' : '[??]'} ${c.name} (${c.standardPart})`);
    });

    console.log(`\nDiscovery cache:`);
    console.log(`  Collections: ${result.cache.collectionIds.length}`);
    console.log(`  System ID: ${result.cache.systemId || 'none'}`);
    console.log(`  Deployment ID: ${result.cache.deploymentId || 'none'}`);
    console.log(`  Procedure ID: ${result.cache.procedureId || 'none'}`);
    console.log(`  Sampling Feature ID: ${result.cache.samplingFeatureId || 'none'}`);
    console.log(`  Property ID: ${result.cache.propertyId || 'none'}`);
    console.log(`  Datastream ID: ${result.cache.datastreamId || 'none'}`);
    console.log(`  Control Stream ID: ${result.cache.controlStreamId || 'none'}`);

    console.log(`\nHTTP exchanges: ${result.exchanges.size}`);

    // Show exchange details
    for (const [id, exchange] of result.exchanges) {
      console.log(`  ${exchange.request.method} ${exchange.request.url} -> ${exchange.response.statusCode} (${exchange.response.responseTimeMs}ms)`);
    }

    // Basic validation
    const errors: string[] = [];
    if (result.declaredClasses.length === 0) {
      errors.push('No conformance classes discovered');
    }
    if (result.exchanges.size < 2) {
      errors.push('Expected at least 2 HTTP exchanges (landing page + conformance)');
    }
    if (result.cache.conformsTo.length === 0) {
      errors.push('conformsTo array is empty');
    }

    if (errors.length > 0) {
      console.error(`\n=== Smoke test FAILED (validation) ===`);
      errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    }

    console.log(`\n=== Smoke test PASSED ===\n`);
  } catch (err) {
    console.error(`\n=== Smoke test FAILED ===`);
    console.error(err);
    process.exit(1);
  }
}

main();

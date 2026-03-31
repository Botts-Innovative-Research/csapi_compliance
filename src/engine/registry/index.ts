import { TestRegistry } from './registry';
import { commonTestModule } from './common';
import { featuresCoreTestModule } from './features-core';
import { crudTestModule } from './crud';
import { updateTestModule } from './update';
import { geojsonTestModule } from './geojson';
import { sensormlTestModule } from './sensorml';
import { systemFeaturesTestModule } from './system-features';
import { subsystemsTestModule } from './subsystems';
import { deploymentsTestModule } from './deployments';
import { subdeploymentsTestModule } from './subdeployments';
import { proceduresTestModule } from './procedures';
import { samplingTestModule } from './sampling';
import { propertiesTestModule } from './properties';
import { filteringTestModule } from './filtering';
import { part2CommonTestModule } from './part2-common';
import { part2JsonTestModule } from './part2-json';
import { datastreamsTestModule } from './datastreams';
import { controlstreamsTestModule } from './controlstreams';
import { part2FeasibilityTestModule } from './part2-feasibility';
import { part2EventsTestModule } from './part2-events';
import { part2HistoryTestModule } from './part2-history';
import { part2FilteringTestModule } from './part2-filtering';
import { part2CrudTestModule } from './part2-crud';
import { part2UpdateTestModule } from './part2-update';
import {
  sweJsonTestModule,
  sweTextTestModule,
  sweBinaryTestModule,
} from './part2-swe-encodings';

export { TestRegistry } from './registry';
export type { RegistryValidationResult } from './registry';

export function registerAllModules(registry: TestRegistry): void {
  registry.register(commonTestModule);
  registry.register(featuresCoreTestModule);
  registry.register(crudTestModule);
  registry.register(updateTestModule);
  registry.register(geojsonTestModule);
  registry.register(sensormlTestModule);
  registry.register(systemFeaturesTestModule);
  registry.register(subsystemsTestModule);
  registry.register(deploymentsTestModule);
  registry.register(subdeploymentsTestModule);
  registry.register(proceduresTestModule);
  registry.register(samplingTestModule);
  registry.register(propertiesTestModule);
  registry.register(filteringTestModule);
  registry.register(part2CommonTestModule);
  registry.register(part2JsonTestModule);
  registry.register(datastreamsTestModule);
  registry.register(controlstreamsTestModule);
  // Part 2 remaining modules
  registry.register(part2FeasibilityTestModule);
  registry.register(part2EventsTestModule);
  registry.register(part2HistoryTestModule);
  registry.register(part2FilteringTestModule);
  registry.register(part2CrudTestModule);
  registry.register(part2UpdateTestModule);
  registry.register(sweJsonTestModule);
  registry.register(sweTextTestModule);
  registry.register(sweBinaryTestModule);
}

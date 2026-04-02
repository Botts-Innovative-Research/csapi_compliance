// REQ-ENG-001: Test-to-requirement URI mapping types
// REQ-ENG-002: Three-state result enum
// REQ-ENG-013: Standardized test result data structure

/** Three-state test result. REQ-ENG-002. */
export type TestStatus = 'pass' | 'fail' | 'skip';

/** Aggregated class-level status. REQ-ENG-014. */
export type ClassStatus = 'pass' | 'fail' | 'skip';

/** Assessment lifecycle status. */
export type AssessmentStatus = 'discovering' | 'discovered' | 'running' | 'completed' | 'cancelled' | 'partial' | 'error';

/** Authentication type for IUT requests. REQ-DISC-008. */
export type AuthType = 'bearer' | 'apikey' | 'basic' | 'none';

/** Authentication configuration provided by the user. */
export interface AuthConfig {
  type: AuthType;
  /** Bearer token value */
  token?: string;
  /** API key header name */
  headerName?: string;
  /** API key header value */
  headerValue?: string;
  /** Basic auth username */
  username?: string;
  /** Basic auth password */
  password?: string;
}

/** Run configuration for an assessment. REQ-DISC-009, REQ-DISC-010. */
export interface RunConfig {
  timeoutMs: number;
  concurrency: number;
}

/** Captured HTTP request. REQ-CAP-001. */
export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** Captured HTTP response. REQ-CAP-002. */
export interface CapturedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
}

/** A paired request/response exchange. REQ-CAP-003. */
export interface HttpExchange {
  id: string;
  request: CapturedRequest;
  response: CapturedResponse;
  metadata: HttpExchangeMetadata;
}

export interface HttpExchangeMetadata {
  truncated: boolean;
  binaryBody: boolean;
  bodySize: number;
}

/** Result of a single test. REQ-ENG-013. */
export interface TestResult {
  /** Canonical requirement URI, e.g., "/req/system/canonical-url". REQ-ENG-001. */
  requirementUri: string;
  /** Corresponding conformance test URI, e.g., "/conf/system/canonical-url". */
  conformanceUri: string;
  /** Human-readable test name. */
  testName: string;
  /** Three-state result. REQ-ENG-002. */
  status: TestStatus;
  /** Human-readable failure message with assertion detail. REQ-ENG-003. */
  failureMessage?: string;
  /** Skip reason when status is 'skip'. REQ-ENG-004. */
  skipReason?: string;
  /** HTTP exchange IDs associated with this test. */
  exchangeIds: string[];
  /** Duration of the test in milliseconds. */
  durationMs: number;
}

/** Result of a conformance class. REQ-ENG-014. */
export interface ConformanceClassResult {
  /** Conformance class URI, e.g., "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system". */
  classUri: string;
  /** Human-readable class name. */
  className: string;
  /** Aggregated status. A class passes only if ALL its tests pass. */
  status: ClassStatus;
  /** Individual test results within this class. */
  tests: TestResult[];
  /** Count of tests by status. */
  counts: { pass: number; fail: number; skip: number };
}

/** Full assessment results. */
export interface AssessmentResults {
  /** Unique assessment ID. */
  id: string;
  /** IUT endpoint URL. */
  endpointUrl: string;
  /** Timestamp when assessment started. */
  startedAt: string;
  /** Timestamp when assessment completed. */
  completedAt?: string;
  /** Assessment lifecycle status. */
  status: AssessmentStatus;
  /** Per-class results. */
  classes: ConformanceClassResult[];
  /** All HTTP exchanges captured during the assessment. */
  exchanges: Map<string, HttpExchange>;
  /** Summary statistics. */
  summary: AssessmentSummary;
}

/** Summary statistics for an assessment. REQ-RPT-001. */
export interface AssessmentSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  compliancePercent: number;
  totalClasses: number;
  classesPassed: number;
  classesFailed: number;
  classesSkipped: number;
  durationMs: number;
}

// --- Conformance Registry Types (REQ-ENG-001) ---

/** Priority level of a requirement per OGC ModSpec. */
export type RequirementPriority = 'MUST' | 'SHOULD' | 'MAY';

/** Definition of a single testable requirement. */
export interface RequirementDefinition {
  /** Canonical requirement URI, e.g., "/req/system/canonical-url". */
  requirementUri: string;
  /** Corresponding conformance test URI. */
  conformanceUri: string;
  /** Human-readable name. */
  name: string;
  /** Priority level. */
  priority: RequirementPriority;
  /** Description of what the requirement tests. */
  description: string;
}

/** Definition of a conformance class with its requirements and dependencies. */
export interface ConformanceClassDefinition {
  /** Full conformance class URI. */
  classUri: string;
  /** Human-readable name. */
  name: string;
  /** OGC standard part (e.g., "common", "features", "cs-part1", "cs-part2"). */
  standardPart: string;
  /** URIs of prerequisite conformance classes. */
  dependencies: string[];
  /** Requirements in this class. */
  requirements: RequirementDefinition[];
  /** Whether this class involves write operations (CRUD/Update). */
  isWriteOperation: boolean;
}

// --- Test Execution Types ---

/** Context passed to each test function during execution. */
export interface TestContext {
  /** HTTP client for making requests to the IUT. */
  httpClient: HttpClientInterface;
  /** Schema validator for response validation. */
  schemaValidator: SchemaValidatorInterface;
  /** Base URL of the IUT (landing page URL). */
  baseUrl: string;
  /** Authentication configuration. */
  auth: AuthConfig;
  /** Run configuration. */
  config: RunConfig;
  /** Discovery cache populated during the discovery phase. */
  discoveryCache: DiscoveryCache;
  /** Cancellation token. */
  cancelToken: CancelToken;
}

/** Interface for the HTTP client used by tests. */
export interface HttpClientInterface {
  request(opts: RequestOptions): Promise<HttpResponse>;
  get(url: string, headers?: Record<string, string>): Promise<HttpResponse>;
  post(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse>;
  put(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse>;
  patch(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse>;
  delete(url: string, headers?: Record<string, string>): Promise<HttpResponse>;
}

export interface RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | object;
  timeoutMs?: number;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
  exchange: HttpExchange;
}

/** Schema validator interface for test functions. */
export interface SchemaValidatorInterface {
  validate(schemaRef: string, data: unknown): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
}

export interface SchemaError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

/** A single executable test function. */
export type TestFunction = (ctx: TestContext) => Promise<TestResult>;

/** An executable test bundling the requirement definition with its test function. */
export interface ExecutableTest {
  requirement: RequirementDefinition;
  execute: TestFunction;
}

/** Interface for a conformance class test module. */
export interface ConformanceClassTest {
  /** The conformance class this module tests. */
  classDefinition: ConformanceClassDefinition;
  /** Create the executable tests for this class. */
  createTests(ctx: TestContext): ExecutableTest[];
}

/** Cooperative cancellation token. */
export interface CancelToken {
  cancelled: boolean;
  onCancel(fn: () => void): void;
  cancel(): void;
}

/** Data discovered during the initial endpoint discovery phase. */
export interface DiscoveryCache {
  /** Landing page JSON response. */
  landingPage: Record<string, unknown>;
  /** Conformance declaration (conformsTo URIs). */
  conformsTo: string[];
  /** API definition URL (if discovered). */
  apiDefinitionUrl?: string;
  /** Available collection IDs. */
  collectionIds: string[];
  /** Links from the landing page. */
  links: LinkObject[];
  // Part 1 resource discovery
  systemId?: string;
  deploymentId?: string;
  procedureId?: string;
  samplingFeatureId?: string;
  propertyId?: string;
  // Part 2 resource discovery
  datastreamId?: string;
  observationId?: string;
  controlStreamId?: string;
  commandId?: string;
}

export interface LinkObject {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

// --- Progress Event Types ---

export type ProgressEventType =
  | 'assessment-started'
  | 'class-started'
  | 'test-started'
  | 'test-completed'
  | 'class-completed'
  | 'assessment-completed';

export interface ProgressEvent {
  type: ProgressEventType;
  assessmentId: string;
  timestamp: string;
  data: ProgressEventData;
}

export interface ProgressEventData {
  className?: string;
  classUri?: string;
  testName?: string;
  requirementUri?: string;
  status?: TestStatus;
  completedTests?: number;
  totalTests?: number;
  completedClasses?: number;
  totalClasses?: number;
}

// --- Assessment Session ---

export interface AssessmentSession {
  id: string;
  endpointUrl: string;
  selectedClasses: string[];
  auth: AuthConfig;
  config: RunConfig;
  cancelToken: CancelToken;
  status: AssessmentStatus;
  results?: AssessmentResults;
  discoveryCache?: DiscoveryCache;
  createdAt: string;
}

// --- Resolved Dependency Plan ---

export interface ResolvedPlan {
  orderedClasses: ConformanceClassDefinition[];
  autoIncluded: string[];
}

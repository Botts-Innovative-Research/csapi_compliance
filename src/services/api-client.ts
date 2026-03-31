import type { AuthConfig, RunConfig, AssessmentSession } from '@/lib/types.js';

export interface CreateAssessmentResponse {
  id: string;
  discoveryResult: {
    landingPage: Record<string, unknown>;
    conformsTo: string[];
    collectionIds: string[];
    links: Array<{ rel: string; href: string; type?: string; title?: string }>;
    apiDefinitionUrl?: string;
    systemId?: string;
    deploymentId?: string;
    procedureId?: string;
    samplingFeatureId?: string;
    propertyId?: string;
    datastreamId?: string;
    observationId?: string;
    controlStreamId?: string;
    commandId?: string;
  };
}

export interface StartAssessmentResponse {
  id: string;
  status: string;
}

export interface CancelAssessmentResponse {
  id: string;
  status: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as Record<string, unknown>).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  /**
   * Create an assessment by discovering the endpoint.
   * POST /api/assessments
   */
  async createAssessment(params: {
    endpointUrl: string;
    auth?: AuthConfig;
    config?: RunConfig;
  }): Promise<CreateAssessmentResponse> {
    const response = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<CreateAssessmentResponse>(response);
  },

  /**
   * Start a configured assessment.
   * POST /api/assessments/:id/start
   */
  async startAssessment(
    id: string,
    params: {
      conformanceClasses: string[];
      auth?: AuthConfig;
      config?: RunConfig;
    },
  ): Promise<StartAssessmentResponse> {
    const response = await fetch(`/api/assessments/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<StartAssessmentResponse>(response);
  },

  /**
   * Get assessment details.
   * GET /api/assessments/:id
   */
  async getAssessment(id: string): Promise<AssessmentSession> {
    const response = await fetch(`/api/assessments/${id}`);
    return handleResponse<AssessmentSession>(response);
  },

  /**
   * Cancel a running assessment.
   * POST /api/assessments/:id/cancel
   */
  async cancelAssessment(id: string): Promise<CancelAssessmentResponse> {
    const response = await fetch(`/api/assessments/${id}/cancel`, {
      method: 'POST',
    });
    return handleResponse<CancelAssessmentResponse>(response);
  },

  /**
   * Export assessment results as JSON.
   * GET /api/assessments/:id/export/json
   */
  async exportJson(id: string): Promise<Blob> {
    const response = await fetch(`/api/assessments/${id}/export/json`);
    if (!response.ok) {
      throw new ApiError(
        `Export failed with status ${response.status}`,
        response.status,
      );
    }
    return response.blob();
  },
};

export { ApiError };
export default apiClient;

/**
 * Ataccama REST API Client
 * Direct HTTP client for Ataccama ONE API - works on serverless (Vercel)
 */

export interface AtaccamaConfig {
  serverUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  keycloakClientSecret?: string;
  username?: string;
  password?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  type?: string;
  connection_name?: string;
  source?: string;
  owner_email?: string;
  steward_email?: string;
  description?: string;
  last_profiled_at?: string;
}

export interface DQOverview {
  overall_score?: number;
  dq_score?: number;
  validity_score?: number;
  completeness_score?: number;
  uniqueness_score?: number;
  consistency_score?: number;
  timeliness_score?: number;
}

export interface AtaccamaSearchResult {
  items: CatalogItem[];
  total: number;
}

/**
 * Ataccama REST API Client
 */
export class AtaccamaClient {
  private config: AtaccamaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config?: Partial<AtaccamaConfig>) {
    this.config = {
      serverUrl: config?.serverUrl || process.env.ATACCAMA_SERVER_URL || 'https://dogfooding.ataccama.one',
      keycloakRealm: config?.keycloakRealm || process.env.KEYCLOAK_REALM || 'dogfooding-zesty',
      keycloakClientId: config?.keycloakClientId || process.env.KEYCLOAK_CLIENT_ID || 'agentbe-ataccama-mcp-public-client',
      keycloakClientSecret: config?.keycloakClientSecret || process.env.KEYCLOAK_CLIENT_SECRET,
      username: config?.username || process.env.ATACCAMA_USERNAME,
      password: config?.password || process.env.ATACCAMA_PASSWORD,
    };
  }

  /**
   * Get OAuth token from Keycloak
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const keycloakUrl = `${this.config.serverUrl}/auth/realms/${this.config.keycloakRealm}/protocol/openid-connect/token`;

    const params = new URLSearchParams();
    params.append('client_id', this.config.keycloakClientId);

    if (this.config.keycloakClientSecret) {
      // Client credentials flow
      params.append('grant_type', 'client_credentials');
      params.append('client_secret', this.config.keycloakClientSecret);
    } else if (this.config.username && this.config.password) {
      // Resource owner password flow
      params.append('grant_type', 'password');
      params.append('username', this.config.username);
      params.append('password', this.config.password);
    } else {
      throw new Error('Ataccama authentication not configured. Set KEYCLOAK_CLIENT_SECRET or ATACCAMA_USERNAME/PASSWORD');
    }

    const response = await fetch(keycloakUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Keycloak auth failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.config.serverUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ataccama API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Search for catalog items
   */
  async searchCatalogItems(query: string, connectionTypes?: string[]): Promise<AtaccamaSearchResult> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (connectionTypes?.length) params.append('connectionTypes', connectionTypes.join(','));
    params.append('limit', '20');

    try {
      const result = await this.apiRequest<{ data: CatalogItem[]; total: number }>(
        `/api/metadata-management/v2/catalog-items?${params.toString()}`
      );
      return {
        items: result.data || [],
        total: result.total || 0,
      };
    } catch (error) {
      console.error('[Ataccama] Search failed:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get catalog item details
   */
  async getCatalogItemDetails(catalogItemId: string): Promise<CatalogItem | null> {
    try {
      return await this.apiRequest<CatalogItem>(
        `/api/metadata-management/v2/catalog-items/${catalogItemId}`
      );
    } catch (error) {
      console.error('[Ataccama] Get details failed:', error);
      return null;
    }
  }

  /**
   * Get DQ overview for a catalog item
   */
  async getCatalogItemDQOverview(catalogItemId: string): Promise<DQOverview | null> {
    try {
      // Try the DQ evaluation endpoint
      const result = await this.apiRequest<{
        overallScore?: number;
        overall_score?: number;
        dqScore?: number;
        dimensions?: Array<{ name: string; score: number }>;
      }>(
        `/api/data-quality/v2/catalog-items/${catalogItemId}/evaluation-overview`
      );

      // Normalize the response
      const overview: DQOverview = {};

      if (result.overallScore !== undefined) {
        overview.overall_score = result.overallScore;
      } else if (result.overall_score !== undefined) {
        overview.overall_score = result.overall_score;
      } else if (result.dqScore !== undefined) {
        overview.dq_score = result.dqScore;
      }

      // Extract dimension scores if available
      if (result.dimensions) {
        for (const dim of result.dimensions) {
          const name = dim.name.toLowerCase();
          if (name.includes('valid')) overview.validity_score = dim.score;
          else if (name.includes('complet')) overview.completeness_score = dim.score;
          else if (name.includes('unique')) overview.uniqueness_score = dim.score;
          else if (name.includes('consist')) overview.consistency_score = dim.score;
          else if (name.includes('timeli')) overview.timeliness_score = dim.score;
        }
      }

      return overview;
    } catch (error) {
      console.error('[Ataccama] Get DQ overview failed:', error);
      return null;
    }
  }

  /**
   * Get profiling information for a catalog item
   */
  async getCatalogItemProfiling(catalogItemId: string): Promise<unknown> {
    try {
      return await this.apiRequest(
        `/api/metadata-management/v2/catalog-items/${catalogItemId}/profiling`
      );
    } catch (error) {
      console.error('[Ataccama] Get profiling failed:', error);
      return null;
    }
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return !!(
      (this.config.keycloakClientSecret) ||
      (this.config.username && this.config.password)
    );
  }
}

// Singleton instance
let ataccamaClient: AtaccamaClient | null = null;

export function getAtaccamaClient(): AtaccamaClient {
  if (!ataccamaClient) {
    ataccamaClient = new AtaccamaClient();
  }
  return ataccamaClient;
}

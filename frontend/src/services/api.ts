// API service for connecting to the FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

export interface FloodData {
  timestamp: string;
  floodProbability: number;
  risk_level?: string;  // Model-determined risk classification
  rainfall: number;
  waterLevel: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  soilMoisture: number;
  drainageCapacity: number;
  riverDischarge: number;
  deforestation: number;
  climateChange: number;
  cloudCover: number;
  urbanization: number;
  latitude?: number;
  longitude?: number;
}

export interface DehradunLocationData {
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  elevation: number;
  rivers: string[];
  population: number;
  area_km2: number;
  flood_zones: Array<{
    name: string;
    coordinates: [number, number][];
    risk_level: string;
  }>;
}

export interface SystemStatus {
  is_monitoring: boolean;
  total_readings: number;
  last_reading_time: string | null;
  current_scenario: string;
  uptime_seconds: number;
}

export interface Analytics {
  avg_flood_probability: number;
  max_flood_probability: number;
  total_high_risk_readings: number;
  trend_direction: string;
  risk_distribution: { [key: string]: number };
}

class FloodMonitoringAPI {
  private ws: WebSocket | null = null;
  private wsListeners: ((data: FloodData) => void)[] = [];

  // Get system status
  async getStatus(): Promise<SystemStatus> {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return response.json();
  }

  // Start monitoring
  async startMonitoring(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start monitoring');
    }
  }

  // Stop monitoring
  async stopMonitoring(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to stop monitoring');
    }
  }

  // Set scenario (normal, heavy_rain, extreme_weather)
  async setScenario(scenario: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok) {
      throw new Error('Failed to set scenario');
    }
  }

  // Get recent readings
  async getRecentReadings(limit: number = 50): Promise<FloodData[]> {
    const response = await fetch(`${API_BASE_URL}/api/recent-readings?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch recent readings');
    }
    const data = await response.json();
    // Backend returns data directly as an array, not wrapped in { readings: [] }
    return Array.isArray(data) ? data : [];
  }

  // Get analytics
  async getAnalytics(): Promise<Analytics> {
    const response = await fetch(`${API_BASE_URL}/api/analytics`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    return response.json();
  }

  // Get Dehradun location data
  async getDehradunLocation(): Promise<DehradunLocationData> {
    const response = await fetch(`${API_BASE_URL}/api/dehradun-location`);
    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }
    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; monitoring_active: boolean }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Failed to check health');
    }
    return response.json();
  }

  // WebSocket connection for real-time data
  connectWebSocket(): void {
    try {
      this.ws = new WebSocket(`ws://localhost:8000/ws`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data: FloodData = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  // Add listener for real-time data
  onRealtimeData(callback: (data: FloodData) => void): void {
    this.wsListeners.push(callback);
  }

  // Remove listener
  removeRealtimeListener(callback: (data: FloodData) => void): void {
    const index = this.wsListeners.indexOf(callback);
    if (index > -1) {
      this.wsListeners.splice(index, 1);
    }
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsListeners = [];
  }

  // Check if backend is reachable
  async isBackendReachable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const floodAPI = new FloodMonitoringAPI();
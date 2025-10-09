import React, { useState, useEffect } from 'react';
import Header from './Header.tsx';
import StatusCards from './StatusCards.tsx';
import RealTimeChart from './RealTimeChart.tsx';
import SensorReadings from './SensorReadings.tsx';
import FloodMap from './FloodMap.tsx';
import AlertsComponent from './AlertsComponent';
import AlertPortal from './AlertPortal';
import SystemControls from './SystemControls.tsx';
import { floodAPI, type FloodData } from '../services/api.ts';

interface SensorData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floodProbability: number;
  rainfall: number;
  waterLevel: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  soilMoisture: number;
  drainageCapacity: number;
  lastUpdate: string;
  status: 'online' | 'offline' | 'warning';
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const FloodMonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<FloodData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentData, setCurrentData] = useState<FloodData | null>(null);
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'sensors' | 'alerts' | 'portal' | 'controls'>('overview');

  // Initialize sensor locations for Dehradun
  const initializeSensors = (): SensorData[] => {
    const sensorLocations = [
      { id: 'sensor-1', name: 'Central Dehradun', lat: 30.3165, lng: 78.0322 },
      { id: 'sensor-2', name: 'Rajpur Road', lat: 30.3255, lng: 78.0422 },
      { id: 'sensor-3', name: 'Clement Town', lat: 30.3065, lng: 78.0222 },
      { id: 'sensor-4', name: 'Mussoorie Road', lat: 30.3365, lng: 78.0522 },
      { id: 'sensor-5', name: 'Haridwar Road', lat: 30.2965, lng: 78.0122 },
    ];

    return sensorLocations.map(location => ({
      ...location,
      latitude: location.lat,
      longitude: location.lng,
      floodProbability: Math.random() * 0.8 + 0.1,
      rainfall: Math.random() * 50,
      waterLevel: Math.random() * 5 + 1,
      temperature: Math.random() * 15 + 20,
      humidity: Math.random() * 40 + 40,
      windSpeed: Math.random() * 30,
      soilMoisture: Math.random() * 60 + 20,
      drainageCapacity: Math.random() * 100 + 50,
      lastUpdate: new Date().toISOString(),
      status: Math.random() > 0.8 ? 'warning' : 'online' as 'online' | 'warning',
    }));
  };

  // DISABLED: Generate sample data for testing (using real WebSocket data instead)
  // const generateSampleData = (): FloodData => {
  //   return {
  //     timestamp: new Date().toISOString(),
  //     floodProbability: Math.random() * 0.8 + 0.1,
  //     rainfall: Math.random() * 50,
  //     waterLevel: Math.random() * 5 + 1,
  //     temperature: Math.random() * 15 + 20,
  //     humidity: Math.random() * 40 + 40,
  //     windSpeed: Math.random() * 30,
  //     soilMoisture: Math.random() * 60 + 20,
  //     drainageCapacity: Math.random() * 100 + 50,
  //     riverDischarge: Math.random() * 200 + 100,
  //     deforestation: Math.random() * 0.3,
  //     climateChange: Math.random() * 0.4,
  //     cloudCover: Math.random() * 100,
  //     urbanization: Math.random() * 0.8 + 0.2,
  //     latitude: 30.3165 + (Math.random() - 0.5) * 0.1,
  //     longitude: 78.0322 + (Math.random() - 0.5) * 0.1,
  //   };
  // };

  // Generate alerts based on MODEL's risk classification only
  const generateAlerts = (sensorData: SensorData[]): Alert[] => {
    const newAlerts: Alert[] = [];
    
    sensorData.forEach(sensor => {
      // Only use the model's risk classification, not probability thresholds
      const riskLevel = (sensor as any).risk_level; // Type assertion since SensorData might not have risk_level
      
      if (riskLevel === 'SEVERE' || riskLevel === 'HIGH') {
        newAlerts.push({
          id: `alert-${sensor.id}-${Date.now()}`,
          type: riskLevel === 'SEVERE' ? 'critical' : 'warning',
          title: `${riskLevel} Flood Risk Detected`,
          message: `Model determined ${riskLevel} flood risk at ${sensor.name} (${(sensor.floodProbability * 100).toFixed(1)}%)`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }
      
      if (sensor.status === 'warning') {
        newAlerts.push({
          id: `sensor-${sensor.id}-${Date.now()}`,
          type: 'warning',
          title: 'Sensor Communication Warning',
          message: `Intermittent connection issues with sensor at ${sensor.name}`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }
    });
    
    return newAlerts;
  };

  // Automatic alert triggering function
  const triggerAutoAlerts = async (riskLevel: string, floodProbability: number) => {
    try {
      console.log(`🚨 Auto-triggering alerts for ${riskLevel} risk level...`);
      const response = await fetch('http://localhost:8000/api/alerts/auto-send', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Auto-alerts sent to ${result.alerts_sent} users`);
      } else {
        console.error('❌ Failed to send auto-alerts');
      }
    } catch (error) {
      console.error('❌ Error sending auto-alerts:', error);
    }
  };

  // DISABLED: Update sensor data (using real API data instead)
  // const updateSensorData = () => {
  //   setSensors(prev => prev.map(sensor => ({
  //     ...sensor,
  //     floodProbability: Math.random() * 0.8 + 0.1,
  //     rainfall: Math.random() * 50,
  //     waterLevel: Math.random() * 5 + 1,
  //     temperature: Math.random() * 15 + 20,
  //     humidity: Math.random() * 40 + 40,
  //     windSpeed: Math.random() * 30,
  //     soilMoisture: Math.random() * 60 + 20,
  //     drainageCapacity: Math.random() * 100 + 50,
  //     lastUpdate: new Date().toISOString(),
  //     status: Math.random() > 0.9 ? 'warning' : 'online' as 'online' | 'warning',
  //   })));
  // };

  // Initialize backend connection and data
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        // Check if backend is reachable
        const isReachable = await floodAPI.isBackendReachable();
        setIsConnected(isReachable);
        
        if (isReachable) {
          // Get initial status
          const status = await floodAPI.getStatus();
          setIsMonitoring(status.is_monitoring);
          
          // Load initial data from API
          console.log('Loading initial data from API...');
          const recentReadings = await floodAPI.getRecentReadings(20);
          console.log('API returned data:', recentReadings);
          setData(recentReadings);
          if (recentReadings.length > 0) {
            setCurrentData(recentReadings[recentReadings.length - 1]);
          }
          
          // Connect WebSocket for real-time updates
          floodAPI.connectWebSocket();
          floodAPI.onRealtimeData((newData: FloodData) => {
            console.log('WebSocket received data:', newData);
            setCurrentData(newData);
            setData(prev => [...prev.slice(-49), newData]);
            setIsConnected(true);
            
            // Automatically trigger alerts for HIGH or SEVERE risk
            if (newData.risk_level && ['HIGH', 'SEVERE'].includes(newData.risk_level.toUpperCase())) {
              triggerAutoAlerts(newData.risk_level, newData.floodProbability);
            }
          });
        } else {
          console.warn('Backend not reachable, using mock data');
          // Fall back to mock data if backend is not available
          setSensors(initializeSensors());
        }
      } catch (error) {
        console.error('Error initializing backend:', error);
        setIsConnected(false);
        // Fall back to mock data
        setSensors(initializeSensors());
      }
    };

    initializeBackend();

    // Cleanup WebSocket on unmount
    return () => {
      floodAPI.disconnectWebSocket();
    };
  }, []);

  // DISABLED: Real-time data simulation (using WebSocket instead)
  // useEffect(() => {
  //   if (!isMonitoring) return;

  //   const interval = setInterval(() => {
  //     const newData = generateSampleData();
  //     setCurrentData(newData);
  //     setData(prev => [...prev.slice(-49), newData]); // Keep last 50 points
  //     updateSensorData();
  //     setIsConnected(true);
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, [isMonitoring]);

  // Generate alerts based on sensor data
  useEffect(() => {
    if (sensors.length > 0 && isMonitoring) {
      const newAlerts = generateAlerts(sensors);
      setAlerts(prev => [...prev, ...newAlerts].slice(-20)); // Keep last 20 alerts
    }
  }, [sensors, isMonitoring]);

  // Control functions
  const handleStartMonitoring = async () => {
    try {
      await floodAPI.startMonitoring();
      setIsMonitoring(true);
      setIsConnected(true);
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await floodAPI.stopMonitoring();
      setIsMonitoring(false);
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const handleResetSystem = () => {
    setData([]);
    setAlerts([]);
    setSensors(initializeSensors());
    setCurrentData(null);
    setIsConnected(false);
  };

  const handleExportData = async () => {
    try {
      // Get recent data from API if available
      const exportData = isConnected ? await floodAPI.getRecentReadings(1000) : data;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flood-monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleRefreshConnection = async () => {
    try {
      const isReachable = await floodAPI.isBackendReachable();
      setIsConnected(isReachable);
      
      if (isReachable) {
        floodAPI.connectWebSocket();
      }
    } catch (error) {
      console.error('Error refreshing connection:', error);
      setIsConnected(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealTimeChart data={data} isConnected={isConnected} />
            <SensorReadings latestData={currentData} isConnected={isConnected} />
          </div>
        );
      case 'map':
        return <FloodMap latestData={currentData} historicalData={data} />;
      case 'sensors':
        return <SensorReadings latestData={currentData} isConnected={isConnected} />;
      case 'alerts':
        return <AlertsComponent isConnected={isConnected} />;
      case 'portal':
        return <AlertPortal />;
      case 'controls':
        return (
          <SystemControls
            isMonitoring={isMonitoring}
            isConnected={isConnected}
            dataCount={data.length}
            onStartMonitoring={handleStartMonitoring}
            onStopMonitoring={handleStopMonitoring}
            onPauseMonitoring={handleStopMonitoring}
            onResetData={handleResetSystem}
            onExportData={handleExportData}
            onRefreshConnection={handleRefreshConnection}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header isConnected={isConnected} isMonitoring={isMonitoring} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <StatusCards 
            currentData={currentData} 
            isConnected={isConnected} 
          />
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'map', label: 'Map View', icon: '🗺️' },
                { id: 'sensors', label: 'Sensors', icon: '📡' },
                { id: 'alerts', label: 'Alerts', icon: '⚠️' },
                { id: 'portal', label: 'Alert Portal', icon: '📱' },
                { id: 'controls', label: 'Controls', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs animate-pulse">
                      {alerts.filter(a => !a.acknowledged).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FloodMonitoringDashboard;
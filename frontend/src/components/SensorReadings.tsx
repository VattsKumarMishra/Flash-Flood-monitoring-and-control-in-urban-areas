import React from 'react';
import { Droplets, Thermometer, Wind, CloudRain, TreePine, Activity } from 'lucide-react';

interface FloodData {
  timestamp: string;
  floodProbability: number;
  rainfall: number;
  waterLevel: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  soilMoisture: number;
  drainageCapacity: number;
  riverDischarge: number;
  deforestation?: number;
  climateChange?: number;
  cloudCover?: number;
  urbanization?: number;
  latitude?: number;
  longitude?: number;
  risk_level?: string;
}

interface SensorReadingsProps {
  latestData: FloodData | null;
  isConnected: boolean;
}

const SensorReadings: React.FC<SensorReadingsProps> = ({ latestData, isConnected }) => {
  if (!latestData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sensor Readings</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📡</div>
            <p>No sensor data available</p>
            <p className="text-sm">Start monitoring to see live readings</p>
          </div>
        </div>
      </div>
    );
  }

  const sensorGroups = [
    {
      title: "Weather Conditions",
      icon: <CloudRain className="w-5 h-5" />,
      sensors: [
        {
          name: "Rainfall",
          value: latestData.rainfall,
          unit: "mm/h",
          icon: <Droplets className="w-4 h-4" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          name: "Temperature",
          value: latestData.temperature,
          unit: "°C",
          icon: <Thermometer className="w-4 h-4" />,
          color: "text-orange-600",
          bgColor: "bg-orange-50"
        },
        {
          name: "Humidity",
          value: latestData.humidity,
          unit: "%",
          icon: <Droplets className="w-4 h-4" />,
          color: "text-cyan-600",
          bgColor: "bg-cyan-50"
        },
        {
          name: "Wind Speed",
          value: latestData.windSpeed,
          unit: "km/h",
          icon: <Wind className="w-4 h-4" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50"
        }
      ]
    },
    {
      title: "Water & Environment",
      icon: <TreePine className="w-5 h-5" />,
      sensors: [
        {
          name: "Water Level",
          value: latestData.waterLevel,
          unit: "m",
          icon: <Activity className="w-4 h-4" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          name: "Soil Moisture",
          value: latestData.soilMoisture,
          unit: "%",
          icon: <TreePine className="w-4 h-4" />,
          color: "text-green-600",
          bgColor: "bg-green-50"
        },
        {
          name: "Drainage Capacity",
          value: latestData.drainageCapacity,
          unit: "L/s",
          icon: <Droplets className="w-4 h-4" />,
          color: "text-purple-600",
          bgColor: "bg-purple-50"
        },
        {
          name: "River Discharge",
          value: latestData.riverDischarge,
          unit: "m³/s",
          icon: <Activity className="w-4 h-4" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50"
        }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Sensor Readings</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {sensorGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="text-gray-600">{group.icon}</div>
              <h4 className="font-medium text-gray-800">{group.title}</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.sensors.map((sensor, index) => (
                <div key={index} className={`${sensor.bgColor} rounded-lg p-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={sensor.color}>{sensor.icon}</div>
                      <span className="text-sm font-medium text-gray-700">{sensor.name}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-800">
                      {sensor.value?.toFixed(1) || '0.0'} {sensor.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Cloud Cover</p>
            <p className="text-lg font-semibold text-gray-800">
              {(latestData.cloudCover || 50).toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Urbanization</p>
            <p className="text-lg font-semibold text-gray-800">
              {((latestData.urbanization || 0.7) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Risk Level</p>
            <p className="text-lg font-semibold text-gray-800">
              {latestData.risk_level || 'UNKNOWN'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(latestData.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default SensorReadings;
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  deforestation: number;
  climateChange: number;
  cloudCover: number;
  urbanization: number;
  latitude?: number;
  longitude?: number;
}

interface RealTimeChartProps {
  data: FloodData[];
  isConnected: boolean;
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ data, isConnected }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Flood Probability Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>Waiting for data...</p>
            <p className="text-sm">Start monitoring to see real-time trends</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for the chart
  const chartData = data.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    floodProbability: (point.floodProbability * 100).toFixed(1),
    rainfall: point.rainfall.toFixed(1),
    waterLevel: point.waterLevel.toFixed(2),
    temperature: point.temperature.toFixed(1),
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Real-time Monitoring</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live Data' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              stroke="#666" 
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value, name) => [
                `${value}${name === 'floodProbability' ? '%' : 
                  name === 'rainfall' ? ' mm/h' : 
                  name === 'waterLevel' ? ' m' : 
                  name === 'temperature' ? '°C' : ''}`,
                name === 'floodProbability' ? 'Flood Risk' :
                name === 'rainfall' ? 'Rainfall' :
                name === 'waterLevel' ? 'Water Level' :
                name === 'temperature' ? 'Temperature' : name
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="floodProbability" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6, fill: '#ef4444' }}
            />
            <Line 
              type="monotone" 
              dataKey="rainfall" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="waterLevel" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Flood Risk (%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Rainfall (mm/h)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            <span>Water Level (m)</span>
          </div>
        </div>
        <span>{data.length} data points</span>
      </div>
    </div>
  );
};

export default RealTimeChart;
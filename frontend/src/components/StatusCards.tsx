import React from 'react';
import { type FloodData } from '../services/api';

interface StatusCardsProps {
  currentData: FloodData | null;
  isConnected: boolean;
}

const StatusCards: React.FC<StatusCardsProps> = ({ currentData, isConnected }) => {
  if (!currentData) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flood Risk</p>
              <p className="text-2xl font-bold text-gray-400">---%</p>
              <p className="text-xs text-gray-500 mt-1">
                {isConnected ? 'Waiting for data...' : 'Disconnected'}
              </p>
            </div>
            <div className="text-3xl opacity-50">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rainfall</p>
              <p className="text-2xl font-bold text-gray-400">-- mm/h</p>
            </div>
            <div className="text-3xl opacity-50">🌧️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Water Level</p>
              <p className="text-2xl font-bold text-gray-400">-- m</p>
            </div>
            <div className="text-3xl opacity-50">📏</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Temperature</p>
              <p className="text-2xl font-bold text-gray-400">--°C</p>
            </div>
            <div className="text-3xl opacity-50">🌡️</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Flood Risk</p>
            <p className={`text-2xl font-bold ${
              // Use MODEL's risk level for color, not probability thresholds
              !currentData.risk_level ? 'text-gray-600' :
              currentData.risk_level === 'LOW' ? 'text-green-600' :
              currentData.risk_level === 'MILD' ? 'text-yellow-600' :
              currentData.risk_level === 'HIGH' ? 'text-orange-600' : 'text-red-600'
            }`}>
              {(currentData.floodProbability * 100).toFixed(1)}%
            </p>
            <p className={`text-xs font-medium ${
              // Use model's risk classification, not frontend logic
              !currentData.risk_level ? 'text-gray-600' :
              currentData.risk_level === 'LOW' ? 'text-green-600' :
              currentData.risk_level === 'MILD' ? 'text-yellow-600' :
              currentData.risk_level === 'HIGH' ? 'text-orange-600' : 'text-red-600'
            }`}>
              {/* Use the model's risk classification directly */}
              {currentData.risk_level || 'Analyzing...'}
            </p>
          </div>
          <div className="text-3xl">⚠️</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Rainfall</p>
            <p className="text-2xl font-bold text-blue-600">{currentData.rainfall.toFixed(1)} mm/h</p>
            <p className="text-xs text-gray-500">Current intensity</p>
          </div>
          <div className="text-3xl">🌧️</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Water Level</p>
            <p className="text-2xl font-bold text-indigo-600">{currentData.waterLevel.toFixed(2)} m</p>
            <p className="text-xs text-gray-500">River height</p>
          </div>
          <div className="text-3xl">📏</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Temperature</p>
            <p className="text-2xl font-bold text-orange-600">{currentData.temperature.toFixed(1)}°C</p>
            <p className="text-xs text-gray-500">Current weather</p>
          </div>
          <div className="text-3xl">🌡️</div>
        </div>
      </div>
    </>
  );
};

export default StatusCards;
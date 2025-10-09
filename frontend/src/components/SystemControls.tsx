import React from 'react';
import { Play, Pause, Square, Settings, Download, RefreshCw } from 'lucide-react';

interface SystemControlsProps {
  isMonitoring: boolean;
  isConnected: boolean;
  dataCount: number;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onPauseMonitoring: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onRefreshConnection: () => void;
}

const SystemControls: React.FC<SystemControlsProps> = ({
  isMonitoring,
  isConnected,
  dataCount,
  onStartMonitoring,
  onStopMonitoring,
  onPauseMonitoring,
  onResetData,
  onExportData,
  onRefreshConnection
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">System Controls</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Main Control Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {!isMonitoring ? (
          <button
            onClick={onStartMonitoring}
            disabled={!isConnected}
            className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Monitoring
          </button>
        ) : (
          <button
            onClick={onPauseMonitoring}
            className="flex items-center justify-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </button>
        )}
        
        <button
          onClick={onStopMonitoring}
          disabled={!isMonitoring}
          className="flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRefreshConnection}
            className="flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          
          <button
            onClick={onExportData}
            disabled={dataCount === 0}
            className="flex items-center justify-center px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        <button
          onClick={onResetData}
          disabled={dataCount === 0}
          className="w-full flex items-center justify-center px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
        >
          Clear Data ({dataCount} points)
        </button>
      </div>

      {/* Status Information */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <p className={`text-sm font-semibold ${
              isMonitoring ? 'text-green-600' : 'text-gray-600'
            }`}>
              {isMonitoring ? 'MONITORING' : 'STOPPED'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Data Points</p>
            <p className="text-sm font-semibold text-gray-800">{dataCount}</p>
          </div>
        </div>
      </div>

      {/* Monitoring Settings */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-3">Quick Settings</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Auto-refresh interval</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option value="1">1 second</option>
              <option value="5" selected>5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Data retention</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option value="100">100 points</option>
              <option value="500" selected>500 points</option>
              <option value="1000">1000 points</option>
              <option value="-1">Unlimited</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-3">System Health</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Backend API</span>
            <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Data Stream</span>
            <span className={`font-medium ${isMonitoring ? 'text-green-600' : 'text-gray-600'}`}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Update</span>
            <span className="font-medium text-gray-600">
              {dataCount > 0 ? 'Just now' : 'No data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemControls;
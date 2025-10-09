import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  isMonitoring: boolean;
}

const Header: React.FC<HeaderProps> = ({ isConnected, isMonitoring }) => {
  return (
    <header className="bg-blue-900 text-white p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">🌊</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Flood Monitoring System</h1>
            <p className="text-blue-200 text-sm">Dehradun Region - Real-time Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}></div>
            <span className="text-sm">
              {isConnected ? 'Live Data' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm">
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
            </span>
          </div>
          <div className="text-sm text-blue-200">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
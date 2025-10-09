import React from 'react';
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onClearAll: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge, onClearAll }) => {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBorderColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-orange-500 bg-orange-50';
      case 'info':
        return 'border-l-blue-500 bg-blue-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">System Alerts</h3>
          {unacknowledgedAlerts.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {unacknowledgedAlerts.length} new
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🛡️</div>
            <p>No alerts</p>
            <p className="text-sm">System is operating normally</p>
          </div>
        ) : (
          <>
            {/* Unacknowledged alerts first */}
            {unacknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 ${getAlertBorderColor(alert.type)} p-4 rounded-lg transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">{alert.title}</h4>
                      <p className="text-gray-600 text-xs mt-1">{alert.message}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="ml-2 text-xs bg-white border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded transition-colors duration-200"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}

            {/* Acknowledged alerts */}
            {acknowledgedAlerts.length > 0 && (
              <>
                {unacknowledgedAlerts.length > 0 && (
                  <div className="border-t border-gray-200 my-4"></div>
                )}
                <div className="text-xs text-gray-500 mb-2 font-medium">
                  Acknowledged ({acknowledgedAlerts.length})
                </div>
                {acknowledgedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-l-4 ${getAlertBorderColor(alert.type)} p-3 rounded-lg opacity-60 transition-all duration-200`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-700 text-sm line-through">
                          {alert.title}
                        </h4>
                        <p className="text-gray-500 text-xs mt-1">{alert.message}</p>
                        <p className="text-gray-400 text-xs mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total: {alerts.length} alerts</span>
            <span>
              {unacknowledgedAlerts.length} pending, {acknowledgedAlerts.length} resolved
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Sample alerts generator function for testing - USES MODEL RISK LEVELS ONLY
export const generateSampleAlerts = (floodProbability: number, riskLevel?: string): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();

  // Only generate alerts based on model's risk classification, not probability thresholds
  if (riskLevel === 'SEVERE') {
    alerts.push({
      id: `critical-${now.getTime()}`,
      type: 'critical',
      title: 'SEVERE Flood Risk (Model Determined)',
      message: `Model classified risk as SEVERE (probability: ${(floodProbability * 100).toFixed(1)}%). Immediate action required.`,
      timestamp: now.toISOString(),
      acknowledged: false
    });
  } else if (riskLevel === 'HIGH') {
    alerts.push({
      id: `warning-${now.getTime()}`,
      type: 'warning',
      title: 'HIGH Flood Risk (Model Determined)',
      message: `Model classified risk as HIGH (probability: ${(floodProbability * 100).toFixed(1)}%). Monitor conditions closely.`,
      timestamp: now.toISOString(),
      acknowledged: false
    });
  }

  // Add some sample historical alerts
  if (alerts.length === 0) {
    alerts.push({
      id: 'info-1',
      type: 'info',
      title: 'System Status',
      message: 'All sensors are operating normally. Last data sync completed successfully.',
      timestamp: new Date(now.getTime() - 300000).toISOString(), // 5 minutes ago
      acknowledged: true
    });
  }

  return alerts;
};

export default AlertsPanel;
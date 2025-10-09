import React, { useState, useEffect } from 'react';
import { AlertTriangle, Brain, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface AIRecommendations {
  timestamp: string;
  risk_level: string;
  flood_probability: number;
  ai_recommendations: string;
  priority_level: string;
  action_categories: {
    immediate_actions: string[];
    short_term_actions: string[];
    monitoring_priorities: string[];
    risk_assessment: string[];
  };
  summary: string;
}

interface AlertsComponentProps {
  isConnected: boolean;
}

const AlertsComponent: React.FC<AlertsComponentProps> = ({ isConnected }) => {
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false); // Default to false
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Track if we've loaded once

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      console.log('🤖 Fetching AI recommendations...');
      const response = await fetch('http://localhost:8000/api/ai-recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
        setLastUpdated(new Date());
        setHasInitialLoad(true);
        console.log('✅ AI recommendations loaded successfully');
      } else {
        console.error('Failed to fetch AI recommendations');
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch once when component mounts
    if (!hasInitialLoad) {
      console.log('🚀 AlertsComponent mounted - fetching initial AI recommendations');
      fetchRecommendations();
    }

    // Auto-refresh only if explicitly enabled (off by default)
    if (autoRefresh && hasInitialLoad) {
      console.log('🔄 Auto-refresh enabled - setting up 60 second interval');
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh triggered');
        fetchRecommendations();
      }, 60000); // Increased to 60 seconds to reduce API calls
      return () => {
        console.log('🛑 Clearing auto-refresh interval');
        clearInterval(interval);
      };
    }
  }, [autoRefresh, hasInitialLoad]);

  const getPriorityColor = (priority: string) => {
    if (priority.includes('CRITICAL')) return 'text-red-600 bg-red-50 border-red-200';
    if (priority.includes('HIGH')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (priority.includes('MEDIUM')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority.includes('CRITICAL')) return <XCircle className="w-5 h-5" />;
    if (priority.includes('HIGH')) return <AlertTriangle className="w-5 h-5" />;
    if (priority.includes('MEDIUM')) return <AlertCircle className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const formatActionList = (actions: string[]) => {
    return actions.map((action, index) => (
      <li key={index} className="flex items-start gap-2 text-sm">
        <span className="text-blue-500 mt-1">•</span>
        <span>{action}</span>
      </li>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">AI Flood Management Advisor</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Show last updated time */}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (60s)
          </label>
          
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Get AI Advice'}
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
        isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        {isConnected ? 'Real-time monitoring active' : 'Connection to monitoring system lost'}
      </div>

      {/* Cache Status */}
      {hasInitialLoad && !autoRefresh && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-700">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          AI recommendations cached - Click "Get AI Advice" to refresh manually
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">AI is analyzing current flood conditions...</span>
        </div>
      )}

      {recommendations && !loading && (
        <div className="space-y-6">
          {/* Priority Alert */}
          <div className={`p-4 rounded-lg border-2 ${getPriorityColor(recommendations.priority_level)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getPriorityIcon(recommendations.priority_level)}
              <h3 className="font-bold text-lg">{recommendations.priority_level}</h3>
            </div>
            <p className="text-sm font-medium">{recommendations.summary}</p>
            <div className="mt-2 text-xs opacity-75">
              Risk Level: {recommendations.risk_level} ({recommendations.flood_probability.toFixed(1)}%)
            </div>
          </div>

          {/* Action Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Immediate Actions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Immediate Actions (1-2 hours)
              </h3>
              <ul className="space-y-2">
                {formatActionList(recommendations.action_categories.immediate_actions)}
              </ul>
            </div>

            {/* Short-term Actions */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Short-term Actions (6-12 hours)
              </h3>
              <ul className="space-y-2">
                {formatActionList(recommendations.action_categories.short_term_actions)}
              </ul>
            </div>

            {/* Monitoring Priorities */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Monitoring Priorities
              </h3>
              <ul className="space-y-2">
                {formatActionList(recommendations.action_categories.monitoring_priorities)}
              </ul>
            </div>

            {/* Risk Assessment */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Risk Assessment
              </h3>
              <ul className="space-y-2">
                {formatActionList(recommendations.action_categories.risk_assessment)}
              </ul>
            </div>
          </div>

          {/* Full AI Recommendations */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">Detailed AI Analysis</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
              {recommendations.ai_recommendations}
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 text-center">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {!recommendations && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Click "Get AI Advice" to receive intelligent flood management recommendations</p>
        </div>
      )}
    </div>
  );
};

export default AlertsComponent;
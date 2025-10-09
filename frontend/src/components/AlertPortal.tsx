import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, MapPin, Bell, CheckCircle, AlertTriangle, Users } from 'lucide-react';

interface User {
  id: number;
  phone_number: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  registered_at: string;
  is_active: boolean;
  last_alert_sent?: string;
}

interface AlertStats {
  total_users: number;
  users_by_area: Record<string, number>;
  alerts_last_24h: number;
  emergency_contacts: Record<string, string>;
  timestamp: string;
}

const AlertPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'users' | 'stats'>('register');
  const [registrationData, setRegistrationData] = useState({
    phone_number: '',
    name: '',
    area: '',
    latitude: 30.3165,
    longitude: 78.0322
  });
  const [users, setUsers] = useState<User[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const predefinedAreas = [
    { name: 'Clock Tower', lat: 30.3165, lng: 78.0322 },
    { name: 'ISBT Bus Stand', lat: 30.3145, lng: 78.0356 },
    { name: 'Railway Station', lat: 30.3173, lng: 78.0389 },
    { name: 'Paltan Bazaar', lat: 30.3189, lng: 78.0378 },
    { name: 'Gandhi Road', lat: 30.3156, lng: 78.0298 },
    { name: 'Rajpur Road', lat: 30.3245, lng: 78.0445 },
    { name: 'Mussoorie Road', lat: 30.3278, lng: 78.0156 },
    { name: 'Haridwar Road', lat: 30.2945, lng: 78.0567 }
  ];

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'stats') {
      fetchAlertStats();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/alerts/stats');
      if (response.ok) {
        const data = await response.json();
        setAlertStats(data);
      } else {
        throw new Error('Failed to fetch alert stats');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load alert statistics' });
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = (selectedArea: string) => {
    const area = predefinedAreas.find(a => a.name === selectedArea);
    if (area) {
      setRegistrationData(prev => ({
        ...prev,
        area: selectedArea,
        latitude: area.lat,
        longitude: area.lng
      }));
    } else {
      setRegistrationData(prev => ({
        ...prev,
        area: selectedArea
      }));
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(registrationData.phone_number)) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number (e.g., +919876543210)' });
      return;
    }

    // Validate other fields
    if (!registrationData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your name' });
      return;
    }

    if (!registrationData.area) {
      setMessage({ type: 'error', text: 'Please select your area' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Registration successful! You will receive flood alerts on your phone.' });
        setRegistrationData({
          phone_number: '',
          name: '',
          area: '',
          latitude: 30.3165,
          longitude: 78.0322
        });
        fetchUsers(); // Refresh user list
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/alerts/auto-send', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Test alerts sent to ${result.alerts_sent} users` 
        });
      } else {
        throw new Error('Failed to send test alerts');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test alerts' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Flood Alert Portal</h1>
        </div>
        <p className="text-blue-100">
          Register for real-time flood alerts and emergency notifications for Dehradun region
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'register', label: 'Register', icon: UserPlus },
          { id: 'users', label: 'Registered Users', icon: Users },
          { id: 'stats', label: 'Alert Statistics', icon: Bell }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as 'register' | 'users' | 'stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Registration Form */}
      {activeTab === 'register' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Register for Flood Alerts
          </h2>
          <p className="text-gray-600 mb-6">
            Get instant SMS alerts when flood risks are detected in your area.
          </p>
          
          <form onSubmit={handleRegistration} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+919876543210"
                value={registrationData.phone_number}
                onChange={(e) => setRegistrationData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +919876543210)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Your full name"
                value={registrationData.name}
                onChange={(e) => setRegistrationData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area *
              </label>
              <select
                required
                value={registrationData.area}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your area</option>
                {predefinedAreas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {registrationData.area && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center gap-2 text-blue-800">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Selected Location:</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  {registrationData.area} (Lat: {registrationData.latitude.toFixed(4)}, Lng: {registrationData.longitude.toFixed(4)})
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Registering...' : 'Register for Alerts'}
            </button>
          </form>

          {/* Test Alert Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={sendTestAlert}
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Test Alert to All Users'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will trigger emergency SMS alerts to all registered users
            </p>
          </div>
        </div>
      )}

      {/* Users List */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Registered Users ({users.length})
          </h2>
          
          {loading ? (
            <p className="text-gray-500">Loading users...</p>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Registered</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{user.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {user.phone_number}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {user.area}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(user.registered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No users registered yet</p>
          )}
        </div>
      )}

      {/* Alert Statistics */}
      {activeTab === 'stats' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alert Statistics
          </h2>
          
          {loading ? (
            <p className="text-gray-500">Loading statistics...</p>
          ) : alertStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800">Total Users</h3>
                  <p className="text-2xl font-bold text-blue-600">{alertStats.total_users}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-800">Alerts Last 24h</h3>
                  <p className="text-2xl font-bold text-green-600">{alertStats.alerts_last_24h}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Users by Area</h3>
                <div className="space-y-2">
                  {Object.entries(alertStats.users_by_area).map(([area, count]) => (
                    <div key={area} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{area}</span>
                      <span className="font-medium">{count} users</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Emergency Contacts</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(alertStats.emergency_contacts).map(([service, number]) => (
                    <div key={service} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                      <Phone className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium">{service}:</span>
                      <span className="text-sm">{number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Failed to load statistics</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertPortal;
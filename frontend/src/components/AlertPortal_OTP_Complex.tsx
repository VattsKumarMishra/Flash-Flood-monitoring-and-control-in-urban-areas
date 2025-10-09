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
            : message.type === 'warning'
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-lg font-semibold hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'register', label: 'Register', icon: UserPlus },
          { id: 'users', label: 'Registered Users', icon: Users },
          { id: 'stats', label: 'Alert Statistics', icon: MessageSquare }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Registration Form with OTP Verification */}
      {activeTab === 'register' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          {verificationStep === 'phone' && (
            <>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Step 1: Verify Phone Number
              </h2>
              <p className="text-gray-600 mb-4">
                Enter your phone number to receive a verification code via SMS.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +919876543210)
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {loading ? 'Sending OTP...' : 'Send Verification Code'}
                </button>

                {/* Trial Account Options */}
                {showTrialOptions && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">
                      ⚠️ Trial Account Limitation
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      This Twilio trial account can only send SMS to verified numbers. You have two options:
                    </p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => window.open('https://www.twilio.com/console/phone-numbers/verified', '_blank')}
                        className="w-full bg-yellow-600 text-white py-2 px-3 rounded-md hover:bg-yellow-700 text-sm"
                      >
                        🔐 Verify Number on Twilio Console
                      </button>
                      <button
                        type="button"
                        onClick={handleTrialRegistration}
                        disabled={loading}
                        className="w-full bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 text-sm disabled:opacity-50"
                      >
                        📋 Register Without SMS (Trial Mode)
                      </button>
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      Trial mode: You'll still be registered but SMS alerts will only work for verified numbers.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {verificationStep === 'otp' && (
            <>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Step 2: Enter Verification Code
              </h2>
              <p className="text-gray-600 mb-4">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valid for 10 minutes
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setVerificationStep('phone')}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading || otpCode.length !== 6}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full text-blue-600 hover:text-blue-800 text-sm"
                >
                  Resend Code
                </button>
              </div>
            </>
          )}

          {verificationStep === 'register' && (
            <>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Step 3: Complete Registration
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">Phone number {phoneNumber} verified!</span>
              </div>
              
              <form onSubmit={handleRegistration} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={registrationData.phone_number}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area/Location *
                  </label>
                  <select
                    value={registrationData.area}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select your area</option>
                    {predefinedAreas.map((area) => (
                      <option key={area.name} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinates
                  </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Latitude"
                  value={registrationData.latitude}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Longitude"
                  value={registrationData.longitude}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-filled when you select an area
              </p>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register for Alerts
                  </>
                )}
              </button>
            </div>
          </form>
          </>
        )}
        </div>
      )}

      {/* Users List */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Registered Users ({users.length})
            </h2>
            <button
              onClick={sendTestAlert}
              disabled={loading}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Send Test Alert
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Area</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Registered</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Last Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{user.name}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono">{user.phone_number}</td>
                      <td className="border border-gray-300 px-4 py-2">{user.area}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(user.registered_at).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {user.last_alert_sent 
                          ? new Date(user.last_alert_sent).toLocaleString()
                          : 'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alert Statistics */}
      {activeTab === 'stats' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Alert Statistics
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : alertStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Users */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">{alertStats.total_users}</p>
              </div>

              {/* Recent Alerts */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900">Alerts (24h)</h3>
                <p className="text-3xl font-bold text-green-600">{alertStats.alerts_last_24h}</p>
              </div>

              {/* Users by Area */}
              <div className="bg-purple-50 p-4 rounded-lg md:col-span-2 lg:col-span-1">
                <h3 className="font-semibold text-purple-900 mb-2">Users by Area</h3>
                <div className="space-y-1">
                  {Object.entries(alertStats.users_by_area).map(([area, count]) => (
                    <div key={area} className="flex justify-between text-sm">
                      <span className="text-purple-800">{area}</span>
                      <span className="font-semibold text-purple-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="bg-red-50 p-4 rounded-lg md:col-span-2">
                <h3 className="font-semibold text-red-900 mb-2">Emergency Contacts</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(alertStats.emergency_contacts).map(([service, number]) => (
                    <div key={service} className="flex justify-between">
                      <span className="text-red-800">{service}:</span>
                      <span className="font-mono font-semibold text-red-600">{number}</span>
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
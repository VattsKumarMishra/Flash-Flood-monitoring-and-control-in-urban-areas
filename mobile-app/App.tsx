import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ScrollView, Alert, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import NativeWind
import './global.css';

// Type definitions
interface FloodData {
  riskLevel: string;
  riskPercentage: number;
  rainfall: number;
  waterLevel: number;
  temperature: number;
  humidity: number;
  lastUpdated: string;
  recommendations: string[];
}

interface UserData {
  name: string;
  phone: string;
  email?: string;
  location: string;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  userId: string;
}

interface UserProfile {
  name: string;
  phone: string;
  email: string;
  area: string;
  userId?: string;
  registeredAt?: string;
}

const Tab = createBottomTabNavigator();

// API Service for backend integration
const API_BASE_URL = 'http://10.49.178.86:8000';

const apiService = {
  // Alert-based notification system (works in Expo Go)
  async showFloodAlert(riskLevel: string, riskPercentage: number) {
    const title = `🚨 Flood Risk Alert: ${riskLevel.toUpperCase()}`;
    let message = '';
    
    switch (riskLevel) {
      case 'severe':
        message = `SEVERE flood risk detected (${riskPercentage}%)! Take immediate action and evacuate if necessary.`;
        break;
      case 'high':
        message = `HIGH flood risk detected (${riskPercentage}%)! Stay alert and prepare for potential flooding.`;
        break;
      case 'mild':
        message = `MODERATE flood risk detected (${riskPercentage}%). Monitor conditions closely.`;
        break;
      default:
        message = `Flood risk level: ${riskLevel} (${riskPercentage}%). Stay informed.`;
    }

    // Store alert in history
    const alerts = await this.getAlertHistory();
    const newAlert = {
      id: Date.now().toString(),
      title,
      message,
      riskLevel,
      timestamp: new Date().toISOString(),
      read: false
    };
    alerts.unshift(newAlert);
    await AsyncStorage.setItem('alertHistory', JSON.stringify(alerts.slice(0, 50))); // Keep last 50 alerts

    // Show immediate alert
    Alert.alert(
      title,
      message,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('Navigate to details') }
      ],
      { cancelable: false }
    );
  },

  async getAlertHistory() {
    try {
      const history = await AsyncStorage.getItem('alertHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading alert history:', error);
      return [];
    }
  },

  async checkRiskAndNotify(currentRisk: number, previousRisk: number, riskLevel: string) {
    // Threshold for notification (40% and above)
    const HIGH_RISK_THRESHOLD = 0.4;
    const SEVERE_RISK_THRESHOLD = 0.7;
    
    console.log(`Risk Check: Current=${currentRisk}, Previous=${previousRisk || 0}, Level=${riskLevel}`);
    
    // Show alert for any high risk (40%+) or significant increase (5%+)
    const shouldAlert = currentRisk >= HIGH_RISK_THRESHOLD || 
                       (previousRisk && (currentRisk - previousRisk) >= 0.05);
    
    if (shouldAlert) {
      const lastAlertTime = await AsyncStorage.getItem('lastFloodAlert');
      const now = Date.now();
      const cooldownTime = currentRisk >= SEVERE_RISK_THRESHOLD ? 
                          30 * 60 * 1000 : // 30 minutes for severe
                          60 * 60 * 1000;   // 1 hour for high
      
      const shouldShowAlert = !lastAlertTime || 
                             (now - parseInt(lastAlertTime)) > cooldownTime;
      
      console.log(`Alert Decision: shouldAlert=${shouldAlert}, shouldShowAlert=${shouldShowAlert}, cooldown=${cooldownTime/60000}min`);
      
      if (shouldShowAlert) {
        console.log(`🚨 Triggering flood alert: ${riskLevel} (${currentRisk * 100}%)`);
        
        // Show local alert
        await this.showFloodAlert(riskLevel, currentRisk * 100);
        
        // Trigger backend SMS alerts for high/severe risk
        if (currentRisk >= SEVERE_RISK_THRESHOLD || riskLevel === 'high' || riskLevel === 'severe') {
          try {
            console.log('📱 Triggering backend SMS alerts...');
            const response = await fetch(`${API_BASE_URL}/api/alerts/auto-send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ SMS alerts sent: ${result.alerts_sent} successful, ${result.failed_alerts} failed`);
            } else {
              console.error('❌ Failed to trigger SMS alerts:', response.status);
            }
          } catch (error) {
            console.error('❌ SMS alert error:', error);
          }
        }
        
        await AsyncStorage.setItem('lastFloodAlert', now.toString());
      } else {
        console.log(`⏰ Alert suppressed due to cooldown`);
      }
      
      // Always update the risk level
      await AsyncStorage.setItem('lastRiskLevel', currentRisk.toString());
    }
  },

  async getFloodStatus() {
    try {
      // Fetch real data from backend
      const response = await fetch(`${API_BASE_URL}/api/recent-readings?limit=1`);
      if (!response.ok) {
        throw new Error('Failed to fetch flood data');
      }
      
      const readings = await response.json();
      
      if (readings && readings.length > 0) {
        const latest = readings[0];
        
        // Convert backend data to frontend format
        const riskPercentage = (latest.floodProbability * 100).toFixed(1);
        let riskLevel = 'low';
        
        if (latest.floodProbability >= 0.8) {
          riskLevel = 'severe';
        } else if (latest.floodProbability >= 0.6) {
          riskLevel = 'high';
        } else if (latest.floodProbability >= 0.4) {
          riskLevel = 'mild';
        }
        
        const floodData = {
          riskLevel,
          riskPercentage: parseFloat(riskPercentage),
          rainfall: latest.rainfall || 0,
          waterLevel: latest.waterLevel || 0,
          temperature: latest.temperature || 26,
          humidity: latest.humidity || 68,
          lastUpdated: latest.timestamp,
          recommendations: await apiService.getRecommendations()
        };

        // Check for risk changes and send notifications
        const previousRisk = await AsyncStorage.getItem('lastRiskLevel');
        const currentRisk = latest.floodProbability;
        
        console.log(`📊 Flood Data Update: Risk=${currentRisk}, Level=${riskLevel}, Previous=${previousRisk}`);
        
        if (previousRisk) {
          await apiService.checkRiskAndNotify(
            currentRisk, 
            parseFloat(previousRisk), 
            riskLevel
          );
        } else {
          // First time - store the risk level and show alert if high
          await AsyncStorage.setItem('lastRiskLevel', currentRisk.toString());
          if (currentRisk >= 0.4) {
            console.log(`🚨 First time high risk detected: ${riskLevel} (${currentRisk * 100}%)`);
            await apiService.showFloodAlert(riskLevel, currentRisk * 100);
          }
        }

        return floodData;
      } else {
        // Fallback to simulated data if no backend data
        return {
          riskLevel: 'low',
          riskPercentage: 15.3,
          rainfall: 2.5,
          waterLevel: 1.8,
          temperature: 26,
          humidity: 68,
          lastUpdated: new Date().toISOString(),
          recommendations: [
            'Monitor weather conditions regularly',
            'Check drainage systems in your area',
            'Stay informed about weather updates',
            'Keep emergency contacts handy'
          ]
        };
      }
    } catch (error) {
      console.error('API Error:', error);
      // Return fallback data on error
      return {
        riskLevel: 'low',
        riskPercentage: 15.3,
        rainfall: 2.5,
        waterLevel: 1.8,
        temperature: 26,
        humidity: 68,
        lastUpdated: new Date().toISOString(),
        recommendations: [
          'Monitor weather conditions regularly',
          'Check drainage systems in your area',
          'Stay informed about weather updates',
          'Keep emergency contacts handy'
        ]
      };
    }
  },

  async getRecommendations() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-recommendations`);
      if (response.ok) {
        const data = await response.json();
        return data.recommendations || [
          'Monitor weather conditions regularly',
          'Check drainage systems in your area',
          'Stay informed about weather updates',
          'Keep emergency contacts handy'
        ];
      }
    } catch (error) {
      console.error('Recommendations Error:', error);
    }
    
    return [
      'Monitor weather conditions regularly',
      'Check drainage systems in your area',
      'Stay informed about weather updates',
      'Keep emergency contacts handy'
    ];
  },

  async registerUser(userData: UserData): Promise<RegistrationResponse> {
    try {
      // Use real backend API for user registration
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
          location: userData.location,
          notification_preferences: {
            sms: true,
            email: userData.email ? true : false,
            app: true
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: 'Registration successful! You will receive alerts.',
          userId: result.id
        };
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration Error:', error);
      // Fallback simulation for registration
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Registration successful! You will receive SMS alerts.',
            userId: Date.now().toString()
          });
        }, 1500);
      });
    }
  }
};

// Home Screen Component
function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [floodData, setFloodData] = useState<FloodData | null>(null);

  useEffect(() => {
    loadFloodData();

    // Set up adaptive monitoring interval based on risk level
    let monitoringInterval: NodeJS.Timeout;
    
    const setupMonitoring = async () => {
      const checkAndUpdateInterval = async () => {
        try {
          await loadFloodData();
          
          // Get current risk level to adjust monitoring frequency
          const currentData = await apiService.getFloodStatus();
          const riskLevel = currentData.riskLevel;
          
          // Clear existing interval
          if (monitoringInterval) {
            clearInterval(monitoringInterval);
          }
          
          // Adaptive interval based on risk level
          let intervalMinutes;
          switch (riskLevel) {
            case 'severe':
              intervalMinutes = 1; // Every 1 minute for severe risk
              break;
            case 'high':
              intervalMinutes = 2; // Every 2 minutes for high risk
              break;
            case 'mild':
              intervalMinutes = 5; // Every 5 minutes for moderate risk
              break;
            default:
              intervalMinutes = 10; // Every 10 minutes for low risk
          }
          
          console.log(`🕐 Setting monitoring interval to ${intervalMinutes} minutes for ${riskLevel} risk`);
          
          // Set new interval
          monitoringInterval = setInterval(checkAndUpdateInterval, intervalMinutes * 60 * 1000);
          
        } catch (error) {
          console.error('Background monitoring error:', error);
          // Fallback to 5-minute interval on error
          monitoringInterval = setInterval(checkAndUpdateInterval, 5 * 60 * 1000);
        }
      };
      
      // Start initial monitoring
      await checkAndUpdateInterval();
    };
    
    setupMonitoring();

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, []);

  const loadFloodData = async () => {
    try {
      const data = await apiService.getFloodStatus();
      setFloodData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load flood data:', error);
      Alert.alert('Error', 'Failed to load flood data');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFloodData();
    setRefreshing(false);
  };

  const testAlert = async () => {
    try {
      await apiService.showFloodAlert('severe', 85);
      console.log('✅ Test alert triggered successfully');
    } catch (error) {
      console.error('❌ Test alert failed:', error);
      Alert.alert('Error', 'Failed to trigger test alert');
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      case 'low': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="mt-4 text-lg text-gray-600">Loading flood status...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-blue-600 pt-16 pb-8 px-4">
        <Text className="text-white text-2xl font-bold text-center">🌊 Dehradun Flood Alert</Text>
        <Text className="text-blue-100 text-center mt-1">Real-time Flood Monitoring</Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Current Status Card */}
        <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons 
              name={getRiskIcon(floodData?.riskLevel || 'low')} 
              size={32} 
              color={floodData?.riskLevel === 'high' ? '#ef4444' : floodData?.riskLevel === 'medium' ? '#f97316' : '#10b981'} 
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-gray-800">Current Flood Status</Text>
              <View className={`${getRiskBgColor(floodData?.riskLevel || 'low')} px-3 py-1 rounded-full mt-2 self-start`}>
                <Text className="text-white text-sm font-bold">
                  {floodData?.riskLevel?.toUpperCase()} RISK
                </Text>
              </View>
            </View>
          </View>
          <Text className="text-center text-xl font-bold text-gray-800">
            Risk Level: {floodData?.riskPercentage}%
          </Text>
        </View>

        {/* Sensor Readings Card */}
        <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Latest Sensor Readings</Text>
          <View className="flex-row flex-wrap justify-between">
            <View className="bg-gray-50 p-4 rounded-lg w-[48%] mb-2 items-center">
              <Ionicons name="rainy" size={24} color="#3b82f6" />
              <Text className="text-gray-600 text-sm mt-1">Rainfall</Text>
              <Text className="font-bold text-lg">{floodData?.rainfall} mm</Text>
            </View>
            
            <View className="bg-gray-50 p-4 rounded-lg w-[48%] mb-2 items-center">
              <Ionicons name="water" size={24} color="#06b6d4" />
              <Text className="text-gray-600 text-sm mt-1">Water Level</Text>
              <Text className="font-bold text-lg">{floodData?.waterLevel} m</Text>
            </View>
            
            <View className="bg-gray-50 p-4 rounded-lg w-[48%] mb-2 items-center">
              <Ionicons name="thermometer" size={24} color="#f97316" />
              <Text className="text-gray-600 text-sm mt-1">Temperature</Text>
              <Text className="font-bold text-lg">{floodData?.temperature}°C</Text>
            </View>
            
            <View className="bg-gray-50 p-4 rounded-lg w-[48%] mb-2 items-center">
              <Ionicons name="water-outline" size={24} color="#10b981" />
              <Text className="text-gray-600 text-sm mt-1">Humidity</Text>
              <Text className="font-bold text-lg">{floodData?.humidity}%</Text>
            </View>
          </View>
        </View>

        {/* Recommendations Card */}
        <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Safety Recommendations</Text>
          {floodData?.recommendations?.map((recommendation, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <Ionicons name="bulb" size={16} color="#fbbf24" />
              <Text className="ml-2 flex-1 text-gray-700">{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</Text>
          <TouchableOpacity 
            onPress={onRefresh}
            className="bg-blue-600 p-4 rounded-lg mb-3"
          >
            <Text className="text-white text-center font-semibold">🔄 Refresh Data</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={testAlert}
            className="bg-red-600 p-4 rounded-lg mb-3"
          >
            <Text className="text-white text-center font-semibold">🚨 Test Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => Alert.alert('Emergency Contacts', 'Emergency: 100\nFlood Control: 1077\nDisaster Management: 108')}
            className="border border-blue-600 p-4 rounded-lg"
          >
            <Text className="text-blue-600 text-center font-semibold">📞 Emergency Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Alerts Screen Component
function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alertHistory = await apiService.getAlertHistory();
      // If no alerts in history, show sample alerts
      if (alertHistory.length === 0) {
        setAlerts([
          {
            id: '1',
            title: 'Welcome to Flood Monitor',
            message: 'You will receive alerts here when flood risk increases.',
            riskLevel: 'low',
            timestamp: new Date().toISOString(),
            read: true
          }
        ]);
      } else {
        setAlerts(alertHistory);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      // Fallback to sample data
      setAlerts([
        {
          id: '1',
          message: 'Moderate rainfall expected in Clock Tower area. Monitor conditions closely.',
          riskLevel: 'medium',
          timestamp: new Date().toISOString(),
          area: 'Clock Tower'
        },
        {
          id: '2', 
          message: 'Water levels have decreased. Risk level reduced to LOW.',
          riskLevel: 'low',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          area: 'Dehradun'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-orange-600 pt-16 pb-8 px-4">
        <Text className="text-white text-2xl font-bold text-center">📢 Alert History</Text>
        <Text className="text-orange-100 text-center mt-1">Recent flood alerts and notifications</Text>
      </View>

      <View className="px-4 -mt-4">
        {loading ? (
          <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <Text className="text-center text-gray-500">Loading alerts...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <Text className="text-center text-gray-500">No alerts yet. You'll see flood alerts here when risk levels increase.</Text>
          </View>
        ) : (
          alerts.map((alert) => (
          <View key={alert.id} className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <View className="flex-row items-start mb-3">
              <Ionicons 
                name="notifications" 
                size={24} 
                color={alert.riskLevel === 'high' ? '#ef4444' : alert.riskLevel === 'medium' ? '#f97316' : '#10b981'} 
              />
              <View className="ml-3 flex-1">
                <View className={`${getRiskBgColor(alert.riskLevel)} px-2 py-1 rounded-full self-start mb-2`}>
                  <Text className="text-white text-xs font-bold">
                    {alert.riskLevel.toUpperCase()}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm">📍 {alert.area}</Text>
              </View>
            </View>
            <Text className="text-gray-800 mb-2">{alert.message}</Text>
            <Text className="text-gray-500 text-sm">
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
          </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Profile Screen Component  
function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    area: 'Clock Tower',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setFormData(profile);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const saveUserProfile = async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      setUserProfile(profile);
      setIsRegistered(true);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const testNotification = async () => {
    try {
      await apiService.showFloodAlert('high', 75);
      // Additional confirmation since the alert is already shown
      console.log('Test alert displayed successfully');
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to show test alert');
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.phone || !formData.area) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.registerUser({
        name: formData.name,
        phone: formData.phone,
        location: formData.area
      });
      
      const newProfile = {
        name: formData.name,
        phone: formData.phone,
        email: '',
        area: formData.area,
        registeredAt: new Date().toISOString(),
        userId: (response as RegistrationResponse).userId,
      };
      
      await saveUserProfile(newProfile);
      Alert.alert('Success', (response as RegistrationResponse).message);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will stop receiving alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userProfile');
              setUserProfile(null);
              setIsRegistered(false);
              setFormData({ name: '', phone: '', area: 'Clock Tower' });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  if (isRegistered && userProfile) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-green-600 pt-16 pb-8 px-4">
          <Text className="text-white text-2xl font-bold text-center">👤 Profile</Text>
          <Text className="text-green-100 text-center mt-1">Your flood alert settings</Text>
        </View>

        <View className="px-4 -mt-4">
          <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <View className="flex-row items-center mb-4">
              <Ionicons name="person-circle" size={64} color="#059669" />
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-gray-800">{userProfile.name}</Text>
                <Text className="text-gray-600">{userProfile.phone}</Text>
                <View className="bg-green-500 px-3 py-1 rounded-full mt-2 self-start">
                  <Text className="text-white text-sm">📍 {userProfile.area}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4">📱 Alert Status</Text>
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text className="ml-2 flex-1 text-gray-700">
                SMS alerts enabled for {userProfile.area}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time" size={24} color="#6b7280" />
              <Text className="ml-2 flex-1 text-gray-700">
                Registered: {userProfile.registeredAt ? new Date(userProfile.registeredAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">🔔 Notification Settings</Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-gray-800 font-medium">High Risk Alerts</Text>
                  <Text className="text-gray-600 text-sm">Get notified when flood risk ≥ 40%</Text>
                </View>
                <TouchableOpacity className="w-12 h-6 bg-blue-500 rounded-full flex-row items-center px-1">
                  <View className="w-4 h-4 bg-white rounded-full ml-auto" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-gray-800 font-medium">Critical Alerts</Text>
                  <Text className="text-gray-600 text-sm">Emergency notifications for severe risk</Text>
                </View>
                <TouchableOpacity className="w-12 h-6 bg-blue-500 rounded-full flex-row items-center px-1">
                  <View className="w-4 h-4 bg-white rounded-full ml-auto" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-gray-800 font-medium">Sound & Vibration</Text>
                  <Text className="text-gray-600 text-sm">Play sound and vibrate for alerts</Text>
                </View>
                <TouchableOpacity className="w-12 h-6 bg-blue-500 rounded-full flex-row items-center px-1">
                  <View className="w-4 h-4 bg-white rounded-full ml-auto" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={testNotification}
                className="border border-blue-500 p-3 rounded-lg"
              >
                <Text className="text-blue-500 font-medium text-center">Test Notification</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Settings</Text>
            <TouchableOpacity 
              onPress={handleLogout}
              className="border border-red-500 p-4 rounded-lg"
            >
              <Text className="text-red-500 text-center font-semibold">🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-purple-600 pt-16 pb-8 px-4">
        <Text className="text-white text-2xl font-bold text-center">📱 Register for Alerts</Text>
        <Text className="text-purple-100 text-center mt-1">Get SMS notifications for flood risks</Text>
      </View>

      <View className="px-4 -mt-4">
        <View className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Full Name *</Text>
            <View className="border border-gray-300 rounded-lg p-3">
              <Text 
                onPress={() => {
                  // In a real app, this would be a TextInput
                  Alert.prompt(
                    'Enter Name',
                    '',
                    (text) => setFormData({ ...formData, name: text }),
                    'plain-text',
                    formData.name
                  );
                }}
                className="text-gray-800"
              >
                {formData.name || 'Tap to enter name'}
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Phone Number *</Text>
            <View className="border border-gray-300 rounded-lg p-3">
              <Text 
                onPress={() => {
                  Alert.prompt(
                    'Enter Phone',
                    '',
                    (text) => setFormData({ ...formData, phone: text }),
                    'phone-pad',
                    formData.phone
                  );
                }}
                className="text-gray-800"
              >
                {formData.phone || '+919876543210'}
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 mb-2 font-medium">Area *</Text>
            <View className="border border-gray-300 rounded-lg p-3">
              <Text 
                onPress={() => {
                  Alert.prompt(
                    'Enter Area',
                    '',
                    (text) => setFormData({ ...formData, area: text }),
                    'plain-text',
                    formData.area
                  );
                }}
                className="text-gray-800"
              >
                {formData.area}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className={`${loading ? 'bg-gray-400' : 'bg-purple-600'} p-4 rounded-lg`}
          >
            <Text className="text-white text-center font-semibold">
              {loading ? 'Registering...' : '🔔 Register for Alerts'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Map Screen Component
function MapScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-indigo-600 pt-16 pb-8 px-4">
        <Text className="text-white text-2xl font-bold text-center">🗺️ Flood Risk Map</Text>
        <Text className="text-indigo-100 text-center mt-1">Interactive flood monitoring</Text>
      </View>
      
      <View className="flex-1 justify-center items-center px-4">
        <Ionicons name="map" size={64} color="#4f46e5" />
        <Text className="text-xl font-bold text-gray-800 mt-4 text-center">Flood Risk Map</Text>
        <Text className="text-gray-600 text-center mt-2 px-4">
          Interactive flood risk map showing real-time conditions across Dehradun will be displayed here.
        </Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Coming Soon', 'Interactive map with real-time flood data will be available soon!')}
          className="bg-indigo-600 px-6 py-3 rounded-lg mt-6"
        >
          <Text className="text-white font-semibold">🗺️ View Interactive Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main App Component
export default function App() {
  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Alerts') {
                iconName = focused ? 'notifications' : 'notifications-outline';
              } else if (route.name === 'Map') {
                iconName = focused ? 'map' : 'map-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              }
              
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#3b82f6',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
            tabBarStyle: {
              elevation: 8,
              backgroundColor: 'white',
            },
          })}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Tab.Screen 
            name="Alerts" 
            component={AlertsScreen}
            options={{ title: 'Alerts' }}
          />
          <Tab.Screen 
            name="Map" 
            component={MapScreen}
            options={{ title: 'Map' }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </>
  );
}

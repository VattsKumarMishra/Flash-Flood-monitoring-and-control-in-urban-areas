import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, 
  Users, 
  Home, 
  Radio, 
  Navigation, 
  AlertTriangle,
  MessageSquare,
  Send,
  Activity,
  Shield,
  Target,
  Clock,
  CheckCircle,
  UserCheck,
  RefreshCw
} from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EmergencyAsset {
  id: string;
  type: 'ambulance' | 'fire_truck' | 'police' | 'boat' | 'helicopter' | 'rescue_team';
  name: string;
  location: [number, number];
  status: 'available' | 'deployed' | 'busy' | 'maintenance';
  capacity: number;
  currentLoad: number;
  lastUpdate: string;
  assignedMission?: string;
  eta?: number;
  fuelLevel?: number;
}

interface Shelter {
  id: string;
  name: string;
  location: [number, number];
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: 'operational' | 'full' | 'evacuating' | 'closed';
  contactPerson: string;
  contactPhone: string;
  lastUpdated: string;
  emergencySupplies: {
    water: number;
    food: number;
    medical: number;
    blankets: number;
  };
}

interface EvacuationRoute {
  id: string;
  name: string;
  path: [number, number][];
  status: 'clear' | 'congested' | 'blocked' | 'flooded';
  estimatedTime: number;
  capacity: number;
  priority: 'high' | 'medium' | 'low';
  riskFactors: string[];
  alternativeRoutes: string[];
}

interface CommunicationMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  type: 'urgent' | 'info' | 'warning' | 'update';
  status: 'sent' | 'delivered' | 'read';
  priority: 'high' | 'medium' | 'low';
}

interface FieldTeam {
  id: string;
  name: string;
  role: string;
  location: [number, number];
  status: 'active' | 'standby' | 'offline' | 'emergency';
  lastSeen: string;
  contact: string;
  members: number;
  equipment: string[];
  currentMission?: string;
}

interface RouteOptimization {
  path: [number, number][];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  alternativeRoutes: number;
  trafficDensity: 'light' | 'moderate' | 'heavy';
  floodRisk: 'low' | 'medium' | 'high';
  safetyScore: number;
}

const CrisisManagement: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'resources' | 'evacuation' | 'shelters' | 'communication'>('overview');
  const [emergencyAssets, setEmergencyAssets] = useState<EmergencyAsset[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [evacuationRoutes, setEvacuationRoutes] = useState<EvacuationRoute[]>([]);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [fieldTeams, setFieldTeams] = useState<FieldTeam[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimization | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Initialize mock data
  useEffect(() => {
    initializeMockData();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      updateAssetPositions();
      updateShelterStatus();
      updateTeamLocations();
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const initializeMockData = () => {
    setEmergencyAssets([
      {
        id: 'amb_001',
        type: 'ambulance',
        name: 'Ambulance Delta-1',
        location: [30.3165, 78.0322],
        status: 'deployed',
        capacity: 4,
        currentLoad: 2,
        lastUpdate: new Date().toISOString(),
        assignedMission: 'Medical evacuation - Clock Tower area',
        eta: 12,
        fuelLevel: 75
      },
      {
        id: 'fire_001',
        type: 'fire_truck',
        name: 'Fire Engine Alpha-2',
        location: [30.3200, 78.0400],
        status: 'available',
        capacity: 8,
        currentLoad: 0,
        lastUpdate: new Date().toISOString(),
        fuelLevel: 90
      },
      {
        id: 'police_001',
        type: 'police',
        name: 'Police Unit Bravo-3',
        location: [30.3180, 78.0380],
        status: 'busy',
        capacity: 6,
        currentLoad: 4,
        lastUpdate: new Date().toISOString(),
        assignedMission: 'Traffic control - Railway Station',
        eta: 8,
        fuelLevel: 60
      },
      {
        id: 'boat_001',
        type: 'boat',
        name: 'Rescue Boat Charlie-1',
        location: [30.3220, 78.0420],
        status: 'deployed',
        capacity: 12,
        currentLoad: 8,
        lastUpdate: new Date().toISOString(),
        assignedMission: 'Water rescue operations',
        fuelLevel: 45
      },
      {
        id: 'heli_001',
        type: 'helicopter',
        name: 'Air Rescue Echo-1',
        location: [30.3250, 78.0350],
        status: 'available',
        capacity: 6,
        currentLoad: 0,
        lastUpdate: new Date().toISOString(),
        fuelLevel: 85
      }
    ]);

    setShelters([
      {
        id: 'shelter_001',
        name: 'Government School Shelter',
        location: [30.3100, 78.0300],
        capacity: 500,
        currentOccupancy: 340,
        facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Generator'],
        status: 'operational',
        contactPerson: 'Dr. Sharma',
        contactPhone: '+91-8765432109',
        lastUpdated: new Date().toISOString(),
        emergencySupplies: {
          water: 85,
          food: 70,
          medical: 90,
          blankets: 60
        }
      },
      {
        id: 'shelter_002',
        name: 'Community Center Alpha',
        location: [30.3280, 78.0450],
        capacity: 300,
        currentOccupancy: 280,
        facilities: ['Food', 'Water', 'Restrooms', 'Wi-Fi'],
        status: 'full',
        contactPerson: 'Mr. Kumar',
        contactPhone: '+91-9876543210',
        lastUpdated: new Date().toISOString(),
        emergencySupplies: {
          water: 30,
          food: 25,
          medical: 40,
          blankets: 20
        }
      },
      {
        id: 'shelter_003',
        name: 'Sports Complex Shelter',
        location: [30.3050, 78.0250],
        capacity: 800,
        currentOccupancy: 120,
        facilities: ['Medical Aid', 'Food', 'Water', 'Blankets', 'Pharmacy', 'Security'],
        status: 'operational',
        contactPerson: 'Ms. Patel',
        contactPhone: '+91-7654321098',
        lastUpdated: new Date().toISOString(),
        emergencySupplies: {
          water: 95,
          food: 90,
          medical: 85,
          blankets: 95
        }
      }
    ]);

    setEvacuationRoutes([
      {
        id: 'route_001',
        name: 'Main Highway Route',
        path: [[30.3165, 78.0322], [30.3200, 78.0380], [30.3180, 78.0420]],
        status: 'clear',
        estimatedTime: 25,
        capacity: 1000,
        priority: 'high',
        riskFactors: ['Heavy traffic possible'],
        alternativeRoutes: ['route_002', 'route_003']
      },
      {
        id: 'route_002',
        name: 'Alternate Bridge Route',
        path: [[30.3140, 78.0300], [30.3160, 78.0350], [30.3200, 78.0400]],
        status: 'congested',
        estimatedTime: 45,
        capacity: 500,
        priority: 'medium',
        riskFactors: ['Bridge weight limit', 'Traffic congestion'],
        alternativeRoutes: ['route_001', 'route_003']
      },
      {
        id: 'route_003',
        name: 'Emergency Access Road',
        path: [[30.3190, 78.0310], [30.3220, 78.0340], [30.3250, 78.0380]],
        status: 'blocked',
        estimatedTime: 0,
        capacity: 0,
        priority: 'low',
        riskFactors: ['Road damage', 'Debris', 'Flooding'],
        alternativeRoutes: ['route_001', 'route_002']
      }
    ]);

    setFieldTeams([
      {
        id: 'team_001',
        name: 'Alpha Team',
        role: 'Search & Rescue',
        location: [30.3165, 78.0322],
        status: 'active',
        lastSeen: new Date().toISOString(),
        contact: 'team-alpha@emergency.gov',
        members: 8,
        equipment: ['Boats', 'Life Jackets', 'Medical Kit', 'Communication Radio'],
        currentMission: 'Civilian rescue at Clock Tower'
      },
      {
        id: 'team_002',
        name: 'Bravo Team',
        role: 'Medical Response',
        location: [30.3200, 78.0380],
        status: 'active',
        lastSeen: new Date().toISOString(),
        contact: 'team-bravo@emergency.gov',
        members: 6,
        equipment: ['Ambulance', 'Medical Supplies', 'Defibrillator', 'Stretchers'],
        currentMission: 'Medical station setup'
      },
      {
        id: 'team_003',
        name: 'Charlie Team',
        role: 'Evacuation Support',
        location: [30.3180, 78.0350],
        status: 'standby',
        lastSeen: new Date(Date.now() - 300000).toISOString(),
        contact: 'team-charlie@emergency.gov',
        members: 10,
        equipment: ['Buses', 'Megaphones', 'Barriers', 'First Aid'],
        currentMission: 'Evacuation coordination'
      }
    ]);

    setMessages([
      {
        id: 'msg_001',
        from: 'Command Center',
        to: 'Alpha Team',
        message: 'Proceed to Clock Tower area for water rescue operations. Multiple civilians reported stranded.',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'urgent',
        status: 'read',
        priority: 'high'
      },
      {
        id: 'msg_002',
        from: 'Bravo Team',
        to: 'Command Center',
        message: 'Medical station established at Government School. Need additional supplies. 15 patients treated.',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'info',
        status: 'delivered',
        priority: 'medium'
      },
      {
        id: 'msg_003',
        from: 'Charlie Team',
        to: 'Command Center',
        message: 'Evacuation route 3 is completely blocked. Redirecting civilians to route 1.',
        timestamp: new Date(Date.now() - 150000).toISOString(),
        type: 'warning',
        status: 'read',
        priority: 'high'
      }
    ]);
  };

  const updateAssetPositions = () => {
    setEmergencyAssets(prev => prev.map(asset => ({
      ...asset,
      location: [
        asset.location[0] + (Math.random() - 0.5) * 0.001,
        asset.location[1] + (Math.random() - 0.5) * 0.001
      ] as [number, number],
      lastUpdate: new Date().toISOString(),
      fuelLevel: Math.max(10, (asset.fuelLevel || 100) - Math.random() * 2)
    })));
  };

  const updateShelterStatus = () => {
    setShelters(prev => prev.map(shelter => ({
      ...shelter,
      currentOccupancy: Math.min(
        shelter.capacity,
        Math.max(0, shelter.currentOccupancy + Math.floor((Math.random() - 0.5) * 10))
      ),
      lastUpdated: new Date().toISOString(),
      emergencySupplies: {
        water: Math.max(0, shelter.emergencySupplies.water - Math.random() * 3),
        food: Math.max(0, shelter.emergencySupplies.food - Math.random() * 2),
        medical: Math.max(0, shelter.emergencySupplies.medical - Math.random() * 1),
        blankets: Math.max(0, shelter.emergencySupplies.blankets - Math.random() * 1)
      }
    })));
  };

  const updateTeamLocations = () => {
    setFieldTeams(prev => prev.map(team => ({
      ...team,
      location: [
        team.location[0] + (Math.random() - 0.5) * 0.0005,
        team.location[1] + (Math.random() - 0.5) * 0.0005
      ] as [number, number],
      lastSeen: team.status === 'active' ? new Date().toISOString() : team.lastSeen
    })));
  };

  const getAssetIcon = (type: string) => {
    const iconMap = {
      ambulance: '🚑',
      fire_truck: '🚒',
      police: '🚓',
      boat: '🚤',
      helicopter: '🚁',
      rescue_team: '⛑️'
    };
    return iconMap[type as keyof typeof iconMap] || '📍';
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      available: '#10B981',
      deployed: '#F59E0B',
      busy: '#EF4444',
      maintenance: '#6B7280',
      operational: '#10B981',
      full: '#EF4444',
      evacuating: '#F59E0B',
      closed: '#6B7280',
      clear: '#10B981',
      congested: '#F59E0B',
      blocked: '#EF4444',
      flooded: '#3B82F6',
      active: '#10B981',
      standby: '#F59E0B',
      offline: '#6B7280',
      emergency: '#DC2626'
    };
    return colorMap[status as keyof typeof colorMap] || '#6B7280';
  };

  const optimizeEvacuationRoute = async (origin: [number, number], destination: [number, number]) => {
    setIsOptimizing(true);
    setRouteOptimization(null);
    
    // Simulate AI-powered route optimization
    setTimeout(() => {
      const optimizedRoute: RouteOptimization = {
        path: [origin, [30.3180, 78.0360], [30.3200, 78.0380], destination],
        estimatedTime: 35,
        riskLevel: 'medium',
        alternativeRoutes: 2,
        trafficDensity: 'moderate',
        floodRisk: 'low',
        safetyScore: 85
      };
      setRouteOptimization(optimizedRoute);
      setIsOptimizing(false);
    }, 3000);
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedTeam) {
      const message: CommunicationMessage = {
        id: `msg_${Date.now()}`,
        from: 'Command Center',
        to: selectedTeam,
        message: newMessage,
        timestamp: new Date().toISOString(),
        type: 'info',
        status: 'sent',
        priority: 'medium'
      };
      
      setMessages(prev => [message, ...prev]);
      setNewMessage('');
      
      // Simulate message delivery
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'delivered' } : msg
        ));
      }, 2000);
    }
  };

  const renderResourceMap = () => (
    <div className="h-96 relative">
      <MapContainer
        center={[30.3165, 78.0322]}
        zoom={13}
        className="h-full w-full rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Emergency Assets */}
        {emergencyAssets.map(asset => (
          <Marker
            key={asset.id}
            position={asset.location}
            icon={L.divIcon({
              html: `<div class="asset-marker" style="background-color: ${getStatusColor(asset.status)}; border-radius: 50%; padding: 8px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                       <span style="font-size: 16px;">${getAssetIcon(asset.type)}</span>
                     </div>`,
              className: 'custom-marker',
              iconSize: [40, 40]
            })}
          >
            <Popup>
              <div className="p-3 min-w-64">
                <h3 className="font-bold text-lg">{asset.name}</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded text-white`} 
                          style={{backgroundColor: getStatusColor(asset.status)}}>
                      {asset.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Capacity:</span>
                    <span className="text-sm">{asset.currentLoad}/{asset.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fuel:</span>
                    <span className="text-sm">{asset.fuelLevel?.toFixed(0)}%</span>
                  </div>
                  {asset.eta && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ETA:</span>
                      <span className="text-sm">{asset.eta} min</span>
                    </div>
                  )}
                  {asset.assignedMission && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800 font-medium">Mission:</p>
                      <p className="text-sm text-blue-700">{asset.assignedMission}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Updated: {new Date(asset.lastUpdate).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shelters */}
        {shelters.map(shelter => (
          <Marker
            key={shelter.id}
            position={shelter.location}
            icon={L.divIcon({
              html: `<div class="shelter-marker" style="background-color: ${getStatusColor(shelter.status)}; border-radius: 8px; padding: 8px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                       <span style="font-size: 16px;">🏠</span>
                     </div>`,
              className: 'custom-marker',
              iconSize: [35, 35]
            })}
          >
            <Popup>
              <div className="p-3 min-w-64">
                <h3 className="font-bold text-lg">{shelter.name}</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Occupancy:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{shelter.currentOccupancy}/{shelter.capacity}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded">
                        <div 
                          className="h-full bg-blue-500 rounded"
                          style={{width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%`}}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-gray-600">Emergency Supplies:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Water: {shelter.emergencySupplies.water.toFixed(0)}%</div>
                      <div>Food: {shelter.emergencySupplies.food.toFixed(0)}%</div>
                      <div>Medical: {shelter.emergencySupplies.medical.toFixed(0)}%</div>
                      <div>Blankets: {shelter.emergencySupplies.blankets.toFixed(0)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium">Contact: {shelter.contactPerson}</p>
                    <p className="text-sm text-blue-600">{shelter.contactPhone}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {shelter.facilities.map((facility, index) => (
                      <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Evacuation Routes */}
        {evacuationRoutes.map(route => (
          <Polyline
            key={route.id}
            positions={route.path}
            color={getStatusColor(route.status)}
            weight={6}
            opacity={0.7}
            dashArray={route.status === 'blocked' ? '20, 10' : undefined}
          >
            <Popup>
              <div className="p-3 min-w-64">
                <h3 className="font-bold text-lg">{route.name}</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded text-white`} 
                          style={{backgroundColor: getStatusColor(route.status)}}>
                      {route.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Est. Time:</span>
                    <span className="text-sm">{route.estimatedTime} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Capacity:</span>
                    <span className="text-sm">{route.capacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Priority:</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      route.priority === 'high' ? 'bg-red-100 text-red-800' :
                      route.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {route.priority}
                    </span>
                  </div>
                  {route.riskFactors.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Risk Factors:</span>
                      <ul className="text-xs text-red-600 mt-1">
                        {route.riskFactors.map((risk, index) => (
                          <li key={index}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Field Teams */}
        {fieldTeams.map(team => (
          <Marker
            key={team.id}
            position={team.location}
            icon={L.divIcon({
              html: `<div class="team-marker" style="background-color: ${getStatusColor(team.status)}; border-radius: 50%; padding: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                       <span style="font-size: 14px;">👥</span>
                     </div>`,
              className: 'custom-marker',
              iconSize: [30, 30]
            })}
          >
            <Popup>
              <div className="p-3 min-w-64">
                <h3 className="font-bold text-lg">{team.name}</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Role:</span>
                    <span className="text-sm font-medium">{team.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded text-white`} 
                          style={{backgroundColor: getStatusColor(team.status)}}>
                      {team.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Members:</span>
                    <span className="text-sm">{team.members}</span>
                  </div>
                  {team.currentMission && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800 font-medium">Current Mission:</p>
                      <p className="text-sm text-blue-700">{team.currentMission}</p>
                    </div>
                  )}
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Equipment:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {team.equipment.map((item, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Last seen: {new Date(team.lastSeen).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route Optimization Display */}
        {routeOptimization && (
          <Polyline
            positions={routeOptimization.path}
            color="#8B5CF6"
            weight={8}
            opacity={0.8}
            dashArray="10, 5"
          >
            <Popup>
              <div className="p-3">
                <h3 className="font-bold text-lg text-purple-800">Optimized Route</h3>
                <div className="space-y-1 mt-2 text-sm">
                  <div>Time: {routeOptimization.estimatedTime} min</div>
                  <div>Safety Score: {routeOptimization.safetyScore}/100</div>
                  <div>Risk Level: {routeOptimization.riskLevel}</div>
                  <div>Traffic: {routeOptimization.trafficDensity}</div>
                </div>
              </div>
            </Popup>
          </Polyline>
        )}
      </MapContainer>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => optimizeEvacuationRoute([30.3165, 78.0322], [30.3250, 78.0380])}
          disabled={isOptimizing}
          className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          <span className="text-sm">{isOptimizing ? 'Optimizing...' : 'Optimize Route'}</span>
        </button>
        <button
          onClick={() => setEmergencyMode(!emergencyMode)}
          className={`flex items-center space-x-2 px-3 py-2 rounded ${
            emergencyMode ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Emergency Mode</span>
        </button>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Emergency Status Header */}
      <div className={`p-4 rounded-lg border-l-4 ${
        emergencyMode ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {emergencyMode ? (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            ) : (
              <Shield className="w-6 h-6 text-blue-600" />
            )}
            <div>
              <h2 className={`font-bold ${emergencyMode ? 'text-red-800' : 'text-blue-800'}`}>
                {emergencyMode ? 'EMERGENCY RESPONSE ACTIVE' : 'Crisis Management System'}
              </h2>
              <p className={`text-sm ${emergencyMode ? 'text-red-600' : 'text-blue-600'}`}>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEmergencyMode(!emergencyMode)}
            className={`px-4 py-2 rounded font-medium ${
              emergencyMode 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {emergencyMode ? 'Deactivate Emergency' : 'Activate Emergency'}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-800 font-medium">Available Assets</h3>
              <p className="text-2xl font-bold text-green-600">
                {emergencyAssets.filter(a => a.status === 'available').length}
              </p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-yellow-800 font-medium">Deployed Assets</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {emergencyAssets.filter(a => a.status === 'deployed').length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-800 font-medium">Shelter Capacity</h3>
              <p className="text-2xl font-bold text-blue-600">
                {shelters.reduce((acc, s) => acc + s.currentOccupancy, 0)}/
                {shelters.reduce((acc, s) => acc + s.capacity, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-purple-800 font-medium">Active Teams</h3>
              <p className="text-2xl font-bold text-purple-600">
                {fieldTeams.filter(t => t.status === 'active').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Resource Map */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Resource Deployment Map</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Real-time tracking</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        {renderResourceMap()}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-blue-600" />
            Asset Status
          </h4>
          <div className="space-y-2">
            {emergencyAssets.slice(0, 3).map(asset => (
              <div key={asset.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{asset.name}</span>
                <span 
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{backgroundColor: getStatusColor(asset.status)}}
                >
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 flex items-center">
            <Home className="w-5 h-5 mr-2 text-green-600" />
            Shelter Status
          </h4>
          <div className="space-y-2">
            {shelters.map(shelter => (
              <div key={shelter.id} className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="truncate">{shelter.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    shelter.status === 'full' ? 'bg-red-100 text-red-800' :
                    shelter.status === 'operational' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {shelter.currentOccupancy}/{shelter.capacity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-purple-600" />
            Route Status
          </h4>
          <div className="space-y-2">
            {evacuationRoutes.map(route => (
              <div key={route.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{route.name}</span>
                <span 
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{backgroundColor: getStatusColor(route.status)}}
                >
                  {route.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCommunication = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message Composition */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-4 flex items-center">
            <Send className="w-5 h-5 mr-2 text-blue-600" />
            Send Message
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Team
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select team...</option>
                {fieldTeams.map(team => (
                  <option key={team.id} value={team.name}>
                    {team.name} - {team.role}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!selectedTeam || !newMessage.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>

          {/* Quick Message Templates */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-3">Quick Templates</h4>
            <div className="space-y-2">
              {[
                'Need immediate backup at current location',
                'Medical supplies required urgently',
                'Evacuation route blocked - need alternative',
                'Mission completed - requesting new assignment'
              ].map((template, index) => (
                <button
                  key={index}
                  onClick={() => setNewMessage(template)}
                  className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
            Communication Log
          </h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map(message => (
              <div key={message.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">{message.from}</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium">{message.to}</span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${
                        message.type === 'urgent' ? 'bg-red-500' :
                        message.type === 'warning' ? 'bg-yellow-500' :
                        message.type === 'info' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}>
                        {message.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        message.priority === 'high' ? 'bg-red-100 text-red-800' :
                        message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {message.priority}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 mb-2">{message.message}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(message.timestamp).toLocaleString()}</span>
                      <div className="flex items-center space-x-2">
                        {message.status === 'sent' && <Clock className="w-4 h-4" />}
                        {message.status === 'delivered' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {message.status === 'read' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        <span>{message.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crisis Management Center</h1>
        <p className="text-gray-600">Emergency Response & Resource Coordination</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'resources', label: 'Resource Deployment', icon: Truck },
              { key: 'evacuation', label: 'Evacuation Routes', icon: Navigation },
              { key: 'shelters', label: 'Shelter Management', icon: Home },
              { key: 'communication', label: 'Communication Hub', icon: Radio },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'resources' && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold mb-4">Resource Deployment Map</h2>
          {renderResourceMap()}
        </div>
      )}
      {activeView === 'evacuation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">Evacuation Route Optimization</h2>
            {renderResourceMap()}
          </div>
          
          {/* Route Optimization Panel */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600" />
              AI Route Optimizer
            </h3>
            
            {isOptimizing && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">Analyzing traffic patterns, flood zones, and safety factors...</p>
              </div>
            )}
            
            {routeOptimization && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-bold text-purple-800 mb-3">Optimized Route Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Estimated Time</span>
                    <p className="text-xl font-bold text-purple-600">{routeOptimization.estimatedTime} min</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Safety Score</span>
                    <p className="text-xl font-bold text-purple-600">{routeOptimization.safetyScore}/100</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Risk Level</span>
                    <p className={`text-xl font-bold ${
                      routeOptimization.riskLevel === 'low' ? 'text-green-600' :
                      routeOptimization.riskLevel === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {routeOptimization.riskLevel}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Alternatives</span>
                    <p className="text-xl font-bold text-purple-600">{routeOptimization.alternativeRoutes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {activeView === 'shelters' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">Shelter Capacity Tracker</h2>
            {renderResourceMap()}
          </div>
          
          {/* Shelter Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shelters.map(shelter => (
              <div key={shelter.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{shelter.name}</h3>
                  <span 
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{backgroundColor: getStatusColor(shelter.status)}}
                  >
                    {shelter.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Occupancy</span>
                      <span>{shelter.currentOccupancy}/{shelter.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%`}}
                      />
                    </div>
                  </div>
                  
                  {/* Emergency Supplies */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Emergency Supplies</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(shelter.emergencySupplies).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <div className="flex justify-between">
                            <span className="capitalize">{key}</span>
                            <span>{value.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full ${
                                value > 70 ? 'bg-green-500' :
                                value > 30 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{width: `${value}%`}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">{shelter.contactPerson}</p>
                    <p className="text-sm text-blue-600">{shelter.contactPhone}</p>
                  </div>
                  
                  {/* Facilities */}
                  <div className="flex flex-wrap gap-1">
                    {shelter.facilities.map((facility, index) => (
                      <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeView === 'communication' && renderCommunication()}
    </div>
  );
};

export default CrisisManagement;
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Info } from 'lucide-react';
import { floodAPI, type DehradunLocationData, type FloodData } from '../services/api.ts';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FloodMapProps {
  latestData: FloodData | null;
  historicalData: FloodData[];
}

const FloodMap: React.FC<FloodMapProps> = ({ latestData, historicalData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const floodZonesRef = useRef<L.LayerGroup | null>(null);
  const vulnerableAreasRef = useRef<L.LayerGroup | null>(null);
  const infrastructureRef = useRef<L.LayerGroup | null>(null);
  const evacuationRoutesRef = useRef<L.LayerGroup | null>(null);
  const populationDensityRef = useRef<L.LayerGroup | null>(null);
  const [locationData, setLocationData] = useState<DehradunLocationData | null>(null);
  const [showLayers, setShowLayers] = useState({
    floodZones: true,
    vulnerableAreas: true,
    populationDensity: false,
    evacuationRoutes: false,
    criticalInfrastructure: true,
    rivers: true,
    sensors: true,
    historical: false
  });

  // Default coordinates for Dehradun (fallback)
  const defaultLat = 30.3165;
  const defaultLng = 78.0322;

  // Helper function to get color based on model-determined risk level
  const getModelRiskColor = (riskLevel: string): string => {
    switch (riskLevel?.toUpperCase()) {
      case 'SEVERE': return '#ef4444'; // red
      case 'HIGH': return '#f97316'; // orange  
      case 'MILD': return '#eab308'; // yellow
      case 'LOW': return '#22c55e'; // green
      default: return '#6b7280'; // gray for unknown
    }
  };

  // Helper function to get simplified river paths
  const getRiverPath = (riverName: string, centerCoords: { latitude: number; longitude: number }): [number, number][][] => {
    const lat = centerCoords.latitude;
    const lng = centerCoords.longitude;
    
    // Simplified river paths for demonstration
    // In a real implementation, these would come from GIS database
    const riverPaths: { [key: string]: [number, number][][] } = {
      'Ganga': [
        [[lat + 0.01, lng - 0.02], [lat + 0.005, lng - 0.01], [lat, lng], [lat - 0.005, lng + 0.01]]
      ],
      'Yamuna': [
        [[lat + 0.015, lng + 0.01], [lat + 0.01, lng + 0.005], [lat + 0.005, lng - 0.005], [lat, lng - 0.01]]
      ],
      'Tons': [
        [[lat - 0.01, lng - 0.015], [lat - 0.005, lng - 0.01], [lat, lng - 0.005], [lat + 0.005, lng]]
      ]
    };
    
    return riverPaths[riverName] || [[[lat, lng - 0.01], [lat, lng + 0.01]]];
  };

  // Vulnerable areas data for enhanced GIS visualization
  const getVulnerableAreas = (centerCoords: { latitude: number; longitude: number }) => {
    const lat = centerCoords.latitude;
    const lng = centerCoords.longitude;
    
    return [
      {
        name: "Clock Tower Area",
        coordinates: [
          [lat + 0.003, lng - 0.004],
          [lat + 0.006, lng - 0.002],
          [lat + 0.004, lng + 0.002],
          [lat + 0.001, lng]
        ] as [number, number][],
        risk_level: "HIGH",
        population: 45000,
        type: "Commercial Dense Zone",
        evacuation_time: "15 minutes",
        shelters: ["Gandhi Park", "Parade Ground"]
      },
      {
        name: "Railway Station Area",
        coordinates: [
          [lat - 0.002, lng - 0.006],
          [lat + 0.001, lng - 0.004],
          [lat + 0.002, lng - 0.001],
          [lat - 0.001, lng + 0.001]
        ] as [number, number][],
        risk_level: "SEVERE",
        population: 32000,
        type: "Transportation Hub",
        evacuation_time: "10 minutes",
        shelters: ["ISBT Complex", "Sports Stadium"]
      },
      {
        name: "Rajpur Road Residential",
        coordinates: [
          [lat + 0.008, lng + 0.003],
          [lat + 0.012, lng + 0.006],
          [lat + 0.010, lng + 0.009],
          [lat + 0.006, lng + 0.007]
        ] as [number, number][],
        risk_level: "MODERATE",
        population: 28000,
        type: "Residential Area",
        evacuation_time: "20 minutes",
        shelters: ["Rajpur Community Center", "Local Schools"]
      },
      {
        name: "ISBT Bus Stand",
        coordinates: [
          [lat - 0.004, lng + 0.002],
          [lat - 0.001, lng + 0.004],
          [lat - 0.003, lng + 0.007],
          [lat - 0.006, lng + 0.005]
        ] as [number, number][],
        risk_level: "HIGH",
        population: 15000,
        type: "Transport Terminal",
        evacuation_time: "12 minutes",
        shelters: ["Nearby Schools", "Community Halls"]
      },
      {
        name: "Rispana River Bank",
        coordinates: [
          [lat - 0.006, lng - 0.003],
          [lat - 0.003, lng - 0.001],
          [lat - 0.005, lng + 0.003],
          [lat - 0.008, lng + 0.001]
        ] as [number, number][],
        risk_level: "SEVERE",
        population: 22000,
        type: "Riverside Settlement",
        evacuation_time: "8 minutes",
        shelters: ["Higher Ground Areas", "Emergency Centers"]
      }
    ];
  };

  // Critical infrastructure data
  const getCriticalInfrastructure = (centerCoords: { latitude: number; longitude: number }) => {
    const lat = centerCoords.latitude;
    const lng = centerCoords.longitude;
    
    return [
      { name: "Tehri Dam", lat: lat + 0.15, lng: lng - 0.12, type: "dam", status: "Monitored", capacity: "2.1B m³" },
      { name: "Asan Barrage", lat: lat - 0.08, lng: lng + 0.06, type: "barrage", status: "Active", capacity: "286M m³" },
      { name: "Rispana Pump Station", lat: lat - 0.003, lng: lng + 0.008, type: "pump", status: "Operational", capacity: "2500 m³/hr" },
      { name: "Bindal Pump Station", lat: lat + 0.005, lng: lng - 0.007, type: "pump", status: "Operational", capacity: "1800 m³/hr" },
      { name: "Emergency Response Center", lat: lat + 0.002, lng: lng + 0.003, type: "emergency", status: "24/7", capacity: "Command Center" },
      { name: "District Hospital", lat: lat - 0.001, lng: lng + 0.004, type: "hospital", status: "Emergency Ready", capacity: "500 beds" },
      { name: "Fire Station Central", lat: lat + 0.001, lng: lng - 0.002, type: "fire", status: "Active", capacity: "8 vehicles" }
    ];
  };

  // Evacuation routes
  const getEvacuationRoutes = (centerCoords: { latitude: number; longitude: number }) => {
    const lat = centerCoords.latitude;
    const lng = centerCoords.longitude;
    
    return [
      {
        name: "Main Evacuation Route - North",
        path: [[lat, lng], [lat + 0.005, lng + 0.002], [lat + 0.010, lng + 0.005], [lat + 0.015, lng + 0.008]] as [number, number][],
        capacity: "High",
        destination: "Safe Zone - Hills"
      },
      {
        name: "Secondary Route - East",
        path: [[lat, lng], [lat + 0.002, lng + 0.008], [lat + 0.005, lng + 0.012], [lat + 0.008, lng + 0.015]] as [number, number][],
        capacity: "Medium",
        destination: "Community Centers"
      },
      {
        name: "Emergency Route - West",
        path: [[lat, lng], [lat - 0.003, lng - 0.008], [lat - 0.006, lng - 0.012], [lat - 0.010, lng - 0.015]] as [number, number][],
        capacity: "Medium",
        destination: "Higher Ground"
      }
    ];
  };

  // Fetch GIS location data
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        console.log('🌍 Fetching location data...');
        const data = await floodAPI.getDehradunLocation();
        console.log('🌍 Location data received:', data);
        setLocationData(data);
      } catch (error) {
        console.error('❌ Error fetching location data:', error);
      }
    };

    fetchLocationData();
  }, []);

  // Initialize map and add flood zones
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const initializeMap = () => {
      if (!mapRef.current) {
        console.log('🗺️ Map ref not ready yet');
        return;
      }

      // Initialize map only once
      if (!mapInstanceRef.current) {
        console.log('🗺️ Initializing map...');
        const centerLat = locationData?.coordinates.latitude || defaultLat;
        const centerLng = locationData?.coordinates.longitude || defaultLng;
        
        console.log('🗺️ Map center:', centerLat, centerLng);
        
        try {
          // Clear any existing content
          mapRef.current.innerHTML = '';
          
          mapInstanceRef.current = L.map(mapRef.current, {
            center: [centerLat, centerLng],
            zoom: 12,
            zoomControl: true,
            attributionControl: true
          });

          // Add multiple tile layers for better visibility
          const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          });
          
          const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
          });

          // Add default layer
          osmLayer.addTo(mapInstanceRef.current);

          // Layer control
          const baseMaps = {
            "Street Map": osmLayer,
            "Satellite": satelliteLayer
          };
          
          L.control.layers(baseMaps).addTo(mapInstanceRef.current);

          // Initialize layer groups
          markersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          floodZonesRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          vulnerableAreasRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          infrastructureRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          evacuationRoutesRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          populationDensityRef.current = L.layerGroup();
          
          console.log('🗺️ Layer groups initialized:', {
            markers: !!markersRef.current,
            floodZones: !!floodZonesRef.current,
            vulnerableAreas: !!vulnerableAreasRef.current,
            infrastructure: !!infrastructureRef.current,
            evacuationRoutes: !!evacuationRoutesRef.current,
            populationDensity: !!populationDensityRef.current
          });
          
          console.log('🗺️ Map initialized successfully!');
          
          // Force map to redraw/invalidate size after a short delay
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
              console.log('🗺️ Map size invalidated and refreshed');
            }
          }, 100);
        } catch (error) {
          console.error('🗺️ Error initializing map:', error);
        }
      }
    };
    
    // Small delay to ensure DOM is fully ready
    setTimeout(initializeMap, 50);
  }, []);

  // Separate useEffect to handle layer rendering when location data is available
  useEffect(() => {
    console.log('🔄 Layer rendering effect triggered');
    console.log('🔄 Location data status:', !!locationData);
    console.log('🔄 Flood zones ref status:', !!floodZonesRef.current);
    
    if (locationData) {
      console.log('🔄 Location data details:', locationData);
    }

    // Add flood zones if location data is available
    if (locationData && floodZonesRef.current) {
      console.log('🌊 Starting to render map layers with location data:', locationData.coordinates);
      console.log('🌊 Layer visibility states:', showLayers);
      floodZonesRef.current.clearLayers();
      
      locationData.flood_zones.forEach((zone) => {
        const color = getModelRiskColor(zone.risk_level);
        
        // Create polygon for flood zone
        if (zone.coordinates && zone.coordinates.length > 0) {
          const polygon = L.polygon(zone.coordinates, {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2
          }).addTo(floodZonesRef.current!);
          
          // Add popup with zone information
          polygon.bindPopup(`
            <div class="p-2">
              <h4 class="font-semibold text-sm">${zone.name}</h4>
              <p class="text-xs text-gray-600">Risk Level: ${zone.risk_level.toUpperCase()}</p>
              <p class="text-xs text-gray-600">Zone Type: Flood Risk Area</p>
            </div>
          `);
        }
      });

      // Add rivers as lines
      if (showLayers.rivers) {
        locationData.rivers.forEach((riverName) => {
          // Create simplified river paths (in real implementation, these would come from GIS data)
          const riverPaths = getRiverPath(riverName, locationData.coordinates);
          
          riverPaths.forEach((path: [number, number][]) => {
            const riverLine = L.polyline(path, {
              color: '#1e40af',
              weight: 3,
              opacity: 0.8
            }).addTo(floodZonesRef.current!);
            
            riverLine.bindPopup(`
              <div class="p-2">
                <h4 class="font-semibold text-sm">📍 ${riverName} River</h4>
                <p class="text-xs text-gray-600">Major waterway through Dehradun</p>
                <p class="text-xs text-gray-600">Flood monitoring active</p>
              </div>
            `);
          });
        });
      }

      // Add enhanced vulnerable areas
      if (showLayers.vulnerableAreas && vulnerableAreasRef.current) {
        console.log('🏘️ Adding vulnerable areas to map...');
        
        // Simple test polygon to verify layer is working
        const testPolygon = L.polygon([
          [30.3100, 78.0200],
          [30.3200, 78.0400], 
          [30.3150, 78.0350]
        ], {
          color: '#ff0000',
          fillColor: '#ff0000',
          fillOpacity: 0.4,
          weight: 3
        }).addTo(vulnerableAreasRef.current);
        
        testPolygon.bindPopup('🧪 Test Vulnerable Area');
        console.log('🏘️ Test polygon added to vulnerable areas layer');
        
        const vulnerableAreas = getVulnerableAreas(locationData.coordinates);
        console.log('🏘️ Vulnerable areas data:', vulnerableAreas);
        
        vulnerableAreas.forEach((area) => {
          const color = getModelRiskColor(area.risk_level);
          console.log(`🏘️ Adding area ${area.name} with color ${color}`);
          
          const polygon = L.polygon(area.coordinates, {
            color: color,
            fillColor: color,
            fillOpacity: 0.4,
            weight: 3,
            dashArray: area.risk_level === 'SEVERE' ? '10, 5' : undefined
          }).addTo(vulnerableAreasRef.current!);
          
          polygon.bindPopup(`
            <div class="p-3 max-w-xs">
              <h4 class="font-bold text-sm mb-2">🏘️ ${area.name}</h4>
              <div class="space-y-1 text-xs">
                <p><span class="font-semibold">Risk Level:</span> <span class="font-bold ${area.risk_level === 'SEVERE' ? 'text-red-600' : area.risk_level === 'HIGH' ? 'text-orange-600' : 'text-yellow-600'}">${area.risk_level}</span></p>
                <p><span class="font-semibold">Population:</span> ${area.population.toLocaleString()}</p>
                <p><span class="font-semibold">Type:</span> ${area.type}</p>
                <p><span class="font-semibold">Evacuation Time:</span> ${area.evacuation_time}</p>
                <p><span class="font-semibold">Shelters:</span> ${area.shelters.join(', ')}</p>
              </div>
            </div>
          `);
        });
      }

      // Add critical infrastructure
      if (showLayers.criticalInfrastructure && infrastructureRef.current) {
        console.log('🏗️ Adding critical infrastructure to map...');
        
        // Simple test marker
        const testMarker = L.marker([30.3165, 78.0322], {
          icon: L.divIcon({
            className: 'test-infrastructure-marker',
            html: `
              <div style="
                background-color: #059669;
                color: white;
                padding: 6px;
                border-radius: 50%;
                font-size: 16px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                border: 2px solid white;
              ">
                🧪
              </div>
            `,
            iconSize: [35, 35],
            iconAnchor: [17, 17]
          })
        }).addTo(infrastructureRef.current);
        
        testMarker.bindPopup('🧪 Test Infrastructure Marker');
        console.log('🏗️ Test marker added to infrastructure layer');
        
        const infrastructure = getCriticalInfrastructure(locationData.coordinates);
        console.log('🏗️ Infrastructure data:', infrastructure);
        
        infrastructure.forEach((item) => {
          const getInfraIcon = (type: string) => {
            switch (type) {
              case 'dam': return '🏗️';
              case 'barrage': return '🌉';
              case 'pump': return '⚙️';
              case 'emergency': return '🚨';
              case 'hospital': return '🏥';
              case 'fire': return '🚒';
              default: return '🏢';
            }
          };
          
          const getInfraColor = (type: string) => {
            switch (type) {
              case 'dam': case 'barrage': return '#059669'; // green
              case 'pump': return '#0891b2'; // cyan
              case 'emergency': return '#dc2626'; // red
              case 'hospital': return '#7c3aed'; // purple
              case 'fire': return '#ea580c'; // orange
              default: return '#374151'; // gray
            }
          };
          
          const marker = L.marker([item.lat, item.lng], {
            icon: L.divIcon({
              className: 'infrastructure-marker',
              html: `
                <div style="
                  background-color: ${getInfraColor(item.type)};
                  color: white;
                  padding: 6px;
                  border-radius: 50%;
                  font-size: 16px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                  border: 2px solid white;
                ">
                  ${getInfraIcon(item.type)}
                </div>
              `,
              iconSize: [35, 35],
              iconAnchor: [17, 17]
            })
          }).addTo(infrastructureRef.current!);
          
          marker.bindPopup(`
            <div class="p-3 max-w-xs">
              <h4 class="font-bold text-sm mb-2">${getInfraIcon(item.type)} ${item.name}</h4>
              <div class="space-y-1 text-xs">
                <p><span class="font-semibold">Type:</span> ${item.type.toUpperCase()}</p>
                <p><span class="font-semibold">Status:</span> <span class="text-green-600 font-semibold">${item.status}</span></p>
                <p><span class="font-semibold">Capacity:</span> ${item.capacity}</p>
                <p class="text-blue-600 font-semibold mt-2">Critical Infrastructure - Priority Monitoring</p>
              </div>
            </div>
          `);
        });
      }

      // Add evacuation routes
      if (showLayers.evacuationRoutes) {
        const routes = getEvacuationRoutes(locationData.coordinates);
        
        routes.forEach((route, index) => {
          const routeColor = ['#dc2626', '#ea580c', '#ca8a04'][index] || '#6b7280'; // red, orange, yellow
          
          const routeLine = L.polyline(route.path, {
            color: routeColor,
            weight: 5,
            opacity: 0.8,
            dashArray: '15, 10'
          }).addTo(floodZonesRef.current!);
          
          routeLine.bindPopup(`
            <div class="p-3 max-w-xs">
              <h4 class="font-bold text-sm mb-2">🚨 ${route.name}</h4>
              <div class="space-y-1 text-xs">
                <p><span class="font-semibold">Capacity:</span> ${route.capacity}</p>
                <p><span class="font-semibold">Destination:</span> ${route.destination}</p>
                <p class="text-red-600 font-semibold mt-2">Emergency Evacuation Route</p>
              </div>
            </div>
          `);
          
          // Add directional arrows along the route
          route.path.forEach((point, pointIndex) => {
            if (pointIndex < route.path.length - 1) {
              L.marker(point, {
                icon: L.divIcon({
                  className: 'evacuation-arrow',
                  html: `
                    <div style="
                      color: ${routeColor};
                      font-size: 20px;
                      text-shadow: 1px 1px 2px white;
                    ">
                      ➤
                    </div>
                  `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })
              }).addTo(evacuationRoutesRef.current!);
            }
          });
        });
      }

      // Add population density heat map
      if (showLayers.populationDensity) {
        const densityAreas = [
          {
            name: "High Density - Commercial Core",
            center: [locationData.coordinates.latitude + 0.002, locationData.coordinates.longitude - 0.001],
            radius: 800,
            population: 12000,
            density: "Very High"
          },
          {
            name: "Medium Density - Residential North",
            center: [locationData.coordinates.latitude + 0.008, locationData.coordinates.longitude + 0.005],
            radius: 1200,
            population: 8500,
            density: "High"
          },
          {
            name: "Medium Density - Railway Area",
            center: [locationData.coordinates.latitude - 0.003, locationData.coordinates.longitude - 0.004],
            radius: 1000,
            population: 6800,
            density: "Medium"
          },
          {
            name: "Low Density - Outskirts",
            center: [locationData.coordinates.latitude + 0.012, locationData.coordinates.longitude + 0.010],
            radius: 1500,
            population: 3200,
            density: "Low"
          }
        ];

        densityAreas.forEach((area) => {
          const getDensityColor = (density: string) => {
            switch (density) {
              case "Very High": return { color: '#dc2626', opacity: 0.6 }; // red
              case "High": return { color: '#ea580c', opacity: 0.5 }; // orange
              case "Medium": return { color: '#ca8a04', opacity: 0.4 }; // yellow
              case "Low": return { color: '#16a34a', opacity: 0.3 }; // green
              default: return { color: '#6b7280', opacity: 0.3 }; // gray
            }
          };

          const colorData = getDensityColor(area.density);
          
          const circle = L.circle(area.center as [number, number], {
            color: colorData.color,
            fillColor: colorData.color,
            fillOpacity: colorData.opacity,
            radius: area.radius,
            weight: 2
          }).addTo(populationDensityRef.current!);
          
          circle.bindPopup(`
            <div class="p-3 max-w-xs">
              <h4 class="font-bold text-sm mb-2">👥 ${area.name}</h4>
              <div class="space-y-1 text-xs">
                <p><span class="font-semibold">Population:</span> ${area.population.toLocaleString()}</p>
                <p><span class="font-semibold">Density:</span> <span class="font-bold">${area.density}</span></p>
                <p><span class="font-semibold">Area:</span> ~${(Math.PI * Math.pow(area.radius/1000, 2)).toFixed(1)} km²</p>
                <p class="text-purple-600 font-semibold mt-2">Population Density Zone</p>
              </div>
            </div>
          `);
        });
      }

      // Add city information marker
      const cityMarker = L.marker([locationData.coordinates.latitude, locationData.coordinates.longitude], {
        icon: L.divIcon({
          className: 'city-marker',
          html: `
            <div style="
              background-color: #1f2937;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              🏙️ ${locationData.city}
            </div>
          `,
          iconSize: [80, 30],
          iconAnchor: [40, 15]
        })
      }).addTo(floodZonesRef.current!);

      cityMarker.bindPopup(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-lg mb-2">🏙️ ${locationData.city}</h3>
          <div class="space-y-1 text-sm">
            <p><strong>State:</strong> ${locationData.state}</p>
            <p><strong>Population:</strong> ${locationData.population.toLocaleString()}</p>
            <p><strong>Elevation:</strong> ${locationData.elevation}m</p>
            <p><strong>Area:</strong> ${locationData.area_km2} km²</p>
            <p><strong>Rivers:</strong> ${locationData.rivers.join(', ')}</p>
            <p class="text-xs text-gray-600 mt-2">Real-time flood monitoring active</p>
          </div>
        </div>
      `);
    }

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update map when location data or settings change
  useEffect(() => {
    if (!mapInstanceRef.current || !floodZonesRef.current || !markersRef.current) return;

    console.log('🗺️ Adding map labels and markers...');

    // Clear existing markers
    markersRef.current.clearLayers();

    // Always add city label for Dehradun
    console.log('🗺️ Adding city label...');
    L.marker([defaultLat, defaultLng], {
      icon: L.divIcon({
        className: 'city-label',
        html: `
          <div style="
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
          ">
            🏙️ Dehradun
            <br/>700K Pop
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      })
    }).addTo(markersRef.current);

    // Always add flood zone markers with risk labels
    console.log('🗺️ Adding flood zones...');
    const floodZones = [
      { lat: 30.3265, lng: 78.0422, risk: 'HIGH', name: 'Zone-A' },
      { lat: 30.3065, lng: 78.0222, risk: 'MEDIUM', name: 'Zone-B' }, 
      { lat: 30.3365, lng: 78.0122, risk: 'LOW', name: 'Zone-C' },
      { lat: 30.2965, lng: 78.0522, risk: 'CRITICAL', name: 'Zone-D' }
    ];

    floodZones.forEach(zone => {
      if (markersRef.current) {
        const zoneColor = zone.risk === 'CRITICAL' ? '#ef4444' : 
                         zone.risk === 'HIGH' ? '#f97316' : 
                         zone.risk === 'MEDIUM' ? '#eab308' : '#22c55e';
        
        L.marker([zone.lat, zone.lng], {
          icon: L.divIcon({
            className: 'zone-label',
            html: `
              <div style="
                background: ${zoneColor};
                color: white;
                padding: 3px 6px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: bold;
                white-space: nowrap;
                border: 1px solid white;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                text-align: center;
                pointer-events: none;
              ">
                ⚠️ ${zone.name}<br/>${zone.risk}
              </div>
            `,
            iconSize: [50, 20],
            iconAnchor: [25, 10]
          })
        }).addTo(markersRef.current);
      }
    });

    // Always add river labels
    console.log('🗺️ Adding river labels...');
    const rivers = [
      { lat: 30.3200, lng: 78.0350, name: 'Tons River' },
      { lat: 30.3100, lng: 78.0280, name: 'Asan River' }
    ];

    rivers.forEach(river => {
      if (markersRef.current) {
        const riverMarker = L.marker([river.lat, river.lng], {
          icon: L.divIcon({
            className: 'river-label',
            html: `
              <div style="
                background: rgba(59, 130, 246, 0.8);
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
                white-space: nowrap;
                border: 1px solid #1e40af;
                font-style: italic;
                pointer-events: none;
              ">
                🌊 ${river.name}
              </div>
            `,
            iconSize: [60, 15],
            iconAnchor: [30, 7]
          })
        });
        
        riverMarker.addTo(markersRef.current);
      }
    });

    // Add current location marker if we have data
    if (latestData) {
      console.log('🗺️ Adding sensor marker with data...', latestData);
      const lat = latestData.latitude || defaultLat;
      const lng = latestData.longitude || defaultLng;
      const floodRisk = latestData.floodProbability;
      
      console.log('🗺️ Sensor location:', lat, lng);
      console.log('🗺️ Flood risk level:', floodRisk, 'Risk level:', latestData.risk_level);

      // Determine marker color based on flood risk
      const getMarkerColor = (risk: number) => {
        if (risk < 0.3) return '#22c55e'; // Green - Low risk
        if (risk < 0.5) return '#eab308'; // Yellow - Medium risk
        if (risk < 0.7) return '#f97316'; // Orange - High risk
        return '#ef4444'; // Red - Critical risk
      };

      // Model will determine the risk level - no frontend classification

      // Create custom icon - make it bigger for severe cases
      const isHighRisk = floodRisk > 0.7;
      const markerSize = isHighRisk ? '30px' : '20px';
      const borderWidth = isHighRisk ? '4px' : '3px';
      
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${getMarkerColor(floodRisk)};
            width: ${markerSize};
            height: ${markerSize};
            border-radius: 50%;
            border: ${borderWidth} solid white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
            animation: pulse 2s infinite;
            position: relative;
            z-index: 1000;
          "></div>
        `,
        iconSize: [parseInt(markerSize), parseInt(markerSize)],
        iconAnchor: [parseInt(markerSize)/2, parseInt(markerSize)/2]
      });

      // Create popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center mb-2">
            <div style="width: 12px; height: 12px; background-color: ${getMarkerColor(floodRisk)}; border-radius: 50%; margin-right: 8px;"></div>
            <strong>Monitoring Station</strong>
          </div>
          <div class="space-y-1 text-sm">
            <div><strong>Risk Level:</strong> ${latestData.risk_level || 'ANALYZING...'} (${(floodRisk * 100).toFixed(1)}%)</div>
            <div><strong>Rainfall:</strong> ${latestData.rainfall.toFixed(2)} mm/h</div>
            <div><strong>Water Level:</strong> ${latestData.waterLevel.toFixed(3)} m</div>
            <div><strong>Temperature:</strong> ${latestData.temperature.toFixed(1)}°C</div>
            <div><strong>Last Updated:</strong> ${new Date(latestData.timestamp).toLocaleString()}</div>
          </div>
        </div>
      `;

      // Add marker to map with permanent label
      if (markersRef.current) {
        console.log('🗺️ Creating sensor marker with color:', getMarkerColor(floodRisk));
        
        L.marker([lat, lng], { icon: customIcon })
          .bindPopup(popupContent)
          .addTo(markersRef.current);

        // Make label more prominent for severe cases
        const isHighRisk = floodRisk > 0.7;
        const labelBgColor = isHighRisk ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0,0,0,0.7)';
        const labelAnimation = isHighRisk ? 'animation: pulse 2s infinite;' : '';
        
        // Add permanent label for the sensor station
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'sensor-label',
            html: `
              <div style="
                background: ${labelBgColor};
                color: white;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                margin-top: 30px;
                margin-left: -25px;
                text-align: center;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                ${labelAnimation}
                pointer-events: none;
              ">
                🚨 SENSOR-01<br/>
                ${latestData.risk_level || 'ANALYZING'}: ${(floodRisk * 100).toFixed(0)}%
              </div>
            `,
            iconSize: [80, 35],
            iconAnchor: [40, 0]
          })
        }).addTo(markersRef.current);
        
        console.log('🗺️ Sensor marker added at:', lat, lng, 'with risk:', (floodRisk * 100).toFixed(0) + '%');
      }

      // Center map on current location
      mapInstanceRef.current.setView([lat, lng], 12);
    } else {
      console.log('🗺️ No sensor data available, showing default view');
    }

    console.log('🗺️ All labels added successfully!');

    // Add historical data points (simplified - just show last few points)
    const recentPoints = historicalData.slice(-5);
    recentPoints.forEach((point, index) => {
      if (!point.latitude || !point.longitude) return;

      const opacity = 0.3 + (index / recentPoints.length) * 0.5;
      const size = 8 + (index * 2);

      const historicalIcon = L.divIcon({
        className: 'historical-div-icon',
        html: `
          <div style="
            background-color: #6b7280;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid white;
            opacity: ${opacity};
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const historicalMarker = L.marker([point.latitude, point.longitude], { icon: historicalIcon })
        .bindPopup(`
          <div class="p-1 text-sm">
            <div><strong>Historical Data</strong></div>
            <div>Risk: ${(point.floodProbability * 100).toFixed(1)}%</div>
            <div>Time: ${new Date(point.timestamp).toLocaleTimeString()}</div>
          </div>
        `);
        
      if (markersRef.current) {
        historicalMarker.addTo(markersRef.current);
      }
    });
  }, [latestData, historicalData, locationData, showLayers]);

  // Use MODEL-DETERMINED risk levels only
  const getModelRiskColorClass = (riskLevel?: string) => {
    switch (riskLevel?.toUpperCase()) {
      case 'SEVERE': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MILD': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500'; // When waiting for model
    }
  };

  // Handle layer visibility toggling
  useEffect(() => {
    if (mapInstanceRef.current) {
      // Control vulnerable areas visibility
      if (vulnerableAreasRef.current) {
        if (showLayers.vulnerableAreas) {
          vulnerableAreasRef.current.addTo(mapInstanceRef.current);
        } else {
          vulnerableAreasRef.current.removeFrom(mapInstanceRef.current);
        }
      }

      // Control infrastructure visibility
      if (infrastructureRef.current) {
        if (showLayers.criticalInfrastructure) {
          infrastructureRef.current.addTo(mapInstanceRef.current);
        } else {
          infrastructureRef.current.removeFrom(mapInstanceRef.current);
        }
      }

      // Control evacuation routes visibility
      if (evacuationRoutesRef.current) {
        if (showLayers.evacuationRoutes) {
          evacuationRoutesRef.current.addTo(mapInstanceRef.current);
        } else {
          evacuationRoutesRef.current.removeFrom(mapInstanceRef.current);
        }
      }

      // Control population density visibility
      if (populationDensityRef.current) {
        if (showLayers.populationDensity) {
          populationDensityRef.current.addTo(mapInstanceRef.current);
        } else {
          populationDensityRef.current.removeFrom(mapInstanceRef.current);
        }
      }
    }
  }, [showLayers.vulnerableAreas, showLayers.criticalInfrastructure, showLayers.evacuationRoutes, showLayers.populationDensity]);

  const getModelRiskText = (riskLevel?: string) => {
    return riskLevel || 'Waiting for Model...';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <MapPin className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Flood Risk Map</h3>
        </div>
        {latestData && (
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getModelRiskColorClass(latestData.risk_level)}`}></div>
            <span className="text-sm text-gray-600">
              {getModelRiskText(latestData.risk_level)}
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Layer Controls */}
        <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-md p-2 min-w-[140px]">
          <div className="flex items-center gap-1 mb-2">
            <Layers className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">Layers</span>
          </div>
          
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.sensors}
                onChange={(e) => setShowLayers(prev => ({ ...prev, sensors: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🏭 Sensors</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.floodZones}
                onChange={(e) => setShowLayers(prev => ({ ...prev, floodZones: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🌊 Flood Zones</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.rivers}
                onChange={(e) => setShowLayers(prev => ({ ...prev, rivers: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🏞️ Rivers</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.historical}
                onChange={(e) => setShowLayers(prev => ({ ...prev, historical: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>📊 Historical</span>
            </label>

            {/* Enhanced GIS Layer Controls */}
            <hr className="my-1 border-gray-200" />
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.vulnerableAreas}
                onChange={(e) => setShowLayers(prev => ({ ...prev, vulnerableAreas: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🏘️ Vulnerable Areas</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.criticalInfrastructure}
                onChange={(e) => setShowLayers(prev => ({ ...prev, criticalInfrastructure: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🏗️ Infrastructure</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.evacuationRoutes}
                onChange={(e) => setShowLayers(prev => ({ ...prev, evacuationRoutes: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>🚨 Evacuation Routes</span>
            </label>
            
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showLayers.populationDensity}
                onChange={(e) => setShowLayers(prev => ({ ...prev, populationDensity: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span>👥 Population Density</span>
            </label>
          </div>
        </div>

        {/* Location Info Panel */}
        {locationData && (
          <div className="absolute top-2 left-2 z-[1000] bg-white rounded-lg shadow-md p-2 max-w-[200px]">
            <div className="flex items-center gap-1 mb-1">
              <Info className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700">📍 {locationData.city}</span>
            </div>
            
            <div className="space-y-0.5 text-xs text-gray-600">
              <div>👥 {locationData.population.toLocaleString()}</div>
              <div>⛰️ {locationData.elevation}m | 📏 {locationData.area_km2}km²</div>
              <div>🏞️ {locationData.rivers.join(', ')}</div>
              <div>🌊 {locationData.flood_zones.length} zones</div>
            </div>
          </div>
        )}

        <div 
          ref={mapRef} 
          className="h-96 w-full rounded-lg border border-gray-300"
          style={{ 
            zIndex: 1, 
            minHeight: '384px',
            background: '#f0f0f0',
            position: 'relative'
          }}
        />
        
        {!mapRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <p>Loading map...</p>
              <p className="text-sm">Map will show sensor locations and flood zones</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          <span>Critical Risk</span>
        </div>
      </div>

      {latestData && (
        <div className="mt-3 text-xs text-gray-600 text-center">
          Location: {latestData.latitude?.toFixed(4) || defaultLat.toFixed(4)}, {latestData.longitude?.toFixed(4) || defaultLng.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default FloodMap;
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import threading
import time
import logging

# Import our monitoring system
from monitoring_system import StreamlinedFloodMonitoringSystem
from gemini_advisor import gemini_advisor
from alert_system import alert_manager
from phone_verification import otp_service
import asyncio
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Scenario management class
class ScenarioManager:
    def __init__(self):
        self.available_scenarios = {
            'normal': {
                'name': 'Normal Weather',
                'description': 'Typical weather conditions with low flood risk',
                'risk_range': (0.1, 0.4),
                'duration_hours': None  # Continuous
            },
            'heavy_rain': {
                'name': 'Heavy Rainfall',
                'description': 'Intense rainfall with increased flood risk',
                'risk_range': (0.4, 0.7),
                'duration_hours': 6
            },
            'flood': {
                'name': 'Flood Event',
                'description': 'Active flooding with high risk',
                'risk_range': (0.7, 0.95),
                'duration_hours': 12
            },
            'pre_monsoon': {
                'name': 'Pre-Monsoon',
                'description': 'Pre-monsoon preparation phase',
                'risk_range': (0.1, 0.3),
                'duration_hours': None
            },
            'drought': {
                'name': 'Drought Conditions',
                'description': 'Low water levels, minimal rain',
                'risk_range': (0.05, 0.2),
                'duration_hours': None
            }
        }
        self.current_scenario = 'normal'
        self.scenario_start_time = None
        self.auto_transition = True
        
    def get_scenario_info(self, scenario_name):
        return self.available_scenarios.get(scenario_name, {})
    
    def set_scenario(self, scenario_name, duration_override=None):
        if scenario_name not in self.available_scenarios:
            return False
        
        self.current_scenario = scenario_name
        self.scenario_start_time = datetime.now()
        
        # Override duration if specified
        if duration_override:
            self.available_scenarios[scenario_name]['duration_hours'] = duration_override
            
        logger.info(f"Scenario changed to: {scenario_name}")
        return True
    
    def should_auto_transition(self):
        if not self.auto_transition or not self.scenario_start_time:
            return False
            
        scenario_info = self.available_scenarios[self.current_scenario]
        duration = scenario_info.get('duration_hours')
        
        if duration is None:
            return False
            
        elapsed_hours = (datetime.now() - self.scenario_start_time).total_seconds() / 3600
        return elapsed_hours >= duration

# Global instances
scenario_manager = ScenarioManager()

app = FastAPI(
    title="Dehradun Flood Monitoring API",
    description="Real-time flood monitoring system for Dehradun, Uttarakhand",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global monitoring system instance
monitoring_system = None
monitoring_thread = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if self.active_connections:
            message_str = json.dumps(message)
            for connection in self.active_connections.copy():
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error sending to WebSocket: {e}")
                    self.active_connections.remove(connection)

manager = ConnectionManager()

# Pydantic models for API
class SensorReading(BaseModel):
    timestamp: str
    monsoon_intensity: int
    drainage_efficiency: int
    landslides: int
    flood_probability: float
    risk_level: str
    scenario: str

class SystemStatus(BaseModel):
    is_running: bool
    current_scenario: str
    data_interval: int
    total_readings: int
    uptime_minutes: float

class ScenarioChange(BaseModel):
    scenario: str
    interval: Optional[int] = None

class RiskDistribution(BaseModel):
    low: int
    mild: int
    high: int
    severe: int

class Analytics(BaseModel):
    total_readings: int
    risk_distribution: RiskDistribution
    avg_flood_probability: float
    alerts_last_hour: int
    current_risk_level: str

# User Registration and Alert Models
class UserRegistration(BaseModel):
    phone_number: str
    name: str
    area: str
    latitude: float
    longitude: float

class OTPRequest(BaseModel):
    phone_number: str

class OTPVerification(BaseModel):
    phone_number: str
    otp_code: str

class UserResponse(BaseModel):
    id: int
    phone_number: str
    name: str
    area: str
    latitude: float
    longitude: float
    registered_at: str
    is_active: bool
    last_alert_sent: Optional[str]

class AlertRequest(BaseModel):
    risk_level: str
    flood_probability: float

class AlertResponse(BaseModel):
    risk_level: str
    flood_probability: float
    total_users: int
    alerts_sent: int
    failed_alerts: int
    timestamp: str

# Custom monitoring system with WebSocket integration
class WebSocketEnabledMonitoringSystem(StreamlinedFloodMonitoringSystem):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.websocket_manager = manager
        
    async def broadcast_reading(self, timestamp, sensor_data, probability, risk_level, risk_emoji, method, alert_issued):
        """Broadcast reading to WebSocket clients and trigger SMS alerts for HIGH/SEVERE risk"""
        message = {
            "type": "sensor_reading",
            "data": {
                "timestamp": timestamp,
                "monsoon_intensity": sensor_data['MonsoonIntensity'],
                "topography_drainage": sensor_data['TopographyDrainage'],
                "river_management": sensor_data['RiverManagement'],
                "deforestation": sensor_data['Deforestation'],
                "urbanization": sensor_data['Urbanization'],
                "climate_change": sensor_data['ClimateChange'],
                "dams_quality": sensor_data['DamsQuality'],
                "siltation": sensor_data['Siltation'],
                "agricultural_practices": sensor_data['AgriculturalPractices'],
                "encroachments": sensor_data['Encroachments'],
                "ineffective_disaster_preparedness": sensor_data['IneffectiveDisasterPreparedness'],
                "drainage_systems": sensor_data['DrainageSystems'],
                "coastal_vulnerability": sensor_data['CoastalVulnerability'],
                "landslides": sensor_data['Landslides'],
                "watersheds": sensor_data['Watersheds'],
                "deteriorating_infrastructure": sensor_data['DeterioratingInfrastructure'],
                "population_score": sensor_data['PopulationScore'],
                "wetland_loss": sensor_data['WetlandLoss'],
                "inadequate_planning": sensor_data['InadequatePlanning'],
                "political_factors": sensor_data['PoliticalFactors'],
                "flood_probability": probability,
                "floodProbability": probability,  # Also send camelCase for frontend compatibility
                "risk_level": risk_level,
                "risk_emoji": risk_emoji,
                "scenario": self.current_scenario,
                "prediction_method": method,
                "alert_issued": alert_issued,
                "drainage_efficiency": 16 - sensor_data['DrainageSystems']
            }
        }
        
        # 🚨 TRIGGER SMS ALERTS for HIGH/SEVERE risk levels
        if risk_level in ['HIGH', 'SEVERE']:
            try:
                logger.info(f"🚨 {risk_level} flood risk detected! Triggering SMS alerts...")
                alert_result = await alert_manager.send_flood_alerts(risk_level, probability)
                logger.info(f"📱 SMS Alert Summary: {alert_result['alerts_sent']} sent, {alert_result['failed_alerts']} failed")
                
                # Add alert summary to broadcast message
                message["data"]["sms_alert_result"] = {
                    "alerts_sent": alert_result['alerts_sent'],
                    "failed_alerts": alert_result['failed_alerts'],
                    "total_users": alert_result['total_users']
                }
                
            except Exception as e:
                logger.error(f"❌ Error triggering SMS alerts: {str(e)}")
                message["data"]["sms_alert_result"] = {
                    "error": str(e),
                    "alerts_sent": 0,
                    "failed_alerts": 0
                }
        
        try:
            await self.websocket_manager.broadcast(message)
        except Exception as e:
            logger.error(f"Error broadcasting: {e}")
    
    def display_reading(self, timestamp, sensor_data, probability, risk_level, risk_emoji, method, alert_issued):
        """Override to add WebSocket broadcasting"""
        # Call parent method for console display
        super().display_reading(timestamp, sensor_data, probability, risk_level, risk_emoji, method, alert_issued)
        
        # Broadcast to WebSocket clients (run in event loop)
        try:
            # Get the main event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Create task in the running loop
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_reading(timestamp, sensor_data, probability, risk_level, risk_emoji, method, alert_issued),
                    loop
                )
            else:
                # No running loop, skip WebSocket broadcast
                pass
        except RuntimeError:
            # No event loop, skip WebSocket broadcast
            pass

# API Endpoints

@app.get("/")
async def root():
    return {"message": "Dehradun Flood Monitoring API", "status": "running"}

@app.get("/api/status", response_model=SystemStatus)
async def get_system_status():
    """Get current system status"""
    global monitoring_system
    
    if not monitoring_system:
        return SystemStatus(
            is_running=False,
            current_scenario="none",
            data_interval=0,
            total_readings=0,
            uptime_minutes=0
        )
    
    uptime = (time.time() - monitoring_system.start_time) / 60 if monitoring_system.start_time else 0
    
    return SystemStatus(
        is_running=monitoring_system.is_running,
        current_scenario=monitoring_system.current_scenario,
        data_interval=monitoring_system.data_interval,
        total_readings=monitoring_system.total_readings,
        uptime_minutes=uptime
    )

@app.post("/api/start")
async def start_monitoring():
    """Start the monitoring system with scenario support"""
    global monitoring_system, monitoring_thread
    
    if monitoring_system and monitoring_system.is_running:
        return {"message": "Monitoring system is already running"}
    
    try:
        monitoring_system = WebSocketEnabledMonitoringSystem("api_sensor_data.csv")
        monitoring_system.data_interval = 30  # 30 seconds for demo
        monitoring_system.current_scenario = scenario_manager.current_scenario
        
        # Start monitoring in a separate thread
        def run_monitoring():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            monitoring_system.is_running = True
            monitoring_system.start_time = time.time()
            
            # Run the monitoring loop with scenario awareness
            while monitoring_system.is_running:
                start_time = time.time()
                
                # Check for auto-transitions
                if scenario_manager.should_auto_transition():
                    monitoring_system.current_scenario = 'normal'
                    scenario_manager.set_scenario('normal')
                    logger.info("Auto-transitioned back to normal scenario")
                
                # Use current scenario from scenario manager
                monitoring_system.current_scenario = scenario_manager.current_scenario
                monitoring_system.process_sensor_reading()
                
                processing_time = time.time() - start_time
                sleep_time = max(1, monitoring_system.data_interval - processing_time)
                time.sleep(sleep_time)
        
        monitoring_thread = threading.Thread(target=run_monitoring, daemon=True)
        monitoring_thread.start()
        
        logger.info(f"Monitoring system started with scenario: {scenario_manager.current_scenario}")
        return {
            "message": "Monitoring system started successfully",
            "current_scenario": scenario_manager.current_scenario,
            "interval": monitoring_system.data_interval
        }
        
    except Exception as e:
        logger.error(f"Error starting monitoring: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {str(e)}")

@app.post("/api/stop")
async def stop_monitoring():
    """Stop the monitoring system"""
    global monitoring_system
    
    if not monitoring_system or not monitoring_system.is_running:
        return {"message": "Monitoring system is not running"}
    
    monitoring_system.stop()
    logger.info("Monitoring system stopped")
    return {"message": "Monitoring system stopped successfully"}

@app.post("/api/scenario")
async def change_scenario(scenario_change: ScenarioChange):
    """Change monitoring scenario with enhanced controls"""
    global monitoring_system
    
    if not monitoring_system:
        raise HTTPException(status_code=400, detail="Monitoring system not initialized")
    
    valid_scenarios = list(scenario_manager.available_scenarios.keys())
    if scenario_change.scenario not in valid_scenarios:
        raise HTTPException(status_code=400, detail=f"Invalid scenario. Valid options: {valid_scenarios}")
    
    old_scenario = monitoring_system.current_scenario
    
    # Set scenario in both systems
    monitoring_system.current_scenario = scenario_change.scenario
    scenario_manager.set_scenario(scenario_change.scenario)
    
    if scenario_change.interval:
        monitoring_system.data_interval = max(5, min(120, scenario_change.interval))
    
    # Broadcast scenario change
    await manager.broadcast({
        "type": "scenario_change",
        "data": {
            "old_scenario": old_scenario,
            "new_scenario": scenario_change.scenario,
            "interval": monitoring_system.data_interval,
            "scenario_info": scenario_manager.get_scenario_info(scenario_change.scenario)
        }
    })
    
    logger.info(f"Scenario changed from {old_scenario} to {scenario_change.scenario}")
    return {
        "message": f"Scenario changed to {scenario_change.scenario}",
        "old_scenario": old_scenario,
        "new_scenario": scenario_change.scenario,
        "scenario_info": scenario_manager.get_scenario_info(scenario_change.scenario)
    }

@app.get("/api/scenarios")
async def get_available_scenarios():
    """Get all available scenarios and their descriptions"""
    return {
        "current_scenario": scenario_manager.current_scenario,
        "available_scenarios": scenario_manager.available_scenarios,
        "scenario_start_time": scenario_manager.scenario_start_time.isoformat() if scenario_manager.scenario_start_time else None,
        "auto_transition": scenario_manager.auto_transition
    }

@app.post("/api/scenario/auto-transition")
async def toggle_auto_transition(request: dict):
    """Enable/disable automatic scenario transitions"""
    enable = request.get('enable', True)
    scenario_manager.auto_transition = enable
    return {
        "message": f"Auto-transition {'enabled' if enable else 'disabled'}",
        "auto_transition": scenario_manager.auto_transition
    }

@app.post("/api/scenario/duration")
async def set_scenario_duration(request: dict):
    """Set custom duration for a scenario"""
    scenario = request.get('scenario')
    duration_hours = request.get('duration_hours')
    
    if scenario not in scenario_manager.available_scenarios:
        raise HTTPException(status_code=400, detail="Invalid scenario")
    
    scenario_manager.available_scenarios[scenario]['duration_hours'] = duration_hours
    return {
        "message": f"Duration for {scenario} set to {duration_hours} hours",
        "scenario": scenario,
        "duration_hours": duration_hours
    }

@app.get("/api/recent-readings")
async def get_recent_readings(limit: int = 20):
    """Get recent sensor readings with proper format for frontend"""
    try:
        # Read from api_sensor_data.csv which has the real-time sensor data
        if os.path.exists("api_sensor_data.csv"):
            df = pd.read_csv("api_sensor_data.csv", header=None)
            
            if len(df) > 0:
                # Define column names for the raw sensor data format
                # Format: Timestamp,MonsoonIntensity,TopographyDrainage,RiverManagement,Deforestation,Urbanization,ClimateChange,DamsQuality,Siltation,AgriculturalPractices,Encroachments,IneffectiveDisasterPreparedness,DrainageSystems,CoastalVulnerability,Landslides,Watersheds,DeterioratingInfrastructure,PopulationScore,WetlandLoss,InadequatePlanning,PoliticalFactors,FloodProbability,Scenario
                columns = [
                    'timestamp', 'MonsoonIntensity', 'TopographyDrainage', 'RiverManagement', 'Deforestation',
                    'Urbanization', 'ClimateChange', 'DamsQuality', 'Siltation', 'AgriculturalPractices',
                    'Encroachments', 'IneffectiveDisasterPreparedness', 'DrainageSystems', 'CoastalVulnerability',
                    'Landslides', 'Watersheds', 'DeterioratingInfrastructure', 'PopulationScore', 'WetlandLoss',
                    'InadequatePlanning', 'PoliticalFactors', 'floodProbability', 'scenario'
                ]
                
                # Assign column names
                df.columns = columns[:len(df.columns)]
                
                # Take the last N readings
                recent = df.tail(limit)
                records = []
                
                for _, row in recent.iterrows():
                    # Calculate risk level from flood probability
                    prob = float(row.get('floodProbability', 0.0))
                    if prob >= 0.8:
                        risk_level = 'SEVERE'
                    elif prob >= 0.6:
                        risk_level = 'HIGH'
                    elif prob >= 0.4:
                        risk_level = 'MILD'
                    else:
                        risk_level = 'LOW'
                    
                    # Transform to FloodData interface format
                    record = {
                        'timestamp': str(row.get('timestamp', '')),
                        'floodProbability': prob,
                        'risk_level': risk_level,
                        'rainfall': float(row.get('MonsoonIntensity', 0)) * 3.0,  # Convert to rainfall estimate
                        'waterLevel': float(row.get('MonsoonIntensity', 0)) * 0.2 + 1.0,  # Estimate
                        'temperature': 25.0,  # Default values
                        'humidity': 65.0,
                        'windSpeed': 10.0,
                        'soilMoisture': 45.0,
                        'drainageCapacity': float(row.get('DrainageSystems', 8)) * 10,
                        'riverDischarge': 150.0,
                        'deforestation': float(row.get('Deforestation', 5)) / 10.0,
                        'climateChange': float(row.get('ClimateChange', 6)) / 10.0,
                        'cloudCover': 50.0,
                        'urbanization': float(row.get('Urbanization', 7)) / 10.0,
                        'latitude': 30.3165,
                        'longitude': 78.0322,
                        'status': 'active',
                        'id': f"sensor_{len(records)}",
                        'name': f"Dehradun Sensor {len(records)}",
                        'location': {'lat': 30.3165, 'lng': 78.0322},
                        'scenario': row.get('scenario', 'normal'),
                        'prediction_method': 'Real-time Model',
                        'risk_emoji': '🔴' if risk_level == 'SEVERE' else '🟠' if risk_level == 'HIGH' else '🟡' if risk_level == 'MILD' else '🟢'
                    }
                    
                    records.append(record)
                
                return records
        
        return []
    except Exception as e:
        logger.error(f"Error reading sensor data: {e}")
        return []

@app.get("/api/analytics", response_model=Analytics)
async def get_analytics():
    """Get system analytics"""
    try:
        if os.path.exists("live_monitoring_log.csv"):
            df = pd.read_csv("live_monitoring_log.csv")
            
            if len(df) == 0:
                return Analytics(
                    total_readings=0,
                    risk_distribution=RiskDistribution(low=0, mild=0, high=0, severe=0),
                    avg_flood_probability=0.0,
                    alerts_last_hour=0,
                    current_risk_level="UNKNOWN"
                )
            
            # Risk distribution
            risk_counts = df['RiskLevel'].value_counts()
            risk_dist = RiskDistribution(
                low=risk_counts.get('LOW', 0),
                mild=risk_counts.get('MILD', 0),
                high=risk_counts.get('HIGH', 0),
                severe=risk_counts.get('SEVERE', 0)
            )
            
            # Average flood probability
            avg_prob = df['FloodProbability'].mean()
            
            # Alerts in last hour
            if 'Timestamp' in df.columns:
                df['Timestamp'] = pd.to_datetime(df['Timestamp'])
                one_hour_ago = datetime.now() - timedelta(hours=1)
                recent_alerts = df[
                    (df['Timestamp'] >= one_hour_ago) & 
                    (df['AlertIssued'] == True)
                ]
                alerts_last_hour = len(recent_alerts)
            else:
                alerts_last_hour = 0
            
            # Current risk level
            current_risk = df.iloc[-1]['RiskLevel'] if len(df) > 0 else "UNKNOWN"
            
            return Analytics(
                total_readings=len(df),
                risk_distribution=risk_dist,
                avg_flood_probability=round(avg_prob, 3),
                alerts_last_hour=alerts_last_hour,
                current_risk_level=current_risk
            )
        else:
            return Analytics(
                total_readings=0,
                risk_distribution=RiskDistribution(low=0, mild=0, high=0, severe=0),
                avg_flood_probability=0.0,
                alerts_last_hour=0,
                current_risk_level="NO_DATA"
            )
            
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving analytics")

@app.get("/api/dehradun-location")
async def get_dehradun_location():
    """Get Dehradun location data for map"""
    return {
        "city": "Dehradun",
        "state": "Uttarakhand",
        "country": "India",
        "coordinates": {
            "latitude": 30.3165,
            "longitude": 78.0322
        },
        "elevation": 640,
        "rivers": ["Tons", "Asan", "Song"],
        "population": 700000,
        "area_km2": 300,
        "flood_zones": [
            {
                "name": "Tons River Basin",
                "coordinates": [[30.3000, 78.0000], [30.3300, 78.0500], [30.3100, 78.0800]],
                "risk_level": "high"
            },
            {
                "name": "City Center",
                "coordinates": [[30.3100, 78.0200], [30.3200, 78.0400], [30.3150, 78.0350]],
                "risk_level": "medium"
            },
            {
                "name": "Hill Areas",
                "coordinates": [[30.3300, 78.0400], [30.3400, 78.0600], [30.3350, 78.0500]],
                "risk_level": "low"
            }
        ]
    }

# WebSocket endpoint for real-time data
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            
            # Handle client requests
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# AI Recommendations endpoint
@app.get("/api/ai-recommendations")
async def get_ai_recommendations():
    """Get AI-powered flood management recommendations"""
    try:
        # Get latest sensor data
        readings = await get_recent_readings()
        if not readings or len(readings) == 0:
            raise HTTPException(status_code=404, detail="No sensor data available")
        
        latest_reading = readings[0]  # Most recent reading
        
        # Get location data
        location_data = {
            "city": "Dehradun",
            "population": 700000,
            "state": "Uttarakhand"
        }
        
        # Get AI recommendations
        recommendations = await gemini_advisor.get_flood_recommendations(
            sensor_data=latest_reading,
            location_data=location_data
        )
        
        return recommendations
        
    except Exception as e:
        logging.error(f"Error getting AI recommendations: {str(e)}")
        # Return fallback recommendations
        return {
            "timestamp": datetime.now().isoformat(),
            "risk_level": "MODERATE",
            "flood_probability": 0.5,
            "ai_recommendations": "AI service temporarily unavailable. Please monitor weather conditions and follow standard flood protocols.",
            "priority_level": "MEDIUM PRIORITY",
            "action_categories": {
                "immediate_actions": [
                    "Monitor water levels closely",
                    "Check drainage systems",
                    "Prepare emergency supplies"
                ],
                "short_term_actions": [
                    "Review evacuation routes",
                    "Coordinate with emergency services",
                    "Issue public advisories"
                ],
                "monitoring_priorities": [
                    "Rainfall intensity",
                    "River water levels",
                    "Weather forecasts"
                ],
                "risk_assessment": [
                    "Moderate flood risk",
                    "Standard precautions recommended",
                    "Monitor for changes"
                ]
            },
            "summary": "AI advisor is temporarily unavailable. Following standard flood management protocols."
        }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "monitoring_active": monitoring_system.is_running if monitoring_system else False,
        "current_scenario": scenario_manager.current_scenario,
        "scenario_info": scenario_manager.get_scenario_info(scenario_manager.current_scenario)
    }

# User Registration and Alert System Endpoints

# OTP Verification Endpoints
@app.post("/api/otp/send")
async def send_verification_otp(request: OTPRequest):
    """Send OTP verification code to phone number"""
    try:
        result = otp_service.send_verification_otp(request.phone_number)
        
        if result["success"]:
            return {
                "success": True,
                "message": "OTP sent successfully. Please check your SMS.",
                "phone_number": request.phone_number
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@app.post("/api/otp/verify")
async def verify_otp(request: OTPVerification):
    """Verify OTP code"""
    try:
        result = otp_service.verify_otp(request.phone_number, request.otp_code)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Phone number verified successfully!",
                "phone_number": request.phone_number
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.post("/api/otp/register-trial")
async def register_without_otp(request: OTPRequest):
    """Register phone number without OTP verification (for trial accounts)"""
    try:
        result = otp_service.register_without_otp(request.phone_number)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "phone_number": request.phone_number,
                "trial_mode": result.get("trial_mode", False)
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trial registration failed: {str(e)}")

@app.post("/api/users/register", response_model=UserResponse)
async def register_user(user: UserRegistration):
    """Register a new user for flood alerts"""
    try:        
        user_id = alert_manager.db.register_user(
            phone_number=user.phone_number,
            name=user.name,
            area=user.area,
            latitude=user.latitude,
            longitude=user.longitude
        )
        
        # Get the created user
        users = alert_manager.db.get_all_users()
        created_user = next((u for u in users if u['id'] == user_id), None)
        
        if created_user:
            return UserResponse(**created_user)
        else:
            raise HTTPException(status_code=500, detail="Failed to retrieve created user")
            
    except Exception as e:
        if "already registered" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.get("/api/users", response_model=List[UserResponse])
async def get_all_users():
    """Get all registered users"""
    try:
        users = alert_manager.db.get_all_users()
        return [UserResponse(**user) for user in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve users: {str(e)}")

@app.get("/api/users/{user_id}/alerts")
async def get_user_alerts(user_id: int, limit: int = 10):
    """Get alert history for a specific user"""
    try:
        alerts = alert_manager.db.get_user_alerts(user_id, limit)
        return {
            "user_id": user_id,
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")

@app.post("/api/alerts/send", response_model=AlertResponse)
async def send_alerts(alert_request: AlertRequest):
    """Manually send alerts to all users based on current risk level"""
    try:
        result = await alert_manager.send_flood_alerts(
            alert_request.risk_level,
            alert_request.flood_probability
        )
        return AlertResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send alerts: {str(e)}")

@app.post("/api/alerts/auto-send")
async def auto_send_alerts():
    """Automatically send alerts based on current flood conditions"""
    try:
        # Get current readings
        readings = await get_recent_readings(limit=1)
        if not readings:
            raise HTTPException(status_code=404, detail="No current sensor data available")
        
        latest_reading = readings[0]
        risk_level = latest_reading.get('risk_level', 'UNKNOWN')
        flood_probability = latest_reading.get('floodProbability', 0)
        
        result = await alert_manager.send_flood_alerts(risk_level, flood_probability)
        return AlertResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to auto-send alerts: {str(e)}")

@app.get("/api/alerts/stats")
async def get_alert_stats():
    """Get statistics about alerts and users"""
    try:
        users = alert_manager.db.get_all_users()
        
        # Count users by area
        area_counts = {}
        for user in users:
            area = user['area']
            area_counts[area] = area_counts.get(area, 0) + 1
        
        # Count recent alerts (last 24 hours)
        recent_alerts = 0
        for user in users:
            alerts = alert_manager.db.get_alert_history(user['id'], limit=100)
            recent_alerts += len([a for a in alerts 
                                if datetime.fromisoformat(a['sent_at']) > datetime.now() - timedelta(days=1)])
        
        return {
            "total_users": len(users),
            "users_by_area": area_counts,
            "alerts_last_24h": recent_alerts,
            "emergency_contacts": alert_manager.emergency_contacts,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alert stats: {str(e)}")

# Terminal control interface for scenarios
def print_scenario_menu():
    """Print available scenario controls"""
    print("\n" + "="*60)
    print("🌊 FLOOD MONITORING - SCENARIO CONTROL PANEL 🌊")
    print("="*60)
    print("Current Scenario:", scenario_manager.current_scenario.upper())
    
    scenario_info = scenario_manager.get_scenario_info(scenario_manager.current_scenario)
    if scenario_info:
        print(f"Description: {scenario_info.get('description', 'N/A')}")
        print(f"Risk Range: {scenario_info.get('risk_range', 'N/A')}")
    
    print("\n📋 AVAILABLE COMMANDS:")
    print("1️⃣  = Normal Weather (Low Risk)")
    print("2️⃣  = Heavy Rain (Medium Risk)")  
    print("3️⃣  = Flood Event (High Risk)")
    print("4️⃣  = Pre-Monsoon (Low Risk)")
    print("5️⃣  = Drought (Very Low Risk)")
    print("🔄 r = Refresh Status")
    print("📊 s = Show System Status")
    print("🔧 a = Toggle Auto-transition")
    print("⏱️  d = Set Duration (format: d,scenario,hours)")
    print("❓ h = Help")
    print("🚪 q = Quit Terminal Control")
    print("="*60)

def handle_terminal_input():
    """Handle terminal input for scenario control"""
    import msvcrt
    import sys
    
    scenarios = {
        '1': 'normal',
        '2': 'heavy_rain', 
        '3': 'flood',
        '4': 'pre_monsoon',
        '5': 'drought'
    }
    
    print_scenario_menu()
    
    while True:
        try:
            if msvcrt.kbhit():
                key = msvcrt.getch().decode('utf-8').lower()
                
                if key == 'q':
                    print("\n👋 Exiting terminal control. Server continues running...")
                    break
                    
                elif key in scenarios:
                    old_scenario = scenario_manager.current_scenario
                    new_scenario = scenarios[key]
                    
                    if monitoring_system:
                        monitoring_system.current_scenario = new_scenario
                    scenario_manager.set_scenario(new_scenario)
                    
                    print(f"\n✅ Scenario changed: {old_scenario} → {new_scenario}")
                    scenario_info = scenario_manager.get_scenario_info(new_scenario)
                    print(f"   {scenario_info.get('description', '')}")
                    
                elif key == 'r':
                    print_scenario_menu()
                    
                elif key == 's':
                    print(f"\n📊 SYSTEM STATUS:")
                    if monitoring_system:
                        print(f"   Monitoring: {'🟢 ACTIVE' if monitoring_system.is_running else '🔴 STOPPED'}")
                        print(f"   Readings: {monitoring_system.total_readings}")
                        print(f"   Interval: {monitoring_system.data_interval}s")
                    else:
                        print("   Monitoring: 🔴 NOT INITIALIZED")
                    print(f"   Current Scenario: {scenario_manager.current_scenario}")
                    print(f"   Auto-transition: {'🟢 ON' if scenario_manager.auto_transition else '🔴 OFF'}")
                    
                elif key == 'a':
                    scenario_manager.auto_transition = not scenario_manager.auto_transition
                    status = "🟢 ENABLED" if scenario_manager.auto_transition else "🔴 DISABLED"
                    print(f"\n🔄 Auto-transition: {status}")
                    
                elif key == 'h':
                    print_scenario_menu()
                    
                elif key == 'd':
                    print("\n⏱️  Set Duration Format: Enter 'scenario,hours' (e.g., heavy_rain,2)")
                    print("   Available scenarios: normal, heavy_rain, flood, pre_monsoon, drought")
                    
        except KeyboardInterrupt:
            print("\n👋 Exiting terminal control...")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
        
        time.sleep(0.1)

def start_terminal_control():
    """Start terminal control in a separate thread"""
    terminal_thread = threading.Thread(target=handle_terminal_input, daemon=True)
    terminal_thread.start()
    return terminal_thread

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Flood Monitoring API Server...")
    print("💻 Terminal controls will be available after server starts")
    
    # Start terminal control in background
    terminal_thread = start_terminal_control()
    
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
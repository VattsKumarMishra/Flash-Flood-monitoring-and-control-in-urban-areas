import pandas as pd
import numpy as np
import time
import threading
import os
from datetime import datetime
import json
import msvcrt  # For Windows key detection
import sys

class StreamlinedFloodMonitoringSystem:
    def __init__(self, sensor_data_file="live_sensor_data.csv"):
        self.sensor_data_file = sensor_data_file
        self.output_file = sensor_data_file  # Fix: Set output_file to sensor_data_file
        self.monitoring_log_file = "live_monitoring_log.csv"
        self.is_running = False
        self.current_scenario = "normal"
        self.data_interval = 60  # seconds between readings (1 minute)
        self.total_readings = 0
        self.start_time = None
        self.reading_count = 0
        
        # Model attributes
        self.prediction_model = None
        self.scaler = None
        self.feature_generator = None
        self.model_available = False
        self.sequence_buffer = []
        self.sequence_length = 3  # Reduced for faster testing (was 10)
        self.last_reading = {}
        
        # Available scenarios
        self.scenarios = {
            '1': 'normal',
            '2': 'heavy_rain', 
            '3': 'flood',
            '4': 'pre_monsoon',
            '5': 'drought'
        }
        
        # Try to load model
        self.load_saved_model()
        
        # Initialize CSV file with headers
        self.initialize_csv()
        
        # Control thread
        self.control_thread = None
        
    def load_saved_model(self):
        """Load model - simplified version"""
        print("🤖 Checking for pre-trained models...")
        try:
            import joblib
            model_data = joblib.load('saved_models/best_model_latest.joblib')
            if isinstance(model_data, dict):
                self.prediction_model = model_data.get('model')
                self.scaler = model_data.get('scaler')
                self.feature_generator = model_data.get('feature_generator')
                self.model_available = True
                print("✅ Loaded pre-trained model")
                print("✅ Loaded scaler and polynomial feature generator")
                print("🤖 Model will be the sole authority for risk classification")
        except Exception as e:
            print(f"⚠️ Model loading failed: {e}")
            
    def initialize_csv(self):
        """Initialize CSV files"""
        pass  # Simplified
    
    def start_monitoring(self, scenario="normal"):
        """Start monitoring"""
        self.current_scenario = scenario
        self.is_running = True
        self.start_time = datetime.now()
        print(f"✅ Scenario changed: normal → {scenario}")
        print(f"   Typical weather conditions with low flood risk")
        return True
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.is_running = False
        print("🛑 Monitoring stopped")
    
    def change_scenario(self, scenario):
        """Change scenario"""
        self.current_scenario = scenario
        print(f"✅ Scenario changed to: {scenario}")
        return True
        
    def get_status(self):
        """Get status"""
        uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        return {
            'is_monitoring': self.is_running,
            'total_readings': self.total_readings,
            'last_reading_time': datetime.now().isoformat() if self.is_running else None,
            'current_scenario': self.current_scenario,
            'uptime_seconds': uptime,
        }
    
    def get_recent_readings(self, limit=50):
        """Get recent readings"""
        return []  # Simplified
    
    def generate_sensor_reading(self, scenario_type="normal"):
        """Generate sensor reading with CORRECTED ranges"""
        # CORRECTED ranges for normal scenario 
        base_ranges = {
            'MonsoonIntensity': (2, 6),        
            'TopographyDrainage': (3, 7),      
            'RiverManagement': (2, 6),         
            'Deforestation': (2, 6),           
            'Urbanization': (3, 7),            
            'ClimateChange': (3, 7),           
            'DamsQuality': (3, 7),             
            'Siltation': (1, 5),               
            'AgriculturalPractices': (2, 6),   
            'Encroachments': (2, 6),           
            'IneffectiveDisasterPreparedness': (3, 7),  
            'DrainageSystems': (2, 6),         
            'CoastalVulnerability': (1, 3),    
            'Landslides': (3, 7),              
            'Watersheds': (2, 6),              
            'DeterioratingInfrastructure': (3, 7),  
            'PopulationScore': (4, 8),         
            'WetlandLoss': (3, 6),             
            'InadequatePlanning': (3, 7),      
            'PoliticalFactors': (2, 6),        
        }
        
        # Scenario adjustments
        if scenario_type == "flood":
            for param in base_ranges:
                old_range = base_ranges[param]
                base_ranges[param] = (old_range[0] + 4, min(16, old_range[1] + 6))
            base_ranges['MonsoonIntensity'] = (10, 16)
        elif scenario_type == "heavy_rain":
            for param in ['MonsoonIntensity', 'Landslides', 'IneffectiveDisasterPreparedness']:
                old_range = base_ranges[param]
                base_ranges[param] = (old_range[0] + 3, old_range[1] + 5)
        
        # Generate values
        sensor_data = {}
        for param, (min_val, max_val) in base_ranges.items():
            sensor_data[param] = np.random.randint(min_val, max_val + 1)
        
        return sensor_data
    
    def predict_flood_risk(self, sensor_data):
        """Predict flood risk using correct pipeline"""
        if not self.model_available:
            return None
            
        # Wait for 10 readings
        feature_order = ['MonsoonIntensity', 'TopographyDrainage', 'RiverManagement', 'Deforestation',
                        'Urbanization', 'ClimateChange', 'DamsQuality', 'Siltation', 'AgriculturalPractices',
                        'Encroachments', 'IneffectiveDisasterPreparedness', 'DrainageSystems',
                        'CoastalVulnerability', 'Landslides', 'Watersheds', 'DeterioratingInfrastructure',
                        'PopulationScore', 'WetlandLoss', 'InadequatePlanning', 'PoliticalFactors']
        
        features = [sensor_data[col] for col in feature_order]
        self.sequence_buffer.append(features)
        
        if len(self.sequence_buffer) > self.sequence_length:
            self.sequence_buffer = self.sequence_buffer[-self.sequence_length:]
        
        if len(self.sequence_buffer) < self.sequence_length:
            buffer_progress = len(self.sequence_buffer)
            print(f"⏳ Building sequence buffer: {buffer_progress}/{self.sequence_length} readings")
            print("⌛ Waiting for 10 readings before model can make first prediction")
            print(f"🐛 DEBUG: Buffer length = {len(self.sequence_buffer)}, Required = {self.sequence_length}")
            return None
        
        # We have 10 or more readings - proceed with prediction
        print(f"✅ Sequence buffer full ({len(self.sequence_buffer)}/{self.sequence_length}) - Making prediction!")
        
        try:
            # Correct pipeline: features -> polynomial -> scale -> predict
            feature_array = np.array(features).reshape(1, -1)
            
            if self.feature_generator is not None:
                poly_features = self.feature_generator.transform(feature_array)
                print(f"🧮 Generated polynomial features: {feature_array.shape} → {poly_features.shape}")
            else:
                poly_features = feature_array
            
            if self.scaler is not None:
                scaled_features = self.scaler.transform(poly_features)
            else:
                scaled_features = poly_features
            
            probability = self.prediction_model.predict(scaled_features)[0]
            probability = max(0.0, min(1.0, float(probability)))
            
            print(f"🤖 Model prediction: {probability:.3f} ({probability*100:.1f}%)")
            return probability
            
        except Exception as e:
            print(f"⚠️ Model prediction failed: {e}")
            return None
    
    def process_sensor_reading(self):
        """Process one reading"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sensor_data = self.generate_sensor_reading(self.current_scenario)
        
        # Save raw sensor data to CSV file for API
        self.append_data_to_csv(sensor_data)
        
        flood_probability = self.predict_flood_risk(sensor_data)
        
        if flood_probability is None:
            print(f"⏭️  Skipping reading #{self.reading_count} - waiting for model prediction")
            print(f"🔢 Need {self.sequence_length - len(self.sequence_buffer)} more readings for model activation")
            self.reading_count += 1
            return
        
        # Model-based risk classification
        if flood_probability >= 0.8:
            risk_level, risk_emoji = "SEVERE", "🔴"
        elif flood_probability >= 0.6:
            risk_level, risk_emoji = "HIGH", "🟠"
        elif flood_probability >= 0.4:
            risk_level, risk_emoji = "MILD", "🟡"
        else:
            risk_level, risk_emoji = "LOW", "🟢"
        
        # Simple display
        alert_issued = risk_level in ['HIGH', 'SEVERE']
        if alert_issued:
            print(f"\n🚨 FLOOD ALERT - {risk_level} RISK {risk_emoji}")
            print(f"📊 Risk: {flood_probability:.3f} ({flood_probability*100:.1f}%)")
        else:
            print(f"{risk_emoji} {timestamp.split()[1]} | {self.current_scenario.upper()[:4]} | "
                  f"{risk_level} {flood_probability:.3f} | #{self.total_readings}")
        
        self.total_readings += 1
        self.reading_count += 1
    
    def monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            self.process_sensor_reading()
            time.sleep(max(1, self.data_interval))
        """Initialize the CSV file with headers if it doesn't exist"""
        headers = [
            'Timestamp', 'MonsoonIntensity', 'TopographyDrainage', 'RiverManagement', 
            'Deforestation', 'Urbanization', 'ClimateChange', 'DamsQuality', 'Siltation',
            'AgriculturalPractices', 'Encroachments', 'IneffectiveDisasterPreparedness',
            'DrainageSystems', 'CoastalVulnerability', 'Landslides', 'Watersheds',
            'DeterioratingInfrastructure', 'PopulationScore', 'WetlandLoss',
            'InadequatePlanning', 'PoliticalFactors', 'FloodProbability', 'Scenario'
        ]
        
        if not os.path.exists(self.output_file):
            df = pd.DataFrame(columns=headers)
            df.to_csv(self.output_file, index=False)
            print(f"📁 Created new sensor data file: {self.output_file}")
        else:
            print(f"📁 Using existing sensor data file: {self.output_file}")
    
    def generate_sensor_reading(self, scenario_type="normal"):
        """Generate a single sensor reading based on scenario"""
        
        # Base ranges for different parameters (Dehradun-specific)
        base_ranges = {
            'MonsoonIntensity': (2, 8),
            'TopographyDrainage': (4, 9),  # Good drainage in foothills
            'RiverManagement': (3, 7),
            'Deforestation': (3, 8),  # Moderate due to urbanization
            'Urbanization': (5, 9),  # Growing city
            'ClimateChange': (4, 8),
            'DamsQuality': (4, 8),
            'Siltation': (2, 6),
            'AgriculturalPractices': (3, 7),
            'Encroachments': (3, 7),
            'IneffectiveDisasterPreparedness': (4, 8),
            'DrainageSystems': (3, 8),
            'CoastalVulnerability': (1, 3),  # Inland city
            'Landslides': (4, 8),  # Higher risk in hills
            'Watersheds': (3, 7),
            'DeterioratingInfrastructure': (4, 8),
            'PopulationScore': (5, 9),  # Growing population
            'WetlandLoss': (4, 7),
            'InadequatePlanning': (4, 8),
            'PoliticalFactors': (3, 7),
        }
        
        # Scenario modifications
        if scenario_type == "heavy_rain":
            base_ranges['MonsoonIntensity'] = (10, 16)
            base_ranges['DrainageSystems'] = (2, 5)  # Overwhelmed drainage
            base_ranges['Landslides'] = (6, 10)
            
        elif scenario_type == "flood":
            base_ranges['MonsoonIntensity'] = (12, 16)
            base_ranges['DrainageSystems'] = (1, 4)
            base_ranges['RiverManagement'] = (1, 4)
            base_ranges['Landslides'] = (7, 12)
            base_ranges['IneffectiveDisasterPreparedness'] = (6, 10)
            
        elif scenario_type == "pre_monsoon":
            base_ranges['MonsoonIntensity'] = (1, 4)
            base_ranges['DrainageSystems'] = (6, 10)
            
        elif scenario_type == "drought":
            base_ranges['MonsoonIntensity'] = (0, 2)
            base_ranges['ClimateChange'] = (7, 12)
            
        # Generate values
        sensor_data = {}
        for param, (min_val, max_val) in base_ranges.items():
            sensor_data[param] = np.random.randint(min_val, max_val + 1)
        
        # Calculate flood probability based on key factors
        flood_probability = self.calculate_flood_probability(sensor_data, scenario_type)
        sensor_data['FloodProbability'] = round(flood_probability, 3)
        
        return sensor_data
    
    def calculate_flood_probability(self, sensor_data, scenario_type):
        """Calculate flood probability based on sensor readings"""
        # Weight factors
        weights = {
            'MonsoonIntensity': 0.25,
            'DrainageSystems': -0.20,  # Negative because good drainage reduces risk
            'RiverManagement': -0.15,  # Negative because good management reduces risk
            'Landslides': 0.15,
            'Urbanization': 0.10,
            'ClimateChange': 0.08,
            'IneffectiveDisasterPreparedness': 0.07
        }
        
        # Calculate weighted score
        score = 0
        for factor, weight in weights.items():
            if factor in sensor_data:
                normalized_value = sensor_data[factor] / 16.0  # Normalize to 0-1
                if weight < 0:  # For factors that reduce risk
                    normalized_value = 1 - normalized_value
                score += normalized_value * weight
        
        # Base probability by scenario
        base_prob = {
            'normal': 0.35,
            'heavy_rain': 0.55,
            'flood': 0.75,
            'pre_monsoon': 0.25,
            'drought': 0.15
        }
        
        # Combine base probability with calculated score
        probability = base_prob.get(scenario_type, 0.35) + score
        
        # Add some randomness and ensure valid range
        probability += np.random.uniform(-0.05, 0.05)
        probability = max(0.15, min(0.95, probability))
        
        return probability
    
    def append_data_to_csv(self, sensor_data):
        """Append new sensor reading to CSV file"""
        print(f"🔥 DEBUG: Writing sensor data to {self.output_file}")
        
        # Add timestamp and scenario
        row_data = {
            'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            **sensor_data,
            'Scenario': self.current_scenario
        }
        
        # Create DataFrame and append
        df = pd.DataFrame([row_data])
        df.to_csv(self.output_file, mode='a', header=False, index=False)
        print(f"✅ DEBUG: Data written to {self.output_file}")
        
        self.total_readings += 1
        
        # Print status
        risk_level = self.get_risk_level(sensor_data['FloodProbability'])
        print(f"📊 Reading #{self.total_readings} | {row_data['Timestamp']} | "
              f"Scenario: {self.current_scenario.upper()} | "
              f"Risk: {risk_level} ({sensor_data['FloodProbability']:.3f})")
    
    def get_risk_level(self, probability):
        """Get risk level emoji and text"""
        if probability >= 0.8:
            return "🔴 SEVERE"
        elif probability >= 0.6:
            return "🟠 HIGH"
        elif probability >= 0.4:
            return "🟡 MILD"
        else:
            return "🟢 LOW"
    
    def data_generation_loop(self):
        """Main loop for continuous data generation"""
        while self.is_running:
            # Generate sensor reading
            sensor_data = self.generate_sensor_reading(self.current_scenario)
            
            # Append to CSV
            self.append_data_to_csv(sensor_data)
            
            # Wait for next reading
            time.sleep(self.data_interval)
    
    def control_loop(self):
        """Control loop for user input (Windows)"""
        print("\n🎮 CONTROL COMMANDS:")
        print("1 = Normal weather")
        print("2 = Heavy rain")
        print("3 = Flood conditions") 
        print("4 = Pre-monsoon")
        print("5 = Drought")
        print("+ = Increase frequency (shorter intervals)")
        print("- = Decrease frequency (longer intervals)")
        print("s = Show status")
        print("q = Quit")
        print("\nPress any key to change scenario...")
        
        while self.is_running:
            if msvcrt.kbhit():
                key = msvcrt.getch().decode('utf-8').lower()
                
                if key in self.scenarios:
                    old_scenario = self.current_scenario
                    self.current_scenario = self.scenarios[key]
                    print(f"\n🔄 Scenario changed: {old_scenario.upper()} → {self.current_scenario.upper()}")
                    
                elif key == '+':
                    if self.data_interval > 10:
                        self.data_interval = max(10, self.data_interval - 10)
                        print(f"\n⚡ Frequency increased: Reading every {self.data_interval} seconds")
                    
                elif key == '-':
                    if self.data_interval < 300:
                        self.data_interval = min(300, self.data_interval + 10)
                        print(f"\n🐌 Frequency decreased: Reading every {self.data_interval} seconds")
                    
                elif key == 's':
                    self.show_status()
                    
                elif key == 'q':
                    print("\n🛑 Stopping data generation...")
                    self.stop()
                    break
            
            time.sleep(0.1)  # Small delay to prevent high CPU usage
    
    def show_status(self):
        """Show current system status"""
        elapsed = time.time() - self.start_time if self.start_time else 0
        print(f"\n📋 SYSTEM STATUS:")
        print(f"   📁 File: {self.output_file}")
        print(f"   🎭 Current Scenario: {self.current_scenario.upper()}")
        print(f"   ⏱️  Interval: {self.data_interval} seconds")
        print(f"   📊 Total Readings: {self.total_readings}")
        print(f"   ⏰ Running Time: {elapsed/60:.1f} minutes")
        print(f"   📈 Average Rate: {self.total_readings/(elapsed/60):.1f} readings/minute" if elapsed > 0 else "")
    
    def start(self):
        """Start continuous data generation"""
        print("🌊 CONTINUOUS FLOOD SENSOR DATA GENERATOR")
        print("=" * 60)
        print(f"📍 Location: Dehradun, Uttarakhand")
        print(f"📁 Output File: {self.output_file}")
        print(f"⏱️  Initial Interval: {self.data_interval} seconds")
        print(f"🎭 Initial Scenario: {self.current_scenario.upper()}")
        print("=" * 60)
        
        self.is_running = True
        self.start_time = time.time()
        
        # Start data generation thread
        data_thread = threading.Thread(target=self.data_generation_loop)
        data_thread.daemon = True
        data_thread.start()
        
        # Start control thread
        self.control_thread = threading.Thread(target=self.control_loop)
        self.control_thread.daemon = True
        self.control_thread.start()
        
        try:
            # Keep main thread alive
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n🛑 Stopped by Ctrl+C")
            self.stop()
    
    def stop(self):
        """Stop data generation"""
        self.is_running = False
        self.show_final_summary()
    
    def show_final_summary(self):
        """Show final summary when stopping"""
        print("\n" + "=" * 60)
        print("📋 FINAL SUMMARY")
        print("=" * 60)
        
        if os.path.exists(self.output_file):
            df = pd.read_csv(self.output_file)
            print(f"📁 Data saved to: {self.output_file}")
            print(f"📊 Total records in file: {len(df)}")
            
            if len(df) > 0:
                # Show scenario distribution
                scenario_counts = df['Scenario'].value_counts()
                print(f"\n🎭 Scenario Distribution:")
                for scenario, count in scenario_counts.items():
                    percentage = (count / len(df)) * 100
                    print(f"   {scenario.upper()}: {count} ({percentage:.1f}%)")
                
                # Show risk level distribution
                if 'FloodProbability' in df.columns:
                    risk_levels = pd.cut(df['FloodProbability'], 
                                       bins=[0, 0.4, 0.6, 0.8, 1.0], 
                                       labels=['LOW', 'MILD', 'HIGH', 'SEVERE'])
                    risk_counts = risk_levels.value_counts()
                    print(f"\n🚨 Risk Level Distribution:")
                    for risk, count in risk_counts.items():
                        percentage = (count / len(df)) * 100
                        emoji = {'LOW': '🟢', 'MILD': '🟡', 'HIGH': '🟠', 'SEVERE': '🔴'}
                        print(f"   {emoji.get(risk, '⚪')} {risk}: {count} ({percentage:.1f}%)")
        
        print("=" * 60)
        print("✅ Data generation completed successfully!")

def main():
    """Main function"""
    print("🌊 Welcome to Continuous Flood Sensor Data Generator")
    
    # Get output filename
    default_file = "continuous_sensor_data.csv"
    filename = input(f"Enter output filename (default: {default_file}): ").strip()
    if not filename:
        filename = default_file
# StreamlinedFloodMonitoringSystem class complete
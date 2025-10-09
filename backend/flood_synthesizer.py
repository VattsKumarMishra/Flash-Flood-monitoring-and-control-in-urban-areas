import pandas as pd
import random
from datetime import datetime, timedelta
import numpy as np
import os

# --- Configuration for Dehradun Flood Risk Assessment ---
DEHRADUN_CONFIG = {
    "location": "Dehradun, Uttarakhand",
    "monsoon_season": {"start_month": 6, "end_month": 9},
    "geographical_factors": {
        "topography": "Himalayan foothills",
        "rivers": ["Tons", "Asan", "Song"],
        "elevation": 640  # meters above sea level
    }
}

# Column definitions matching flood.csv dataset
FLOOD_COLUMNS = [
    'MonsoonIntensity', 'TopographyDrainage', 'RiverManagement', 'Deforestation',
    'Urbanization', 'ClimateChange', 'DamsQuality', 'Siltation', 'AgriculturalPractices',
    'Encroachments', 'IneffectiveDisasterPreparedness', 'DrainageSystems',
    'CoastalVulnerability', 'Landslides', 'Watersheds', 'DeterioratingInfrastructure',
    'PopulationScore', 'WetlandLoss', 'InadequatePlanning', 'PoliticalFactors',
    'FloodProbability'
]

import pandas as pd
import random
from datetime import datetime, timedelta
import numpy as np
import os

# --- Configuration for Dehradun Flood Risk Assessment ---
DEHRADUN_CONFIG = {
    "location": "Dehradun, Uttarakhand",
    "monsoon_season": {"start_month": 6, "end_month": 9},
    "geographical_factors": {
        "topography": "Himalayan foothills",
        "rivers": ["Tons", "Asan", "Song"],
        "elevation": 640  # meters above sea level
    }
}

# Column definitions matching flood.csv dataset
FLOOD_COLUMNS = [
    'MonsoonIntensity', 'TopographyDrainage', 'RiverManagement', 'Deforestation',
    'Urbanization', 'ClimateChange', 'DamsQuality', 'Siltation', 'AgriculturalPractices',
    'Encroachments', 'IneffectiveDisasterPreparedness', 'DrainageSystems',
    'CoastalVulnerability', 'Landslides', 'Watersheds', 'DeterioratingInfrastructure',
    'PopulationScore', 'WetlandLoss', 'InadequatePlanning', 'PoliticalFactors',
    'FloodProbability'
]

def generate_dehradun_sensor_reading(scenario_type="normal", time_of_year="monsoon"):
    """
    Generate a single sensor reading for Dehradun flood risk assessment.
    
    Args:
        scenario_type: 'normal', 'heavy_rain', 'flood', 'pre_monsoon', 'post_monsoon'
        time_of_year: 'monsoon', 'winter', 'summer', 'pre_monsoon', 'post_monsoon'
    
    Returns:
        dict: Single row of flood risk data matching flood.csv format
    """
    
    # Base values for different scenarios
    if scenario_type == "normal":
        base_ranges = {
            'MonsoonIntensity': (2, 6),
            'TopographyDrainage': (4, 8),
            'RiverManagement': (5, 8),
            'Deforestation': (2, 5),
            'Urbanization': (3, 6),
            'ClimateChange': (3, 6),
            'DamsQuality': (5, 8),
            'Siltation': (2, 5),
            'AgriculturalPractices': (3, 6),
            'Encroachments': (2, 5),
            'IneffectiveDisasterPreparedness': (3, 6),
            'DrainageSystems': (5, 9),
            'CoastalVulnerability': (1, 3),  # Low for Dehradun (inland)
            'Landslides': (2, 6),  # Moderate risk due to hills
            'Watersheds': (4, 7),
            'DeterioratingInfrastructure': (3, 6),
            'PopulationScore': (4, 7),
            'WetlandLoss': (2, 5),
            'InadequatePlanning': (3, 6),
            'PoliticalFactors': (3, 6)
        }
        flood_prob_range = (0.35, 0.55)
        
    elif scenario_type == "heavy_rain":
        base_ranges = {
            'MonsoonIntensity': (7, 12),
            'TopographyDrainage': (3, 7),
            'RiverManagement': (3, 6),
            'Deforestation': (4, 8),
            'Urbanization': (5, 8),
            'ClimateChange': (6, 9),
            'DamsQuality': (3, 6),
            'Siltation': (4, 7),
            'AgriculturalPractices': (3, 6),
            'Encroachments': (4, 7),
            'IneffectiveDisasterPreparedness': (5, 8),
            'DrainageSystems': (2, 6),
            'CoastalVulnerability': (1, 3),
            'Landslides': (5, 9),
            'Watersheds': (3, 6),
            'DeterioratingInfrastructure': (4, 7),
            'PopulationScore': (5, 8),
            'WetlandLoss': (4, 7),
            'InadequatePlanning': (4, 7),
            'PoliticalFactors': (4, 7)
        }
        flood_prob_range = (0.55, 0.75)
        
    elif scenario_type == "flood":
        base_ranges = {
            'MonsoonIntensity': (10, 16),
            'TopographyDrainage': (1, 4),
            'RiverManagement': (1, 4),
            'Deforestation': (6, 10),
            'Urbanization': (7, 10),
            'ClimateChange': (8, 12),
            'DamsQuality': (1, 4),
            'Siltation': (6, 10),
            'AgriculturalPractices': (2, 5),
            'Encroachments': (6, 10),
            'IneffectiveDisasterPreparedness': (7, 10),
            'DrainageSystems': (1, 4),
            'CoastalVulnerability': (1, 3),
            'Landslides': (7, 12),
            'Watersheds': (2, 5),
            'DeterioratingInfrastructure': (6, 10),
            'PopulationScore': (6, 10),
            'WetlandLoss': (5, 8),
            'InadequatePlanning': (6, 10),
            'PoliticalFactors': (5, 9)
        }
        flood_prob_range = (0.65, 0.85)
        
    else:  # pre_monsoon or post_monsoon
        base_ranges = {
            'MonsoonIntensity': (1, 4),
            'TopographyDrainage': (5, 9),
            'RiverManagement': (6, 9),
            'Deforestation': (2, 5),
            'Urbanization': (4, 7),
            'ClimateChange': (3, 6),
            'DamsQuality': (6, 9),
            'Siltation': (2, 4),
            'AgriculturalPractices': (4, 7),
            'Encroachments': (2, 5),
            'IneffectiveDisasterPreparedness': (2, 5),
            'DrainageSystems': (6, 10),
            'CoastalVulnerability': (1, 2),
            'Landslides': (1, 4),
            'Watersheds': (5, 8),
            'DeterioratingInfrastructure': (2, 5),
            'PopulationScore': (3, 6),
            'WetlandLoss': (2, 4),
            'InadequatePlanning': (2, 5),
            'PoliticalFactors': (3, 6)
        }
        flood_prob_range = (0.25, 0.45)
    
    # Generate values for each column
    sensor_data = {}
    
    for column in FLOOD_COLUMNS[:-1]:  # All except FloodProbability
        min_val, max_val = base_ranges[column]
        # Add some randomness with seasonal adjustments
        if time_of_year == "monsoon" and column == 'MonsoonIntensity':
            min_val += 2
            max_val += 3
        elif time_of_year == "winter" and column == 'MonsoonIntensity':
            min_val = max(0, min_val - 2)
            max_val = max(1, max_val - 3)
            
        sensor_data[column] = random.randint(min_val, max_val)
    
    # Calculate FloodProbability based on scenario
    min_prob, max_prob = flood_prob_range
    base_prob = random.uniform(min_prob, max_prob)
    
    # Add some correlation with key factors
    key_factors = ['MonsoonIntensity', 'DrainageSystems', 'Urbanization', 'Landslides']
    adjustment = 0
    for factor in key_factors:
        if factor == 'DrainageSystems':
            # Good drainage reduces flood probability
            adjustment -= (sensor_data[factor] - 5) * 0.01
        else:
            # Other factors increase flood probability
            adjustment += (sensor_data[factor] - 5) * 0.005
    
    final_prob = max(0.25, min(0.85, base_prob + adjustment))
    sensor_data['FloodProbability'] = round(final_prob, 3)
    
    return sensor_data

def generate_time_series_data(hours=24, scenario_type="normal", season="monsoon"):
    """
    Generate time series sensor data for specified duration.
    
    Args:
        hours: Number of hours of data to generate
        scenario_type: Type of weather scenario
        season: Current season
    
    Returns:
        list: List of sensor readings
    """
    data = []
    current_time = datetime.now()
    
    # Simulate gradual changes over time for realistic sensor behavior
    previous_reading = None
    
    for hour in range(hours):
        timestamp = current_time + timedelta(hours=hour)
        
        # Generate base reading
        reading = generate_dehradun_sensor_reading(scenario_type, season)
        reading['timestamp'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
        reading['sensor_location'] = DEHRADUN_CONFIG['location']
        
        # Add temporal correlation with previous reading
        if previous_reading:
            for column in FLOOD_COLUMNS[:-1]:
                # Apply smoothing to make changes more gradual
                change = random.randint(-2, 2)
                new_value = previous_reading[column] + change
                new_value = max(0, min(16, new_value))  # Keep within reasonable bounds
                reading[column] = new_value
            
            # Recalculate FloodProbability based on adjusted values
            key_factors_sum = (reading['MonsoonIntensity'] + reading['Urbanization'] + 
                             reading['Landslides'] - reading['DrainageSystems'])
            base_prob = 0.3 + (key_factors_sum / 50.0)
            reading['FloodProbability'] = round(max(0.25, min(0.85, base_prob)), 3)
        
        data.append(reading)
        previous_reading = reading.copy()
    
    return data

def generate_batch_data(num_samples=1000, scenario_distribution=None):
    """
    Generate a batch of diverse sensor readings.
    
    Args:
        num_samples: Number of samples to generate
        scenario_distribution: Dict with scenario types and their proportions
    
    Returns:
        pandas.DataFrame: DataFrame with generated data
    """
    if scenario_distribution is None:
        scenario_distribution = {
            'normal': 0.6,
            'heavy_rain': 0.25,
            'flood': 0.1,
            'pre_monsoon': 0.05
        }
    
    seasons = ['monsoon', 'pre_monsoon', 'post_monsoon', 'winter', 'summer']
    season_weights = [0.4, 0.2, 0.2, 0.1, 0.1]
    
    data = []
    
    for i in range(num_samples):
        # Select scenario based on distribution
        scenario = random.choices(
            list(scenario_distribution.keys()),
            weights=list(scenario_distribution.values())
        )[0]
        
        # Select season
        season = random.choices(seasons, weights=season_weights)[0]
        
        # Generate reading
        reading = generate_dehradun_sensor_reading(scenario, season)
        reading['sample_id'] = i + 1
        data.append(reading)
    
    return pd.DataFrame(data)

def run_auto_mode():
    """Generate dataset and save to file with timestamp."""
    print(f"\n--- Dehradun Flood Risk Data Generator ---")
    print(f"Location: {DEHRADUN_CONFIG['location']}")
    
    # Create output folder
    OUTPUT_FOLDER = 'generated_datasets'
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
        print(f"Created folder: '{OUTPUT_FOLDER}'")
    
    # Get user preferences
    print("\nSelect data generation type:")
    print("  (1) Time Series Data (hourly readings)")
    print("  (2) Batch Data (independent samples)")
    
    try:
        data_type = input("Enter choice (1 or 2): ").strip()
        
        if data_type == '1':
            hours = int(input("Enter number of hours (default 24): ") or "24")
            scenario = input("Scenario (normal/heavy_rain/flood) [default: normal]: ").strip() or "normal"
            season = input("Season (monsoon/winter/summer) [default: monsoon]: ").strip() or "monsoon"
            
            print(f"\nGenerating {hours} hours of {scenario} data for {season} season...")
            data = generate_time_series_data(hours, scenario, season)
            df = pd.DataFrame(data)
            
            # Reorder columns to match flood.csv
            column_order = ['timestamp', 'sensor_location'] + FLOOD_COLUMNS
            df = df[column_order]
            
            file_name = f"dehradun_timeseries_{scenario}_{season}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
        else:  # Batch data
            num_samples = int(input("Enter number of samples (default 1000): ") or "1000")
            
            print(f"\nGenerating {num_samples} diverse samples...")
            df = generate_batch_data(num_samples)
            
            # Reorder columns to match flood.csv exactly
            df = df[FLOOD_COLUMNS]
            
            file_name = f"dehradun_batch_{num_samples}samples_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        # Save file
        output_path = os.path.join(OUTPUT_FOLDER, file_name)
        df.to_csv(output_path, index=False)
        
        print(f"\n✅ Success! Dataset with {len(df)} rows saved to '{output_path}'")
        print(f"📊 Columns: {list(df.columns)}")
        print(f"📈 Flood probability range: {df['FloodProbability'].min():.3f} - {df['FloodProbability'].max():.3f}")
        
    except ValueError as e:
        print(f"❌ Invalid input: {e}")
    except KeyboardInterrupt:
        print("\n⏹️ Generation cancelled by user")

def run_manual_mode():
    """Manual sensor reading simulator."""
    print(f"\n--- Manual Dehradun Flood Risk Assessment ---")
    print(f"Location: {DEHRADUN_CONFIG['location']}")
    print("Press Ctrl+C to exit.\n")
    
    try:
        while True:
            print("Select scenario for reading:")
            print("  (1) Normal conditions")
            print("  (2) Heavy rain")
            print("  (3) Flood conditions")
            
            scenario_choice = input("Enter choice (1-3): ").strip()
            scenario_map = {'1': 'normal', '2': 'heavy_rain', '3': 'flood'}
            
            if scenario_choice not in scenario_map:
                print("❌ Invalid choice. Please enter 1, 2, or 3.")
                continue
            
            scenario = scenario_map[scenario_choice]
            season = input("Season (monsoon/winter/summer) [default: monsoon]: ").strip() or "monsoon"
            
            # Generate and display reading
            reading = generate_dehradun_sensor_reading(scenario, season)
            
            print(f"\n🌧️ Generated Sensor Reading for {scenario.title()} Conditions:")
            print("=" * 60)
            
            for column, value in reading.items():
                if column == 'FloodProbability':
                    risk_level = "🔴 HIGH" if value > 0.6 else "🟡 MEDIUM" if value > 0.4 else "🟢 LOW"
                    print(f"{column:35}: {value:.3f} ({risk_level})")
                else:
                    print(f"{column:35}: {value}")
            
            print("=" * 60)
            
            # Risk assessment
            prob = reading['FloodProbability']
            if prob > 0.7:
                print("🚨 CRITICAL: High flood risk detected!")
            elif prob > 0.5:
                print("⚠️ WARNING: Moderate flood risk")
            else:
                print("✅ NORMAL: Low flood risk")
            
            print("\n" + "-" * 40)
            
    except KeyboardInterrupt:
        print("\n⏹️ Exiting manual mode...")

def main():
    """Main function to select operation mode."""
    print("🌊 Dehradun Flood Risk Data Synthesizer")
    print("=" * 50)
    
    mode_choice = input(
        "Select mode:\n"
        "  (1) Automatic (Generate CSV dataset)\n"
        "  (2) Manual (Single sensor readings)\n"
        "Enter choice: "
    ).strip()
    
    if mode_choice == '1':
        run_auto_mode()
    elif mode_choice == '2':
        run_manual_mode()
    else:
        print("❌ Invalid choice. Please run the script again and select 1 or 2.")

if __name__ == "__main__":
    main()
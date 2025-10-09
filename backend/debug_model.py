#!/usr/bin/env python3
"""Debug the model to understand what it expects"""

import joblib
import numpy as np
import pandas as pd

# Load the model
print("Loading model...")
model_data = joblib.load('saved_models/best_model_latest.joblib')

print(f"Model type: {type(model_data)}")
print(f"Model keys: {list(model_data.keys())}")

model = model_data['model']
scaler = model_data['scaler']

print(f"\nActual model type: {type(model)}")
print(f"Scaler type: {type(scaler)}")

# Load original training data to see format
print("\nLoading original training data...")
flood_data = pd.read_csv('flood.csv')
print(f"Original data shape: {flood_data.shape}")
print(f"Original columns: {list(flood_data.columns)}")
print(f"Original data sample:")
print(flood_data.head(3))

# Test what the model expects
print(f"\nTesting model input format...")

# Get one row of original data (without FloodProbability)
test_row = flood_data.drop('FloodProbability', axis=1).iloc[0:1]
print(f"Test input shape: {test_row.shape}")
print(f"Test input values: {test_row.values}")

# Scale and predict
scaled_input = scaler.transform(test_row.values)
prediction = model.predict(scaled_input)
print(f"Model prediction: {prediction[0]:.4f}")
print(f"Original target: {flood_data.iloc[0]['FloodProbability']:.4f}")

# Test with "normal" scenario values
print(f"\nTesting with normal scenario values...")
normal_values = np.array([[
    3,  # MonsoonIntensity (2-8)
    7,  # TopographyDrainage (4-9) 
    5,  # RiverManagement (3-7)
    4,  # Deforestation (3-8)
    6,  # Urbanization (5-9)
    5,  # ClimateChange (4-8)
    6,  # DamsQuality (4-8)
    3,  # Siltation (2-6)
    4,  # AgriculturalPractices (3-7)
    4,  # Encroachments (3-7)
    5,  # IneffectiveDisasterPreparedness (4-8)
    6,  # DrainageSystems (3-8)
    2,  # CoastalVulnerability (1-3)
    5,  # Landslides (4-8)
    4,  # Watersheds (3-7)
    5,  # DeterioratingInfrastructure (4-8)
    6,  # PopulationScore (5-9)
    5,  # WetlandLoss (4-7)
    5,  # InadequatePlanning (4-8)
    4   # PoliticalFactors (3-7)
]])

print(f"Normal scenario input shape: {normal_values.shape}")
scaled_normal = scaler.transform(normal_values)
normal_prediction = model.predict(scaled_normal)
print(f"Normal scenario prediction: {normal_prediction[0]:.4f} ({normal_prediction[0]*100:.1f}%)")
#!/usr/bin/env python3
"""Debug the model feature generation"""

import joblib
import numpy as np
import pandas as pd

# Load the model
print("Loading model...")
model_data = joblib.load('saved_models/best_model_latest.joblib')

model = model_data['model']
scaler = model_data['scaler']
feature_generator = model_data['feature_generator']

print(f"\nFeature generator type: {type(feature_generator)}")
print(f"Feature generator: {feature_generator}")

# Test with normal scenario values
print(f"\nTesting CORRECT pipeline...")
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

print(f"Original input shape: {normal_values.shape}")

# Step 1: Generate polynomial features
poly_features = feature_generator.transform(normal_values)
print(f"After polynomial features: {poly_features.shape}")

# Step 2: Scale features  
scaled_features = scaler.transform(poly_features)
print(f"After scaling: {scaled_features.shape}")

# Step 3: Predict
prediction = model.predict(scaled_features)
print(f"Normal scenario prediction: {prediction[0]:.4f} ({prediction[0]*100:.1f}%)")

# Test multiple normal scenarios
print(f"\nTesting multiple normal scenarios...")
for i in range(5):
    test_normal = np.array([[
        np.random.randint(2, 8),   # MonsoonIntensity
        np.random.randint(4, 9),   # TopographyDrainage
        np.random.randint(3, 7),   # RiverManagement
        np.random.randint(3, 8),   # Deforestation
        np.random.randint(5, 9),   # Urbanization
        np.random.randint(4, 8),   # ClimateChange
        np.random.randint(4, 8),   # DamsQuality
        np.random.randint(2, 6),   # Siltation
        np.random.randint(3, 7),   # AgriculturalPractices
        np.random.randint(3, 7),   # Encroachments
        np.random.randint(4, 8),   # IneffectiveDisasterPreparedness
        np.random.randint(3, 8),   # DrainageSystems
        np.random.randint(1, 3),   # CoastalVulnerability
        np.random.randint(4, 8),   # Landslides
        np.random.randint(3, 7),   # Watersheds
        np.random.randint(4, 8),   # DeterioratingInfrastructure
        np.random.randint(5, 9),   # PopulationScore
        np.random.randint(4, 7),   # WetlandLoss
        np.random.randint(4, 8),   # InadequatePlanning
        np.random.randint(3, 7)    # PoliticalFactors
    ]])
    
    poly_test = feature_generator.transform(test_normal)
    scaled_test = scaler.transform(poly_test)
    pred_test = model.predict(scaled_test)
    
    print(f"Normal test {i+1}: {pred_test[0]:.4f} ({pred_test[0]*100:.1f}%)")
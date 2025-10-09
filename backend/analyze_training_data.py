#!/usr/bin/env python3
"""Analyze training data to understand proper ranges for scenarios"""

import pandas as pd
import numpy as np

# Load training data
flood_data = pd.read_csv('flood.csv')

print("=== TRAINING DATA ANALYSIS ===")
print(f"Total samples: {len(flood_data)}")
print(f"FloodProbability range: {flood_data['FloodProbability'].min():.3f} - {flood_data['FloodProbability'].max():.3f}")

# Analyze by flood probability ranges
low_risk = flood_data[flood_data['FloodProbability'] < 0.5]
mild_risk = flood_data[(flood_data['FloodProbability'] >= 0.5) & (flood_data['FloodProbability'] < 0.6)]
high_risk = flood_data[flood_data['FloodProbability'] >= 0.6]

print(f"\nLOW RISK samples (< 0.5): {len(low_risk)} ({len(low_risk)/len(flood_data)*100:.1f}%)")
print(f"MILD RISK samples (0.5-0.6): {len(mild_risk)} ({len(mild_risk)/len(flood_data)*100:.1f}%)")
print(f"HIGH RISK samples (>= 0.6): {len(high_risk)} ({len(high_risk)/len(flood_data)*100:.1f}%)")

print(f"\n=== LOW RISK FEATURE RANGES (should be NORMAL scenario) ===")
for col in flood_data.columns:
    if col != 'FloodProbability':
        min_val = low_risk[col].min()
        max_val = low_risk[col].max()
        mean_val = low_risk[col].mean()
        print(f"{col}: {min_val}-{max_val} (avg: {mean_val:.1f})")

print(f"\n=== HIGH RISK FEATURE RANGES (should be FLOOD scenario) ===")
for col in flood_data.columns:
    if col != 'FloodProbability':
        min_val = high_risk[col].min()
        max_val = high_risk[col].max()
        mean_val = high_risk[col].mean()
        print(f"{col}: {min_val}-{max_val} (avg: {mean_val:.1f})")
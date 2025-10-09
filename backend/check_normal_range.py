import pandas as pd

# Load training data
df = pd.read_csv('flood.csv')

# Filter for normal-like conditions (similar to our normal scenario)
normal_data = df[
    (df['MonsoonIntensity'] <= 8) & 
    (df['Urbanization'] <= 9) & 
    (df['DrainageSystems'] >= 3) &
    (df['Deforestation'] <= 8)
]

print(f"Normal-like data (n={len(normal_data)}):")
print(f"Flood risk range: {normal_data['FloodProbability'].min():.3f} - {normal_data['FloodProbability'].max():.3f}")
print(f"Average flood risk: {normal_data['FloodProbability'].mean():.3f}")

# Check very low risk conditions
very_low = df[
    (df['MonsoonIntensity'] <= 4) & 
    (df['Urbanization'] <= 6) & 
    (df['DrainageSystems'] >= 6) &
    (df['Deforestation'] <= 5)
]

print(f"\nVery low risk data (n={len(very_low)}):")
if len(very_low) > 0:
    print(f"Flood risk range: {very_low['FloodProbability'].min():.3f} - {very_low['FloodProbability'].max():.3f}")
    print(f"Average flood risk: {very_low['FloodProbability'].mean():.3f}")
else:
    print("No very low risk samples found")
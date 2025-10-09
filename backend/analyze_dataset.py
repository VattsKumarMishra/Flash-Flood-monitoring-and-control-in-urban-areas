import pandas as pd
import numpy as np

# Load the dataset
df = pd.read_csv('flood.csv')

print("Dataset Overview:")
print("================")
print(f"Total rows: {len(df)}")
print(f"Total columns: {len(df.columns)}")
print(f"Dataset shape: {df.shape}")

print("\nColumn Names:")
print("=============")
for i, col in enumerate(df.columns):
    print(f"{i+1:2d}. {col}")

print("\nDataset Info:")
print("=============")
print(df.info())

print("\nFirst 5 rows:")
print("=============")
print(df.head())

print("\nLast 5 rows:")
print("=============")
print(df.tail())

print("\nStatistical Summary:")
print("===================")
print(df.describe())

print("\nFloodProbability Distribution:")
print("=============================")
print(f"Min FloodProbability: {df['FloodProbability'].min()}")
print(f"Max FloodProbability: {df['FloodProbability'].max()}")
print(f"Mean FloodProbability: {df['FloodProbability'].mean():.3f}")
print(f"Std FloodProbability: {df['FloodProbability'].std():.3f}")

# Check for missing values
print("\nMissing Values:")
print("===============")
print(df.isnull().sum())

# Check data types
print("\nData Types:")
print("===========")
print(df.dtypes)

# Check if there are any time-based columns
print("\nSample of actual values:")
print("=======================")
print(df.iloc[0:3].to_string())
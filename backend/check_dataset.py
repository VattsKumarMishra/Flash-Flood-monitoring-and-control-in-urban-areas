import pandas as pd

# Check original dataset
df = pd.read_csv('flood.csv')
print('Original dataset features:')
print(f'Total columns: {len(df.columns)}')
print('Column names:')
for i, col in enumerate(df.columns):
    print(f'{i+1:2d}. {col}')

print('\nDataset shape:', df.shape)
print('First few rows:')
print(df.head())
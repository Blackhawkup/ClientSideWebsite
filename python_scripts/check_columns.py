import pandas as pd

excel_path = '../public/data/data.xlsx'
df = pd.read_excel(excel_path, sheet_name='Sheet5', header=None)

print('Columns M to S (12 to 18):')
for i in range(12, 19):
    col_name = chr(65 + i)
    print(f'Column {col_name} (index {i}): {df.iloc[0, i] if i < df.shape[1] else "N/A"}')

print('\nFirst few rows of data in columns M-S:')
print(df.iloc[:5, 12:19].to_string())


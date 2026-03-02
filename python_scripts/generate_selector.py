import pandas as pd
import json
import os

# Paths relative to this script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
excel_path = os.path.join(BASE_DIR, "public", "data", "data.xlsx")
json_path = os.path.join(BASE_DIR, "public", "data", "selector.json")

# Do not drop rows; ensure we don't miss any names/categories

# Load selector sheet
selectors = pd.read_excel(excel_path, sheet_name="selector")
selectors = selectors.where(pd.notnull(selectors), None)  # NaN → None

# Build nested dictionary
nested_dict = {}
current_N1 = current_N2 = None
for _, row in selectors.iterrows():
    N1 = row.get("N1", None) if isinstance(row, dict) else (row["N1"] if "N1" in row else None)
    N2 = row.get("N2", None) if isinstance(row, dict) else (row["N2"] if "N2" in row else None)
    N3 = row.get("N3", None) if isinstance(row, dict) else (row["N3"] if "N3" in row else None)
    if N1:
        current_N1 = N1
        nested_dict[current_N1] = {}
    if N2:
        current_N2 = N2
        if current_N1:
            nested_dict[current_N1][current_N2] = []
    if N3:
        if current_N1 and current_N2:
            nested_dict[current_N1][current_N2].append(N3)

# Ensure folder exists
os.makedirs(os.path.dirname(json_path), exist_ok=True)

# Save JSON
with open(json_path, "w") as f:
    json.dump(nested_dict, f, indent=2)

print(f"Selector JSON saved at {json_path}")

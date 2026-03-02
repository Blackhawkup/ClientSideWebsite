#!/usr/bin/env python3
"""
Extract Sheet5 data from data.xlsx and convert to JSON format for the frontend.
"""

import pandas as pd
import json
import os
from typing import Dict, List, Any

def extract_sheet5_data(xlsx_path: str) -> List[Dict[str, Any]]:
    """
    Extract data from Sheet5 of the Excel file.
    Returns list of dictionaries with name and returns data.
    """
    try:
        # Read Sheet5
        df = pd.read_excel(xlsx_path, sheet_name='Sheet5', header=None)
        
        # Column mapping: M=12 (CY 2025), N=13 (2024), O=14 (2023), etc.
        year_columns = {
            'CY 2025': 12,  # M
            '2024': 13,     # N  
            '2023': 14,     # O
            '2022': 15,     # P
            '2021': 16,     # Q
            '2020': 17,     # R
            '2019': 18      # S
        }
        
        # Monthly columns: E=4 (1 month), F=5 (3 months), G=6 (6 months), H=7 (1 Year), I=8 (3 Year), J=9 (5 Year), K=10 (10 Year)
        monthly_columns = {
            '1 month': 4,    # E
            '3 months': 5,   # F
            '6 months': 6,   # G
            '1 Year': 7,     # H
            '3 Year': 8,     # I
            '5 Year': 9,     # J
            '10 Year': 10    # K
        }
        
        result = []
        
        # Process each row (skip header row)
        for idx, row in df.iterrows():
            if idx == 0:  # Skip header row
                continue
                
            name = row.iloc[0]  # Column A (Name)
            
            # Skip if name is NaN or empty
            if pd.isna(name) or str(name).strip() == '':
                break
                
            name = str(name).strip()
            
            # Extract returns for each year
            yearly_returns = {}
            for year, col_idx in year_columns.items():
                value = row.iloc[col_idx]
                if pd.notna(value) and isinstance(value, (int, float)):
                    yearly_returns[year] = float(value)
                else:
                    yearly_returns[year] = 0.0
            
            # Extract monthly returns
            monthly_returns = {}
            for period, col_idx in monthly_columns.items():
                value = row.iloc[col_idx]
                if pd.notna(value) and isinstance(value, (int, float)):
                    monthly_returns[period] = float(value)
                else:
                    monthly_returns[period] = 0.0
            
            result.append({
                'name': name,
                'yearly_returns': yearly_returns,
                'monthly_returns': monthly_returns
            })
        
        return result
        
    except Exception as e:
        print(f"Error reading Sheet5: {e}")
        return []

def save_json(data: List[Dict[str, Any]], out_path: str) -> None:
    """Save data as JSON file."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved {len(data)} items to {out_path}")

def main():
    xlsx_path = '../public/data/data.xlsx'
    out_path = '../public/data/sheet5_data.json'
    
    print("Extracting Sheet5 data...")
    data = extract_sheet5_data(xlsx_path)
    
    if data:
        save_json(data, out_path)
        print(f"Successfully processed {len(data)} items")
        
        # Print sample data
        if data:
            print("\nSample data:")
            print(f"Name: {data[0]['name']}")
            print(f"Yearly Returns: {data[0]['yearly_returns']}")
            print(f"Monthly Returns: {data[0]['monthly_returns']}")
    else:
        print("No data found in Sheet5")

if __name__ == "__main__":
    main()

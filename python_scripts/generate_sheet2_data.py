#!/usr/bin/env python3
"""
Extract sheet_2 data from data.xlsx and convert to JSON format for the frontend.
"""

import pandas as pd
import json
import os
from typing import Dict, List, Any

def extract_sheet2_data(xlsx_path: str) -> Dict[str, Any]:
    """
    Extract data from sheet_2 of the Excel file.
    Returns dictionary with fund holdings and sector data.
    """
    try:
        # Read sheet_2
        df = pd.read_excel(xlsx_path, sheet_name='sheet_2', header=None)
        
        # Skip header row
        df = df.iloc[1:]
        
        # Column mapping
        # A=0: ISIN, B=1: Scheme Name, C=2: Company Name, D=3: Holding (%), E=4: Portfolio Weight Stock, F=5: Sector, G=6: Portfolio Weight Sector
        # N=13: Fund Name (Hybrid), O=14: Company Name (Hybrid), P=15: Holding % (Hybrid), R=17: Sector Name (Hybrid)
        
        fund_holdings = {}  # {fund_name: {company_name: holding_percent}}
        sector_holdings = {}  # {fund_name: {sector: portfolio_weight}}
        company_sectors = {}  # {fund_name: {company_name: sector}}
        
        # Hybrid data
        hybrid_fund_holdings = {}  # {fund_name: {company_name: holding_percent}}
        hybrid_sector_holdings = {}  # {fund_name: {sector: portfolio_weight}}
        hybrid_company_sectors = {}  # {fund_name: {company_name: sector}}
        
        for _, row in df.iterrows():
            # Process equity data (columns B, C, D, F, G)
            if pd.notna(row.iloc[1]) and pd.notna(row.iloc[2]):  # Fund name and company name exist
                fund_name = str(row.iloc[1]).strip()
                company_name = str(row.iloc[2]).strip()
                holding_percent = row.iloc[3] if pd.notna(row.iloc[3]) else 0
                sector = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else ''
                sector_weight = row.iloc[6] if pd.notna(row.iloc[6]) else 0
                
                # Add to fund holdings
                if fund_name not in fund_holdings:
                    fund_holdings[fund_name] = {}
                fund_holdings[fund_name][company_name] = float(holding_percent)
                
                # Add to sector holdings
                if fund_name not in sector_holdings:
                    sector_holdings[fund_name] = {}
                if sector and sector != 'nan':
                    sector_holdings[fund_name][sector] = float(sector_weight)
                
                # Add to company-sector mapping
                if fund_name not in company_sectors:
                    company_sectors[fund_name] = {}
                if sector and sector != 'nan':
                    company_sectors[fund_name][company_name] = sector
            
            # Process hybrid data (columns N, O, P, R)
            if pd.notna(row.iloc[13]) and pd.notna(row.iloc[14]):  # Hybrid fund name and company name exist
                hybrid_fund_name = str(row.iloc[13]).strip()
                hybrid_company_name = str(row.iloc[14]).strip()
                hybrid_holding_percent = row.iloc[15] if pd.notna(row.iloc[15]) else 0
                hybrid_sector = str(row.iloc[17]).strip() if pd.notna(row.iloc[17]) else ''
                
                # Add to hybrid fund holdings
                if hybrid_fund_name not in hybrid_fund_holdings:
                    hybrid_fund_holdings[hybrid_fund_name] = {}
                hybrid_fund_holdings[hybrid_fund_name][hybrid_company_name] = float(hybrid_holding_percent)
                
                # Add to hybrid sector holdings (calculate weight from holdings)
                if hybrid_fund_name not in hybrid_sector_holdings:
                    hybrid_sector_holdings[hybrid_fund_name] = {}
                if hybrid_sector and hybrid_sector != 'nan':
                    if hybrid_sector not in hybrid_sector_holdings[hybrid_fund_name]:
                        hybrid_sector_holdings[hybrid_fund_name][hybrid_sector] = 0
                    hybrid_sector_holdings[hybrid_fund_name][hybrid_sector] += float(hybrid_holding_percent)
                
                # Add to hybrid company-sector mapping
                if hybrid_fund_name not in hybrid_company_sectors:
                    hybrid_company_sectors[hybrid_fund_name] = {}
                if hybrid_sector and hybrid_sector != 'nan':
                    hybrid_company_sectors[hybrid_fund_name][hybrid_company_name] = hybrid_sector
        
        return {
            'fund_holdings': fund_holdings,
            'sector_holdings': sector_holdings,
            'company_sectors': company_sectors,
            'hybrid_fund_holdings': hybrid_fund_holdings,
            'hybrid_sector_holdings': hybrid_sector_holdings,
            'hybrid_company_sectors': hybrid_company_sectors
        }
        
    except Exception as e:
        print(f"Error reading sheet_2: {e}")
        return {'fund_holdings': {}, 'sector_holdings': {}}

def save_json(data: Dict[str, Any], out_path: str) -> None:
    """Save data as JSON file."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved sheet_2 data to {out_path}")

def main():
    xlsx_path = '../public/data/data.xlsx'
    out_path = '../public/data/sheet2_data.json'
    
    print("Extracting sheet_2 data...")
    data = extract_sheet2_data(xlsx_path)
    
    if data['fund_holdings']:
        save_json(data, out_path)
        print(f"Successfully processed {len(data['fund_holdings'])} equity funds")
        print(f"Successfully processed {len(data['hybrid_fund_holdings'])} hybrid funds")
        
        # Print sample data
        if data['fund_holdings']:
            first_fund = list(data['fund_holdings'].keys())[0]
            print(f"\nSample equity fund: {first_fund}")
            print(f"Companies: {len(data['fund_holdings'][first_fund])}")
            print(f"Sectors: {len(data['sector_holdings'].get(first_fund, {}))}")
        
        if data['hybrid_fund_holdings']:
            first_hybrid_fund = list(data['hybrid_fund_holdings'].keys())[0]
            print(f"\nSample hybrid fund: {first_hybrid_fund}")
            print(f"Companies: {len(data['hybrid_fund_holdings'][first_hybrid_fund])}")
            print(f"Sectors: {len(data['hybrid_sector_holdings'].get(first_hybrid_fund, {}))}")
    else:
        print("No data found in sheet_2")

if __name__ == "__main__":
    main()

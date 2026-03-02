import pandas as pd
import json
import os
from typing import Dict, List, Any, Optional

def get_paths() -> Dict[str, str]:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    excel_path = os.path.join(base_dir, "public", "data", "data.xlsx")
    out_json_path = os.path.join(base_dir, "public", "data", "source_data.json")
    return {"excel": excel_path, "json": out_json_path}

def normalize_name(name: Any) -> str:
    if name is None:
        return ""
    return str(name).strip()

def is_valid_fund_name(name: str) -> bool:
    """Check if the name looks like a valid fund name (not a category or invalid data)"""
    if not name or name.lower() in {"nan", "name", "fund", "fund name", "scheme name"}:
        return False
    # Check if it's a category name (contains common category keywords)
    category_keywords = ["funds", "equity", "debt", "hybrid", "liquid", "gilt", "corporate", "government", "balanced", "growth", "value", "large", "mid", "small", "cap"]
    name_lower = name.lower()
    if any(keyword in name_lower for keyword in category_keywords) and len(name.split()) <= 3:
        return False
    return True

def read_source_data_sheet(xlsx_path: str) -> pd.DataFrame:
    """
    Reads the sheet named "source_data" and returns a dataframe.
    Assumptions:
    - Column T (index 19) contains the fund names
    - Row 1 contains column headers
    - Data starts from row 2
    - Data columns are U to AB (0-based indices 20-27)
    - Stop at first blank row
    """
    df = pd.read_excel(
        xlsx_path,
        sheet_name="source_data",
        header=0,  # Use row 1 as headers
        engine=None,
    )
    
    # Ensure we have enough columns to cover AB (0-based index 27)
    if df.shape[1] <= 27:
        raise ValueError(
            "Expected at least 28 columns in 'source_data' to cover AB (0-based index 27)."
        )
    
    return df

def build_source_data_map(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """
    Extracts fund data from source_data sheet.
    Returns mapping: { fund_name: { column_name: value, ... } }
    """
    source_map: Dict[str, Dict[str, Any]] = {}
    
    # Column T (index 19) contains fund names
    name_col = 19  # T
    
    # Only include the specific columns requested: U to AB (indices 20-27)
    # Largecap, Midcap, Small Cap, Others/Cash, Sharpe Ratio, Beta, P/E, P/B
    data_cols = [20, 21, 22, 23, 24, 25, 26, 27]  # U to AB inclusive
    
    # Get column headers from row 1
    headers = df.columns.tolist()
    
    # Define which columns should be converted to percentages
    percentage_columns = ["Largecap", "Midcap", "Small Cap ", "Others/Cash"]
    
    for _, row in df.iterrows():
        name = normalize_name(row.iloc[name_col] if len(row) > name_col else None)
        
        # Stop at first blank fund name
        if not name:
            break
            
        if not is_valid_fund_name(name):
            continue
            
        # Extract data for this fund
        fund_data: Dict[str, Any] = {}
        for col_idx in data_cols:
            if col_idx < len(headers):
                header = headers[col_idx]
                value = row.iloc[col_idx] if len(row) > col_idx else None
                
                # Convert to appropriate type
                if pd.isna(value) or str(value).strip() in {"-", ""}:
                    fund_data[header] = None
                else:
                    try:
                        # Try to convert to number if possible
                        if isinstance(value, (int, float)):
                            num_value = value
                        else:
                            str_val = str(value).strip()
                            if str_val.replace('.', '').replace('-', '').isdigit():
                                num_value = float(str_val)
                            else:
                                fund_data[header] = str_val
                                continue
                        
                        # Convert first 4 columns to percentages (multiply by 100)
                        if header in percentage_columns:
                            fund_data[header] = num_value * 100.0
                        else:
                            fund_data[header] = num_value
                            
                    except Exception:
                        fund_data[header] = str(value)
        
        # Only add if we have some data
        if any(v is not None for v in fund_data.values()):
            source_map[name] = fund_data
    
    return source_map

def save_json(data: Dict[str, Dict[str, Any]], out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main() -> None:
    paths = get_paths()
    excel_path = paths["excel"]
    out_json = paths["json"]

    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel not found at {excel_path}")

    df = read_source_data_sheet(excel_path)
    source_map = build_source_data_map(df)
    save_json(source_map, out_json)
    print(f"Source data JSON saved at {out_json} ({len(source_map)} funds)")

if __name__ == "__main__":
    main()

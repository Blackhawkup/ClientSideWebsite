import os
import json
from typing import Dict, List, Any, Optional, Set

import pandas as pd


def get_paths() -> Dict[str, str]:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    excel_path = os.path.join(base_dir, "public", "data", "data.xlsx")
    out_json_path = os.path.join(base_dir, "public", "data", "performance.json")
    out_yearly_json_path = os.path.join(base_dir, "public", "data", "performance_yearly.json")
    return {"excel": excel_path, "json": out_json_path, "json_yearly": out_yearly_json_path}


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


def read_performance_sheet(xlsx_path: str) -> pd.DataFrame:
    """
    Reads the sheet named "performace_data" (as provided) and returns a dataframe.
    Assumptions per request:
    - Column 2 (index 1) contains the fund names
    - Columns F-L (inclusive) contain the returns in order:
      1m, 3m, 6m, 1y, 3y, 5y, 10y
    """
    # We read without relying on headers to be safe; we will use column positions
    df = pd.read_excel(
        xlsx_path,
        sheet_name="performace_data",
        header=None,
        engine=None,  # let pandas choose
    )

    # Ensure the dataframe has enough columns to cover BM (0-based index 64)
    if df.shape[1] <= 64:
        raise ValueError(
            "Expected at least 65 columns in 'performace_data' to cover BM (0-based index 64)."
        )
    return df


def _extract_name_and_values(row: pd.Series, name_col: int, value_cols: List[int]) -> Optional[tuple[str, List[Optional[float]]]]:
    name = normalize_name(row.iloc[name_col] if len(row) > name_col else None)
    if not name or not is_valid_fund_name(name):
        return None

    values: List[Optional[float]] = []
    for c in value_cols:
        raw = row.iloc[c] if len(row) > c else None
        if pd.isna(raw) or str(raw).strip() in {"-", ""}:
            values.append(None)
        else:
            try:
                s = str(raw).replace(",", "").strip()
                if s.endswith('%'):
                    num = float(s[:-1])  # already percent value like 12.3%
                else:
                    num = float(s)
                    # If the value appears to be a fraction (e.g., 0.1234), scale to percent
                    if abs(num) <= 1.5:
                        num = num * 100.0
                # Guard against absurd values: if > 1e6 treat as invalid
                if not pd.isna(num) and abs(num) > 1e6:
                    num = None
            except Exception:
                num = None
            values.append(num)

    if not any(v is not None for v in values):
        return None
    return name, values


def build_performance_map(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    """
    Iterates rows, reads name from column 1 (0-based) and returns from cols 5-11 (F-L, 0-based).
    Produces a mapping: { fund_name: {"1m": ..., "3m": ..., ... "10y": ...} }
    """
    perf_map: Dict[str, Dict[str, float]] = {}
    keys = ["1m", "3m", "6m", "1y", "3y", "5y", "10y"]
    # Column sets to extract independently and merge
    # Set 1: B with F–L, Set 2: AS with AX–BD
    name_col_B = 1            # B
    vals_cols_FL = list(range(5, 12))   # F-L inclusive (0-based)
    name_col_AS = 44          # AS
    vals_cols_AXBD = list(range(49, 56))  # AX-BD inclusive (0-based)

    for _, row in df.iterrows():
        # Extract both sets independently
        entry_B = _extract_name_and_values(row, name_col_B, vals_cols_FL)
        entry_AS = _extract_name_and_values(row, name_col_AS, vals_cols_AXBD)

        def upsert(name: str, values: List[Optional[float]]):
            nonlocal perf_map
            existing = perf_map.get(name)
            mapped = {k: (v if v is not None else None) for k, v in zip(keys, values)}
            if existing is None:
                perf_map[name] = mapped  # type: ignore[assignment]
            else:
                # Merge: prefer existing non-null, else take new
                merged: Dict[str, Optional[float]] = {}
                for k in keys:
                    merged[k] = existing.get(k) if existing.get(k) is not None else mapped.get(k)  # type: ignore[assignment]
                perf_map[name] = merged  # type: ignore[assignment]

        if entry_B is not None:
            upsert(entry_B[0], entry_B[1])
        if entry_AS is not None:
            upsert(entry_AS[0], entry_AS[1])

    return perf_map


def build_yearly_returns_map(df: pd.DataFrame) -> Dict[str, List[Optional[float]]]:
    """
    Extracts year-wise returns for the last 8 years from two blocks while preserving prior logic:
    - Names in column B with returns in N–U (0-based 13–20)
    - Names in column AS with returns in BF–BM (0-based 57–64)

    Returns mapping: { fund_name: [v1, v2, ..., v8] }
    """
    yearly_map: Dict[str, List[Optional[float]]] = {}

    name_col_B = 1             # B
    vals_cols_NU = list(range(13, 21))   # N-U inclusive (0-based)
    name_col_AS = 44           # AS
    vals_cols_BFBM = list(range(57, 65))  # BF-BM inclusive (0-based)

    def upsert(name: str, values: List[Optional[float]]):
        existing = yearly_map.get(name)
        if existing is None:
            yearly_map[name] = values
        else:
            # Merge: prefer existing non-null else take new
            merged: List[Optional[float]] = []
            for i in range(max(len(existing), len(values))):
                ev = existing[i] if i < len(existing) else None
                nv = values[i] if i < len(values) else None
                merged.append(ev if ev is not None else nv)
            yearly_map[name] = merged[:8]

    for _, row in df.iterrows():
        entry_B = _extract_name_and_values(row, name_col_B, vals_cols_NU)
        entry_AS = _extract_name_and_values(row, name_col_AS, vals_cols_BFBM)

        if entry_B is not None:
            upsert(entry_B[0], entry_B[1])
        if entry_AS is not None:
            upsert(entry_AS[0], entry_AS[1])

    # Ensure exactly 8 entries per fund (pad/truncate)
    for k, v in list(yearly_map.items()):
        if len(v) < 8:
            yearly_map[k] = v + [None] * (8 - len(v))
        elif len(v) > 8:
            yearly_map[k] = v[:8]

    return yearly_map


def save_json(data: Dict[str, Dict[str, float]], out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_selector_fund_names(selector_json_path: str) -> Set[str]:
    if not os.path.exists(selector_json_path):
        return set()
    try:
        with open(selector_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return set()

    names: Set[str] = set()
    # selector.json structure: { category: { subcategory: [names...] } }
    if isinstance(data, dict):
        for _, sub in data.items():
            if isinstance(sub, dict):
                for _, arr in sub.items():
                    if isinstance(arr, list):
                        for n in arr:
                            names.add(str(n))
    return names


def main() -> None:
    paths = get_paths()
    excel_path = paths["excel"]
    out_json = paths["json"]
    out_yearly_json = paths["json_yearly"]

    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel not found at {excel_path}")

    df = read_performance_sheet(excel_path)
    # Build performance map and yearly returns map for all rows (no selector filtering)
    perf_map = build_performance_map(df)
    yearly_map = build_yearly_returns_map(df)
    save_json(perf_map, out_json)
    save_json(yearly_map, out_yearly_json)
    print(f"Performance JSON saved at {out_json} ({len(perf_map)} funds)")
    print(f"Yearly performance JSON saved at {out_yearly_json} ({len(yearly_map)} funds)")


if __name__ == "__main__":
    main()



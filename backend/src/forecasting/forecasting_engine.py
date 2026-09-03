"""
AI Forecasting Engine - Sprint 4 (FAI-001 through FAI-012)
BDOEA Financial Management System

This module uses Pandas DataFrames to process validated financial fund data,
enforce strict validation rules, and compute predictive time-series forecasts
for Union Fund (UNF), General Fund (GEN), Death Assistance Fund (DAF),
Foreign Assistance Fund (FAF), Loan Fund (LNF), and any dynamically configured fund (FAI-009).
"""

import sys
import json
import argparse
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import pandas as pd


MIN_REQUIRED_PERIODS = 3  # Minimum number of valid monthly periods required for forecasting

TASK_MAPPINGS = {
    "UNF": {"code": "UNF", "name": "Union Fund", "task_id": "FAI-004"},
    "GEN": {"code": "GEN", "name": "General Fund", "task_id": "FAI-005"},
    "DAF": {"code": "DAF", "name": "Death Assistance Fund", "task_id": "FAI-006"},
    "FAF": {"code": "FAF", "name": "Foreign Assistance Fund", "task_id": "FAI-007"},
    "LNF": {"code": "LNF", "name": "Loan Fund", "task_id": "FAI-008"},
}


class ForecastingValidationError(Exception):
    """Exception raised when forecasting input validation fails (FAI-003)."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


# =====================================================================
# FAI-001: Retrieve validated and historical fund data
# Rule: Retrieve only validated fund balances and posted financial transactions
# Input: Validated fund data | Output: Historical fund dataset (Pandas DataFrame)
# =====================================================================
def load_historical_dataset(raw_input: Dict[str, Any]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    FAI-001: Ingests validated fund data and posted transactions from Fund Management Module.
    Returns:
        (funds_df, transactions_df) as Pandas DataFrames.
    """
    funds = raw_input.get("validatedFunds", [])
    raw_transactions = raw_input.get("rawValidatedTransactions", [])

    if not funds:
        raise ForecastingValidationError("FAI-001: No validated fund data provided in input.")

    # Funds DataFrame
    funds_records = []
    for f in funds:
        funds_records.append({
            "fund_id": f.get("id"),
            "fund_name": f.get("name"),
            "fund_code": str(f.get("code", "")).upper(),
            "validated_balance": float(f.get("validatedBalance", 0.0)),
            "target_utilization": float(f.get("targetUtilization", 80.0)),
            "current_utilization": float(f.get("currentUtilization", 0.0)),
            "status": f.get("status", "Active"),
        })
    funds_df = pd.DataFrame(funds_records)

    # Transactions DataFrame
    tx_records = []
    for tx in raw_transactions:
        # FAI-001 Rule: ONLY 'Posted' transactions are accepted
        status = str(tx.get("status", "")).strip().capitalize()
        if status != "Posted":
            continue

        tx_records.append({
            "ref": tx.get("ref"),
            "fund_code": str(tx.get("fundCode", "")).upper(),
            "fund_name": tx.get("fundName"),
            "amount": float(tx.get("amount", 0.0)) if tx.get("amount") is not None else np.nan,
            "type": tx.get("type", ""),
            "date": str(tx.get("date", "")).strip(),
            "status": status,
        })

    transactions_df = pd.DataFrame(tx_records)
    return funds_df, transactions_df


# =====================================================================
# FAI-002: Prepare historical fund data
# Rule: Organize historical records by fund and transaction period before forecasting
# Input: Historical fund dataset | Output: Forecasting dataset (Pandas DataFrame)
# =====================================================================
def prepare_forecasting_dataset(transactions_df: pd.DataFrame) -> pd.DataFrame:
    """
    FAI-002: Organizes historical records by fund and transaction period (YYYY-MM).
    Computes monthly inflows, outflows, and net cashflow per fund.
    """
    if transactions_df.empty:
        return pd.DataFrame(columns=["fund_code", "period", "inflows", "outflows", "net_flow", "tx_count"])

    df = transactions_df.copy()

    # Convert date to datetime and create 'period' column (YYYY-MM)
    df["datetime"] = pd.to_datetime(df["date"], errors="coerce")
    df["period"] = df["datetime"].dt.strftime("%Y-%m")

    # Categorize flows based on transaction type
    type_str = df["type"].astype(str).str.lower()
    is_inflow = type_str.str.contains("inflow|collection|opening|transfer in|increase", regex=True)
    is_outflow = type_str.str.contains("outflow|disbursement|transfer out|decrease", regex=True)

    df["inflow_amount"] = np.where(is_inflow, df["amount"], 0.0)
    df["outflow_amount"] = np.where(is_outflow, df["amount"], 0.0)

    # Group by fund_code and period
    grouped = df.groupby(["fund_code", "period"], as_index=False).agg(
        inflows=("inflow_amount", "sum"),
        outflows=("outflow_amount", "sum"),
        tx_count=("amount", "count")
    )

    grouped["net_flow"] = grouped["inflows"] - grouped["outflows"]
    grouped = grouped.sort_values(by=["fund_code", "period"]).reset_index(drop=True)
    return grouped


# =====================================================================
# FAI-003: Validate forecasting inputs
# Rule: Reject forecasting inputs with missing fund references, invalid amounts,
#       or incomplete required periods.
# Input: Forecasting dataset | Output: Validated forecasting input
# =====================================================================
def validate_forecasting_input(
    prepared_df: pd.DataFrame,
    fund_code: str,
    raw_tx_df: Optional[pd.DataFrame] = None,
    min_periods: int = MIN_REQUIRED_PERIODS
) -> pd.DataFrame:
    """
    FAI-003: Strict validation of forecasting dataset before executing models:
      1. Missing fund references
      2. Invalid or non-positive amounts (null, NaN, <= 0)
      3. Incomplete required periods (fewer than min_periods)
    """
    fund_code = fund_code.strip().upper()

    # 1. Missing fund reference check
    if not fund_code:
        raise ForecastingValidationError(
            "FAI-003: Missing fund reference. A valid fund code must be specified."
        )

    # Check raw transactions for fund if provided
    if raw_tx_df is not None and not raw_tx_df.empty:
        # Check for empty/missing fund_code in raw transactions
        fund_tx = raw_tx_df[raw_tx_df["fund_code"] == fund_code]
        if fund_tx.empty:
            raise ForecastingValidationError(
                f"FAI-003: No historical transaction records found for fund reference '{fund_code}'."
            )

        # 2. Invalid amounts check (NaN or <= 0)
        invalid_amounts = fund_tx[fund_tx["amount"].isna() | (fund_tx["amount"] <= 0)]
        if not invalid_amounts.empty:
            raise ForecastingValidationError(
                f"FAI-003: Invalid amounts detected in fund '{fund_code}'. Found {len(invalid_amounts)} record(s) "
                f"with missing, NaN, zero, or negative amounts."
            )

    # Filter prepared periods for the fund
    fund_periods = prepared_df[prepared_df["fund_code"] == fund_code].copy()

    # 3. Incomplete required periods check
    num_periods = len(fund_periods)
    if num_periods < min_periods:
        raise ForecastingValidationError(
            f"FAI-003: Incomplete required periods for fund '{fund_code}'. Required minimum: {min_periods} "
            f"distinct periods, but only {num_periods} period(s) found.",
            details={"fund_code": fund_code, "available_periods": num_periods, "min_required": min_periods}
        )

    return fund_periods.sort_values(by="period").reset_index(drop=True)


# =====================================================================
# Forecasting Core Algorithm & Period Control (FAI-010)
# =====================================================================
def _calculate_forecast_projection(
    fund_id: str,
    fund_code: str,
    fund_name: str,
    baseline_balance: float,
    period_df: pd.DataFrame,
    horizon_months: int = 4,
    target_periods: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Applies Pandas/NumPy time-series linear trendline forecasting.
    FAI-010: Generates forecast values strictly for the selected valid forecast period(s).
    """
    df = period_df.copy().sort_values("period").reset_index(drop=True)
    df["cumulative_net"] = df["net_flow"].cumsum()

    # Starting baseline so that the final historical period reaches baseline_balance
    start_balance = baseline_balance - df["cumulative_net"].iloc[-1]
    df["running_balance"] = start_balance + df["cumulative_net"]

    # Fit linear regression using numpy on historical period indices
    x = np.arange(len(df))
    y_balance = df["running_balance"].values
    y_inflow = df["inflows"].values
    y_outflow = df["outflows"].values

    slope_bal, intercept_bal = np.polyfit(x, y_balance, 1)
    avg_inflow = float(np.mean(y_inflow))
    avg_outflow = float(np.mean(y_outflow))

    # Identify trend direction
    if abs(slope_bal) < (baseline_balance * 0.005):
        trend_direction = "STABLE"
    elif slope_bal > 0:
        trend_direction = "UPWARD"
    else:
        trend_direction = "DOWNWARD"

    # Historical series for charting
    chart_series = []
    for _, row in df.iterrows():
        chart_series.append({
            "period": row["period"],
            "historicalBalance": round(float(row["running_balance"]), 2),
            "forecastBalance": None,
            "inflows": round(float(row["inflows"]), 2),
            "outflows": round(float(row["outflows"]), 2),
            "netFlow": round(float(row["net_flow"]), 2),
            "isProjected": False,
        })

    # FAI-010: Determine selected valid forecast periods
    last_period_str = df["period"].iloc[-1]
    last_date = pd.to_datetime(last_period_str + "-01")
    
    # Bridge point
    chart_series[-1]["forecastBalance"] = round(float(y_balance[-1]), 2)

    # Determine which future periods to generate
    future_periods = []
    if target_periods and len(target_periods) > 0:
        # FAI-010: Generate only for selected valid forecast periods
        for p in target_periods:
            p_clean = p.strip()
            if p_clean > last_period_str:
                future_periods.append(p_clean)
        # Sort chronologically
        future_periods = sorted(list(set(future_periods)))
    else:
        # Default horizon months
        for step in range(1, horizon_months + 1):
            future_date = last_date + pd.DateOffset(months=step)
            future_periods.append(future_date.strftime("%Y-%m"))

    now_iso = datetime.now(timezone.utc).isoformat()
    stored_records = []

    for idx, future_period_str in enumerate(future_periods):
        future_date = pd.to_datetime(future_period_str + "-01")
        
        # Calculate month difference from last historical date for regression step
        months_diff = (future_date.year - last_date.year) * 12 + (future_date.month - last_date.month)
        future_x = len(df) - 1 + months_diff
        
        # Projected balance
        projected_balance = max(0.0, float(intercept_bal + slope_bal * future_x))

        # Projected inflows and outflows
        proj_inflow = max(0.0, avg_inflow * (1.0 + (slope_bal / max(1.0, baseline_balance)) * 0.5))
        proj_outflow = max(0.0, avg_outflow * (1.0 - (slope_bal / max(1.0, baseline_balance)) * 0.2))
        proj_net = proj_inflow - proj_outflow

        chart_series.append({
            "period": future_period_str,
            "historicalBalance": None,
            "forecastBalance": round(projected_balance, 2),
            "inflows": round(proj_inflow, 2),
            "outflows": round(proj_outflow, 2),
            "netFlow": round(proj_net, 2),
            "isProjected": True,
        })

        # FAI-011: Store format for database persistence
        stored_records.append({
            "fundId": fund_id,
            "fundCode": fund_code,
            "fundName": fund_name,
            "forecastPeriod": future_period_str,
            "forecastValue": round(projected_balance, 2),
            "projectedInflow": round(proj_inflow, 2),
            "projectedOutflow": round(proj_outflow, 2),
            "projectedNet": round(proj_net, 2),
            "baselineBalance": round(baseline_balance, 2),
            "trendDirection": trend_direction,
            "generationDate": now_iso,
            "isValid": True,
        })

    final_projected_balance = chart_series[-1]["forecastBalance"]
    variance = round(final_projected_balance - baseline_balance, 2)
    variance_pct = round((variance / baseline_balance * 100) if baseline_balance > 0 else 0.0, 2)

    return {
        "fundId": fund_id,
        "fundCode": fund_code,
        "fundName": fund_name,
        "baselineBalance": round(baseline_balance, 2),
        "projectedBalance": final_projected_balance,
        "forecastVariance": variance,
        "forecastVariancePercentage": variance_pct,
        "trendDirection": trend_direction,
        "monthlyTrendSlope": round(float(slope_bal), 2),
        "horizonMonths": len(future_periods),
        "selectedPeriods": future_periods,
        "analyzedPeriodsCount": len(df),
        "timeSeries": chart_series,
        "storedRecords": stored_records,
    }


# =====================================================================
# Fund Forecasting Processors (FAI-004, FAI-005, FAI-006, FAI-007, FAI-008, FAI-009)
# =====================================================================

def forecast_generic_fund(
    fund_code: str,
    funds_df: pd.DataFrame,
    prepared_df: pd.DataFrame,
    raw_tx_df: Optional[pd.DataFrame] = None,
    horizon_months: int = 4,
    target_periods: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    FAI-009: Generates forecast for ANY active configured fund retrieved from Fund Master
    without requiring fund-specific code changes.
    """
    code = fund_code.strip().upper()
    fund_row = funds_df[funds_df["fund_code"] == code]
    if fund_row.empty:
        raise ForecastingValidationError(f"Fund '{code}' not found in Fund Master active funds.")

    fund_id = str(fund_row.iloc[0].get("fund_id") or f"fnd-{code.lower()}")
    fund_name = fund_row.iloc[0]["fund_name"]
    baseline_bal = float(fund_row.iloc[0]["validated_balance"])

    # FAI-003 validation & data sufficiency check
    valid_periods_df = validate_forecasting_input(prepared_df, code, raw_tx_df, MIN_REQUIRED_PERIODS)

    forecast = _calculate_forecast_projection(
        fund_id, code, fund_name, baseline_bal, valid_periods_df, horizon_months, target_periods
    )

    task_id = TASK_MAPPINGS.get(code, {}).get("task_id", "FAI-009")
    forecast["taskReference"] = task_id
    return forecast


def forecast_union_fund(funds_df: pd.DataFrame, prepared_df: pd.DataFrame, raw_tx_df: Optional[pd.DataFrame] = None, horizon_months: int = 4, target_periods: Optional[List[str]] = None) -> Dict[str, Any]:
    """FAI-004: Union Fund forecast."""
    return forecast_generic_fund("UNF", funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)


def forecast_general_fund(funds_df: pd.DataFrame, prepared_df: pd.DataFrame, raw_tx_df: Optional[pd.DataFrame] = None, horizon_months: int = 4, target_periods: Optional[List[str]] = None) -> Dict[str, Any]:
    """FAI-005: General Fund forecast."""
    return forecast_generic_fund("GEN", funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)


def forecast_death_assistance_fund(funds_df: pd.DataFrame, prepared_df: pd.DataFrame, raw_tx_df: Optional[pd.DataFrame] = None, horizon_months: int = 4, target_periods: Optional[List[str]] = None) -> Dict[str, Any]:
    """FAI-006: Death Assistance Fund forecast."""
    return forecast_generic_fund("DAF", funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)


def forecast_foreign_assistance_fund(funds_df: pd.DataFrame, prepared_df: pd.DataFrame, raw_tx_df: Optional[pd.DataFrame] = None, horizon_months: int = 4, target_periods: Optional[List[str]] = None) -> Dict[str, Any]:
    """FAI-007: Foreign Assistance Fund forecast."""
    return forecast_generic_fund("FAF", funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)


def forecast_loan_fund(funds_df: pd.DataFrame, prepared_df: pd.DataFrame, raw_tx_df: Optional[pd.DataFrame] = None, horizon_months: int = 4, target_periods: Optional[List[str]] = None) -> Dict[str, Any]:
    """FAI-008: Loan Fund forecast."""
    return forecast_generic_fund("LNF", funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)


# =====================================================================
# Pipeline Orchestrator (FAI-009, FAI-010, FAI-011)
# =====================================================================
def run_forecasting_pipeline(
    raw_input: Dict[str, Any],
    target_fund: str = "ALL",
    horizon_months: int = 4,
    target_periods: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    FAI-009: Retrieves active funds from Fund Master and applies the same forecasting
    structure without requiring fund-specific code changes.
    FAI-010: Generates forecast values strictly for selected valid forecast periods.
    FAI-011: Prepares stored records for database persistence.
    """
    funds_df, raw_tx_df = load_historical_dataset(raw_input)
    prepared_df = prepare_forecasting_dataset(raw_tx_df)

    results = {}
    errors = {}
    all_stored_records = []

    target = target_fund.strip().upper()

    # Determine which funds to process
    if target == "ALL":
        # FAI-009: Dynamically process all active funds from Fund Master
        funds_to_process = funds_df["fund_code"].tolist()
    else:
        funds_to_process = [target]

    for code in funds_to_process:
        try:
            fc = forecast_generic_fund(code, funds_df, prepared_df, raw_tx_df, horizon_months, target_periods)
            results[code] = fc
            all_stored_records.extend(fc.get("storedRecords", []))
        except ForecastingValidationError as e:
            task_ref = TASK_MAPPINGS.get(code, {}).get("task_id", "FAI-009")
            errors[code] = {"error": str(e), "task": task_ref}

    # If single target requested and errored, raise exception
    if target != "ALL" and target in errors:
        raise ForecastingValidationError(errors[target]["error"])

    comparisons = []
    for code, fc in results.items():
        comparisons.append({
            "code": code,
            "name": fc["fundName"],
            "baseline": fc["baselineBalance"],
            "projected": fc["projectedBalance"],
            "variance": fc["forecastVariance"],
            "variancePercentage": fc["forecastVariancePercentage"],
            "trend": fc["trendDirection"],
        })

    return {
        "success": True,
        "engine": "Pandas DataFrame Time-Series Model",
        "targetFund": target,
        "horizonMonths": horizon_months,
        "targetPeriods": target_periods or [],
        "processedFundsCount": len(results),
        "forecasts": results,
        "errors": errors,
        "fundComparisons": comparisons,
        "storedForecastRecords": all_stored_records,  # FAI-011: For database persistence
    }


# =====================================================================
# CLI Entrypoint for NestJS / Shell execution
# =====================================================================
def main():
    parser = argparse.ArgumentParser(description="Sprint 4 AI Forecasting Engine using Pandas DataFrames")
    parser.add_argument("--fund", default="ALL", help="Target fund code or ALL")
    parser.add_argument("--horizon", type=int, default=4, help="Forecast horizon in months")
    parser.add_argument("--periods", default="", help="Comma-separated list of selected forecast periods (YYYY-MM)")
    parser.add_argument("--input-file", help="Path to JSON input file containing validated fund data")
    args = parser.parse_args()

    target_periods = [p.strip() for p in args.periods.split(",") if p.strip()] if args.periods else None

    try:
        if args.input_file:
            with open(args.input_file, "r", encoding="utf-8") as f:
                raw_input = json.load(f)
        else:
            raw_input = json.loads(sys.stdin.read())

        result = run_forecasting_pipeline(
            raw_input,
            target_fund=args.fund,
            horizon_months=args.horizon,
            target_periods=target_periods
        )
        print(json.dumps(result, indent=2))
        sys.exit(0)
    except ForecastingValidationError as e:
        print(json.dumps({"success": False, "error": e.message, "details": e.details}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Internal forecasting engine error: {str(e)}"}), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()

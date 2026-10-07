import sys
import json
import argparse
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np

# AI-FLP-008: Minimum number of valid monthly periods required for calculation
MIN_REQUIRED_PERIODS = 3

class LifespanValidationError(Exception):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

def load_historical_dataset(raw_input: Dict[str, Any]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    AI-FLP-001: Retrieve validated and historical fund data.
    AI-FLP-002: Retrieve the current fund balance.
    """
    funds = raw_input.get("validatedFunds", [])
    raw_transactions = raw_input.get("rawValidatedTransactions", [])

    if not funds:
        raise LifespanValidationError("No validated fund data provided in input.")

    funds_records = []
    for f in funds:
        funds_records.append({
            "fund_id": f.get("id"),
            "fund_name": f.get("name"),
            "fund_code": str(f.get("code", "")).upper(),
            "validated_balance": float(f.get("validatedBalance", 0.0)),
        })
    funds_df = pd.DataFrame(funds_records)

    tx_records = []
    for tx in raw_transactions:
        status = str(tx.get("status", "")).strip().capitalize()
        if status != "Posted":
            continue

        tx_records.append({
            "ref": tx.get("ref"),
            "fund_code": str(tx.get("fundCode", "")).upper(),
            "amount": float(tx.get("amount", 0.0)) if tx.get("amount") is not None else np.nan,
            "type": tx.get("type", ""),
            "date": str(tx.get("date", "")).strip(),
            "status": status,
        })

    transactions_df = pd.DataFrame(tx_records)
    
    # AI-FLP-014: Data quality - Drop duplicates based on ref and drop missing amounts/dates
    if not transactions_df.empty:
        transactions_df = transactions_df.dropna(subset=["amount", "date"])
        # Some transactions might not have a ref, only drop if ref is present and duplicated
        transactions_df = transactions_df.drop_duplicates(subset=["ref"], keep="first")
        
    return funds_df, transactions_df

def prepare_lifespan_dataset(transactions_df: pd.DataFrame) -> pd.DataFrame:
    """
    AI-FLP-003, 004, 005, 006: Prepare dataset and aggregate net flow.
    """
    if transactions_df.empty:
        return pd.DataFrame(columns=["fund_code", "period", "inflows", "outflows", "net_flow", "tx_count"])

    df = transactions_df.copy()
    df["datetime"] = pd.to_datetime(df["date"], errors="coerce")
    df["period"] = df["datetime"].dt.strftime("%Y-%m")

    type_str = df["type"].astype(str).str.lower()
    is_inflow = type_str.str.contains("inflow|collection|opening|transfer in|increase", regex=True)
    is_outflow = type_str.str.contains("outflow|disbursement|transfer out|decrease", regex=True)

    df["inflow_amount"] = np.where(is_inflow, df["amount"], 0.0)
    df["outflow_amount"] = np.where(is_outflow, df["amount"], 0.0)

    grouped = df.groupby(["fund_code", "period"], as_index=False).agg(
        inflows=("inflow_amount", "sum"),
        outflows=("outflow_amount", "sum"),
        tx_count=("amount", "count")
    )

    grouped["net_flow"] = grouped["inflows"] - grouped["outflows"]
    grouped = grouped.sort_values(by=["fund_code", "period"]).reset_index(drop=True)
    return grouped

def calculate_lifespan_prediction(
    fund_code: str,
    funds_df: pd.DataFrame,
    prepared_df: pd.DataFrame,
    horizon_months: int = 12
) -> Dict[str, Any]:
    code = fund_code.strip().upper()
    fund_row = funds_df[funds_df["fund_code"] == code]
    if fund_row.empty:
        raise LifespanValidationError(f"Fund '{code}' not found.")

    fund_name = fund_row.iloc[0]["fund_name"]
    current_balance = float(fund_row.iloc[0]["validated_balance"])
    fund_periods = prepared_df[prepared_df["fund_code"] == code].copy()
    periods_count = len(fund_periods)

    # Base result dictionary
    result = {
        "fundCode": code,
        "fundName": fund_name,
        "currentBalance": round(current_balance, 2),
        "periodsCount": periods_count,
        "isSufficient": True,
        "totalInflows": 0.0,
        "totalOutflows": 0.0,
        "averageNetMovement": 0.0,
        "depletionRate": 0.0,
        "estimatedLifespanMonths": None,
        "projectedDepletionDate": None,
        "fundCondition": "Stable",
        "confidenceLevel": "Low",
        "confidenceReason": "",
        "message": "",
        "projectedBalances": [],
        "periods": []
    }

    # AI-FLP-008: Check data sufficiency
    if periods_count < MIN_REQUIRED_PERIODS:
        result["isSufficient"] = False
        result["fundCondition"] = "Insufficient Data"
        result["confidenceLevel"] = "Low"
        result["confidenceReason"] = f"Only {periods_count} period(s) available. Minimum required is {MIN_REQUIRED_PERIODS}."
        result["message"] = "Insufficient historical data to make a reliable lifespan prediction."
        
        # Populate periods if available
        if not fund_periods.empty:
            result["periods"] = fund_periods[["period", "inflows", "outflows", "net_flow"]].round(2).to_dict(orient="records")
        return result

    # Aggregates
    total_inflows = float(fund_periods["inflows"].sum())
    total_outflows = float(fund_periods["outflows"].sum())
    average_net_movement = float(fund_periods["net_flow"].mean())
    std_net_movement = float(fund_periods["net_flow"].std() or 0.0)

    result["totalInflows"] = round(total_inflows, 2)
    result["totalOutflows"] = round(total_outflows, 2)
    result["averageNetMovement"] = round(average_net_movement, 2)
    
    # AI-FLP-013: Prediction Confidence
    cv = (std_net_movement / abs(average_net_movement)) if average_net_movement != 0 else float('inf')
    if periods_count >= 6 and cv <= 1.0:
        result["confidenceLevel"] = "High"
        result["confidenceReason"] = "Strong historical data availability with low variance in net movement."
    elif periods_count >= 3:
        if cv <= 1.0:
            result["confidenceLevel"] = "Medium"
            result["confidenceReason"] = "Sufficient historical data with stable net movement."
        else:
            result["confidenceLevel"] = "Medium"
            result["confidenceReason"] = "Sufficient historical data, but high variance limits prediction certainty."
            
    # AI-FLP-007: Depletion Rate & AI-FLP-011: Estimated Lifespan
    depletion_rate = 0.0
    estimated_lifespan_months = None
    message = "Fund has a stable or growing balance. No finite depletion expected."
    
    if average_net_movement < 0:
        depletion_rate = abs(average_net_movement)
        result["depletionRate"] = round(depletion_rate, 2)
        if current_balance > 0:
            estimated_lifespan_months = current_balance / depletion_rate
            result["estimatedLifespanMonths"] = round(estimated_lifespan_months, 2)
            message = f"Based on historical data, the fund is depleting at an average rate of {depletion_rate:.2f} per month."
        else:
            estimated_lifespan_months = 0.0
            result["estimatedLifespanMonths"] = 0.0
            message = "Fund balance is already completely depleted."
    
    result["message"] = message

    # AI-FLP-009: Generate projected future fund balances (Prediction Horizon)
    # AI-FLP-010: Estimate the fund depletion date
    last_period_str = fund_periods["period"].iloc[-1]
    last_date = pd.to_datetime(last_period_str + "-01")
    
    projected_balances = []
    running_balance = current_balance
    depletion_date = None

    for i in range(1, horizon_months + 1):
        target_date = last_date + pd.DateOffset(months=i)
        period_str = target_date.strftime("%Y-%m")
        
        running_balance += average_net_movement
        
        # AI-FLP-010 check
        if running_balance <= 0 and depletion_date is None:
            depletion_date = period_str
            running_balance = 0.0 # Floor at 0 for display
            
        projected_balances.append({
            "period": period_str,
            "projectedBalance": round(max(running_balance, 0.0), 2)
        })
    
    result["projectedBalances"] = projected_balances
    
    # AI-FLP-010: Depletion Date logic
    if estimated_lifespan_months is not None and depletion_date is None:
        # If it depletes, but beyond the horizon, we can mathematically calculate the date
        months_to_deplete = int(estimated_lifespan_months)
        if months_to_deplete > horizon_months:
            depletion_target = last_date + pd.DateOffset(months=months_to_deplete)
            result["projectedDepletionDate"] = depletion_target.strftime("%Y-%m")
    elif depletion_date is not None:
        result["projectedDepletionDate"] = depletion_date
        
    # AI-FLP-012: Classify fund's projected condition
    if average_net_movement >= 0:
        result["fundCondition"] = "Stable"
    else:
        if estimated_lifespan_months is not None:
            if estimated_lifespan_months <= 3:
                result["fundCondition"] = "Projected to Deplete"
            elif estimated_lifespan_months <= 12:
                result["fundCondition"] = "At Risk"
            else:
                result["fundCondition"] = "Declining"

    # Periods for UI
    result["periods"] = fund_periods[["period", "inflows", "outflows", "net_flow"]].round(2).to_dict(orient="records")

    return result

def run_lifespan_pipeline(
    raw_input: Dict[str, Any],
    target_fund: str = "ALL",
    horizon: int = 12
) -> Dict[str, Any]:
    funds_df, raw_tx_df = load_historical_dataset(raw_input)
    prepared_df = prepare_lifespan_dataset(raw_tx_df)

    results = {}
    errors = {}

    target = target_fund.strip().upper()

    if target == "ALL":
        funds_to_process = funds_df["fund_code"].tolist()
    else:
        funds_to_process = [target]

    for code in funds_to_process:
        try:
            res = calculate_lifespan_prediction(code, funds_df, prepared_df, horizon)
            results[code] = res
        except LifespanValidationError as e:
            errors[code] = {"error": str(e)}

    if target != "ALL" and target in errors:
        raise LifespanValidationError(errors[target]["error"])

    return {
        "success": True,
        "targetFund": target,
        "horizonMonths": horizon,
        "processedFundsCount": len(results),
        "predictions": results,
        "errors": errors
    }

def main():
    parser = argparse.ArgumentParser(description="Sprint 5 AI-Based Fund Lifespan Prediction")
    parser.add_argument("--fund", default="ALL", help="Target fund code or ALL")
    parser.add_argument("--horizon", type=int, default=12, help="Prediction horizon in months")
    args = parser.parse_args()

    try:
        raw_input = json.loads(sys.stdin.read())
        result = run_lifespan_pipeline(
            raw_input,
            target_fund=args.fund,
            horizon=args.horizon
        )
        print(json.dumps(result, indent=2))
        sys.exit(0)
    except LifespanValidationError as e:
        print(json.dumps({"success": False, "error": e.message, "details": e.details}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Internal engine error: {str(e)}"}), file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()

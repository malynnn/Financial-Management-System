"""
Unit Tests for Sprint 4 AI Forecasting Module (FAI-001 through FAI-012)
BDOEA Financial Management System

Validates Pandas DataFrame operations, input validations, sufficiency criteria,
generic dynamic fund forecasting (FAI-009), selected period filtering (FAI-010),
and forecast persistence formatting (FAI-011).
"""

import unittest
import pandas as pd
import numpy as np
from forecasting_engine import (
    load_historical_dataset,
    prepare_forecasting_dataset,
    validate_forecasting_input,
    forecast_union_fund,
    forecast_general_fund,
    forecast_death_assistance_fund,
    forecast_foreign_assistance_fund,
    forecast_loan_fund,
    forecast_generic_fund,
    run_forecasting_pipeline,
    ForecastingValidationError,
    MIN_REQUIRED_PERIODS,
)


def create_sample_validated_input():
    """Generates realistic sample validated fund balances and posted transactions across 5 Master funds."""
    return {
        "validatedFunds": [
            {
                "id": "fnd-union-01",
                "name": "Union Fund",
                "code": "UNF",
                "validatedBalance": 500000.0,
                "targetUtilization": 80.0,
                "currentUtilization": 45.0,
                "status": "Active",
            },
            {
                "id": "fnd-general-01",
                "name": "General Fund",
                "code": "GEN",
                "validatedBalance": 250000.0,
                "targetUtilization": 75.0,
                "currentUtilization": 60.0,
                "status": "Active",
            },
            {
                "id": "fnd-death-01",
                "name": "Death Assistance Fund",
                "code": "DAF",
                "validatedBalance": 150000.0,
                "targetUtilization": 50.0,
                "currentUtilization": 30.0,
                "status": "Active",
            },
            {
                "id": "fnd-foreign-01",
                "name": "Foreign Assistance Fund",
                "code": "FAF",
                "validatedBalance": 80000.0,
                "targetUtilization": 40.0,
                "currentUtilization": 20.0,
                "status": "Active",
            },
            {
                "id": "fnd-loan-01",
                "name": "Loan Fund",
                "code": "LNF",
                "validatedBalance": 850000.0,
                "targetUtilization": 90.0,
                "currentUtilization": 70.0,
                "status": "Active",
            },
        ],
        "rawValidatedTransactions": [
            # Union Fund (UNF) - 4 monthly periods (2026-05, 2026-06, 2026-07, 2026-08)
            {"ref": "TX-UNF-01", "fundCode": "UNF", "fundName": "Union Fund", "amount": 40000.0, "type": "Inflow (Collection)", "date": "2026-05-10", "status": "Posted"},
            {"ref": "TX-UNF-02", "fundCode": "UNF", "fundName": "Union Fund", "amount": 15000.0, "type": "Outflow (Disbursement)", "date": "2026-05-20", "status": "Posted"},
            {"ref": "TX-UNF-03", "fundCode": "UNF", "fundName": "Union Fund", "amount": 45000.0, "type": "Inflow (Collection)", "date": "2026-06-12", "status": "Posted"},
            {"ref": "TX-UNF-04", "fundCode": "UNF", "fundName": "Union Fund", "amount": 20000.0, "type": "Outflow (Disbursement)", "date": "2026-06-25", "status": "Posted"},
            {"ref": "TX-UNF-05", "fundCode": "UNF", "fundName": "Union Fund", "amount": 50000.0, "type": "Inflow (Collection)", "date": "2026-07-08", "status": "Posted"},
            {"ref": "TX-UNF-06", "fundCode": "UNF", "fundName": "Union Fund", "amount": 18000.0, "type": "Outflow (Disbursement)", "date": "2026-07-22", "status": "Posted"},
            {"ref": "TX-UNF-07", "fundCode": "UNF", "fundName": "Union Fund", "amount": 55000.0, "type": "Inflow (Collection)", "date": "2026-08-15", "status": "Posted"},
            {"ref": "TX-UNF-08", "fundCode": "UNF", "fundName": "Union Fund", "amount": 22000.0, "type": "Outflow (Disbursement)", "date": "2026-08-28", "status": "Posted"},

            # General Fund (GEN) - 4 monthly periods (2026-05, 2026-06, 2026-07, 2026-08)
            {"ref": "TX-GEN-01", "fundCode": "GEN", "fundName": "General Fund", "amount": 30000.0, "type": "Inflow (Collection)", "date": "2026-05-05", "status": "Posted"},
            {"ref": "TX-GEN-02", "fundCode": "GEN", "fundName": "General Fund", "amount": 25000.0, "type": "Outflow (Disbursement)", "date": "2026-05-18", "status": "Posted"},
            {"ref": "TX-GEN-03", "fundCode": "GEN", "fundName": "General Fund", "amount": 32000.0, "type": "Inflow (Collection)", "date": "2026-06-10", "status": "Posted"},
            {"ref": "TX-GEN-04", "fundCode": "GEN", "fundName": "General Fund", "amount": 28000.0, "type": "Outflow (Disbursement)", "date": "2026-06-20", "status": "Posted"},
            {"ref": "TX-GEN-05", "fundCode": "GEN", "fundName": "General Fund", "amount": 29000.0, "type": "Inflow (Collection)", "date": "2026-07-07", "status": "Posted"},
            {"ref": "TX-GEN-06", "fundCode": "GEN", "fundName": "General Fund", "amount": 27000.0, "type": "Outflow (Disbursement)", "date": "2026-07-19", "status": "Posted"},
            {"ref": "TX-GEN-07", "fundCode": "GEN", "fundName": "General Fund", "amount": 35000.0, "type": "Inflow (Collection)", "date": "2026-08-12", "status": "Posted"},
            {"ref": "TX-GEN-08", "fundCode": "GEN", "fundName": "General Fund", "amount": 30000.0, "type": "Outflow (Disbursement)", "date": "2026-08-25", "status": "Posted"},

            # Death Assistance Fund (DAF) - 3 monthly periods (2026-06, 2026-07, 2026-08)
            {"ref": "TX-DAF-01", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 20000.0, "type": "Inflow (Collection)", "date": "2026-06-15", "status": "Posted"},
            {"ref": "TX-DAF-02", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 8000.0, "type": "Outflow (Disbursement)", "date": "2026-06-28", "status": "Posted"},
            {"ref": "TX-DAF-03", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 22000.0, "type": "Inflow (Collection)", "date": "2026-07-14", "status": "Posted"},
            {"ref": "TX-DAF-04", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 10000.0, "type": "Outflow (Disbursement)", "date": "2026-07-27", "status": "Posted"},
            {"ref": "TX-DAF-05", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 25000.0, "type": "Inflow (Collection)", "date": "2026-08-16", "status": "Posted"},
            {"ref": "TX-DAF-06", "fundCode": "DAF", "fundName": "Death Assistance Fund", "amount": 12000.0, "type": "Outflow (Disbursement)", "date": "2026-08-29", "status": "Posted"},

            # Foreign Assistance Fund (FAF) - 3 monthly periods (2026-06, 2026-07, 2026-08)
            {"ref": "TX-FAF-01", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 15000.0, "type": "Inflow (Collection)", "date": "2026-06-05", "status": "Posted"},
            {"ref": "TX-FAF-02", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 5000.0, "type": "Outflow (Disbursement)", "date": "2026-06-21", "status": "Posted"},
            {"ref": "TX-FAF-03", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 16000.0, "type": "Inflow (Collection)", "date": "2026-07-06", "status": "Posted"},
            {"ref": "TX-FAF-04", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 6000.0, "type": "Outflow (Disbursement)", "date": "2026-07-20", "status": "Posted"},
            {"ref": "TX-FAF-05", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 18000.0, "type": "Inflow (Collection)", "date": "2026-08-10", "status": "Posted"},
            {"ref": "TX-FAF-06", "fundCode": "FAF", "fundName": "Foreign Assistance Fund", "amount": 7000.0, "type": "Outflow (Disbursement)", "date": "2026-08-26", "status": "Posted"},

            # Loan Fund (LNF) - 3 monthly periods (2026-06, 2026-07, 2026-08)
            {"ref": "TX-LNF-01", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 80000.0, "type": "Inflow (Collection)", "date": "2026-06-08", "status": "Posted"},
            {"ref": "TX-LNF-02", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 50000.0, "type": "Outflow (Disbursement)", "date": "2026-06-24", "status": "Posted"},
            {"ref": "TX-LNF-03", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 85000.0, "type": "Inflow (Collection)", "date": "2026-07-11", "status": "Posted"},
            {"ref": "TX-LNF-04", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 55000.0, "type": "Outflow (Disbursement)", "date": "2026-07-25", "status": "Posted"},
            {"ref": "TX-LNF-05", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 90000.0, "type": "Inflow (Collection)", "date": "2026-08-14", "status": "Posted"},
            {"ref": "TX-LNF-06", "fundCode": "LNF", "fundName": "Loan Fund", "amount": 60000.0, "type": "Outflow (Disbursement)", "date": "2026-08-27", "status": "Posted"},

            # Unposted transaction (Must be ignored per FAI-001)
            {"ref": "TX-UNPOSTED-01", "fundCode": "UNF", "fundName": "Union Fund", "amount": 99999.0, "type": "Inflow", "date": "2026-08-30", "status": "Pending"},
        ],
    }


class TestAIForecastingModule(unittest.TestCase):

    def setUp(self):
        self.sample_input = create_sample_validated_input()

    # ─────────────────────────────────────────────────────────────────
    # FAI-001 Tests: Retrieve validated and historical fund data
    # ─────────────────────────────────────────────────────────────────
    def test_fai_001_load_historical_dataset_creates_dataframes(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        self.assertIsInstance(funds_df, pd.DataFrame)
        self.assertIsInstance(tx_df, pd.DataFrame)
        self.assertEqual(len(funds_df), 5)
        self.assertTrue((tx_df["status"] == "Posted").all())
        self.assertNotIn("TX-UNPOSTED-01", tx_df["ref"].values)

    # ─────────────────────────────────────────────────────────────────
    # FAI-002 Tests: Prepare historical fund data
    # ─────────────────────────────────────────────────────────────────
    def test_fai_002_prepare_forecasting_dataset_groups_by_fund_and_period(self):
        _, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        self.assertIsInstance(prepared_df, pd.DataFrame)
        self.assertIn("period", prepared_df.columns)
        self.assertIn("net_flow", prepared_df.columns)

    # ─────────────────────────────────────────────────────────────────
    # FAI-003 Tests: Validate forecasting inputs
    # ─────────────────────────────────────────────────────────────────
    def test_fai_003_rejects_missing_fund_reference(self):
        _, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        with self.assertRaises(ForecastingValidationError):
            validate_forecasting_input(prepared_df, "")

    def test_fai_003_rejects_incomplete_required_periods(self):
        sparse_tx = pd.DataFrame([
            {"ref": "TX-1", "fund_code": "SPARSE", "fund_name": "Sparse Fund", "amount": 1000.0, "type": "Inflow", "date": "2026-08-01", "status": "Posted"}
        ])
        prepared_df = prepare_forecasting_dataset(sparse_tx)
        with self.assertRaises(ForecastingValidationError):
            validate_forecasting_input(prepared_df, "SPARSE", min_periods=3)

    # ─────────────────────────────────────────────────────────────────
    # FAI-004, FAI-005, FAI-006: Union, General, Death Assistance Funds
    # ─────────────────────────────────────────────────────────────────
    def test_fai_004_forecast_union_fund(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        fc = forecast_union_fund(funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "UNF")
        self.assertEqual(fc["taskReference"], "FAI-004")

    def test_fai_005_forecast_general_fund(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        fc = forecast_general_fund(funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "GEN")
        self.assertEqual(fc["taskReference"], "FAI-005")

    def test_fai_006_forecast_death_assistance_fund(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        fc = forecast_death_assistance_fund(funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "DAF")
        self.assertEqual(fc["taskReference"], "FAI-006")

    # ─────────────────────────────────────────────────────────────────
    # FAI-007 Tests: Process Foreign Assistance Fund data
    # ─────────────────────────────────────────────────────────────────
    def test_fai_007_forecast_foreign_assistance_fund_success(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        fc = forecast_foreign_assistance_fund(funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "FAF")
        self.assertEqual(fc["fundName"], "Foreign Assistance Fund")
        self.assertEqual(fc["baselineBalance"], 80000.0)
        self.assertGreater(fc["projectedBalance"], 0)
        self.assertEqual(fc["taskReference"], "FAI-007")

    def test_fai_007_foreign_assistance_fund_insufficient_data_rejection(self):
        corrupt_input = create_sample_validated_input()
        corrupt_input["rawValidatedTransactions"] = [
            tx for tx in corrupt_input["rawValidatedTransactions"]
            if tx["fundCode"] != "FAF" or tx["ref"] == "TX-FAF-01"
        ]
        funds_df, tx_df = load_historical_dataset(corrupt_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        with self.assertRaises(ForecastingValidationError) as ctx:
            forecast_foreign_assistance_fund(funds_df, prepared_df, tx_df)
        self.assertIn("Incomplete required periods", str(ctx.exception))

    # ─────────────────────────────────────────────────────────────────
    # FAI-008 Tests: Process Loan Fund data
    # ─────────────────────────────────────────────────────────────────
    def test_fai_008_forecast_loan_fund_success(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)
        fc = forecast_loan_fund(funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "LNF")
        self.assertEqual(fc["fundName"], "Loan Fund")
        self.assertEqual(fc["baselineBalance"], 850000.0)
        self.assertGreater(fc["projectedBalance"], 0)
        self.assertEqual(fc["taskReference"], "FAI-008")

    # ─────────────────────────────────────────────────────────────────
    # FAI-009 Tests: Dynamic configured funds from Fund Master
    # ─────────────────────────────────────────────────────────────────
    def test_fai_009_dynamic_fund_forecasting_without_code_changes(self):
        # Add a newly configured fund to Fund Master (e.g. "Calamity Fund" / "CAL")
        dynamic_input = create_sample_validated_input()
        dynamic_input["validatedFunds"].append({
            "id": "fnd-calamity-01",
            "name": "Calamity Fund",
            "code": "CAL",
            "validatedBalance": 300000.0,
            "targetUtilization": 80.0,
            "currentUtilization": 10.0,
            "status": "Active",
        })
        # Add 3 historical periods for the new fund
        for month, inf, outf in [("2026-06", 50000, 10000), ("2026-07", 60000, 15000), ("2026-08", 70000, 20000)]:
            dynamic_input["rawValidatedTransactions"].append({
                "ref": f"TX-CAL-{month}",
                "fundCode": "CAL",
                "fundName": "Calamity Fund",
                "amount": float(inf),
                "type": "Inflow",
                "date": f"{month}-10",
                "status": "Posted"
            })
            dynamic_input["rawValidatedTransactions"].append({
                "ref": f"TX-CAL-OUT-{month}",
                "fundCode": "CAL",
                "fundName": "Calamity Fund",
                "amount": float(outf),
                "type": "Outflow",
                "date": f"{month}-25",
                "status": "Posted"
            })

        funds_df, tx_df = load_historical_dataset(dynamic_input)
        prepared_df = prepare_forecasting_dataset(tx_df)

        # FAI-009: Must process "CAL" dynamically without fund-specific code changes
        fc = forecast_generic_fund("CAL", funds_df, prepared_df, tx_df, horizon_months=4)
        self.assertEqual(fc["fundCode"], "CAL")
        self.assertEqual(fc["fundName"], "Calamity Fund")
        self.assertEqual(fc["baselineBalance"], 300000.0)
        self.assertGreater(fc["projectedBalance"], 0)

    # ─────────────────────────────────────────────────────────────────
    # FAI-010 Tests: Generate forecast values for selected valid forecast periods
    # ─────────────────────────────────────────────────────────────────
    def test_fai_010_generate_forecast_for_selected_periods_only(self):
        funds_df, tx_df = load_historical_dataset(self.sample_input)
        prepared_df = prepare_forecasting_dataset(tx_df)

        selected_periods = ["2026-09", "2026-10"]
        fc = forecast_union_fund(funds_df, prepared_df, tx_df, target_periods=selected_periods)

        # Must strictly have the selected periods
        self.assertEqual(fc["selectedPeriods"], selected_periods)
        projected_series = [s for s in fc["timeSeries"] if s["isProjected"]]
        self.assertEqual(len(projected_series), 2)
        self.assertEqual([p["period"] for p in projected_series], selected_periods)

    # ─────────────────────────────────────────────────────────────────
    # FAI-011 Tests: Stored forecast records format
    # ─────────────────────────────────────────────────────────────────
    def test_fai_011_stored_forecast_records_prepared_for_database(self):
        result = run_forecasting_pipeline(self.sample_input, target_fund="ALL", horizon_months=4)
        stored_records = result["storedForecastRecords"]

        self.assertGreater(len(stored_records), 0)
        for record in stored_records:
            self.assertIn("fundId", record)
            self.assertIn("fundCode", record)
            self.assertIn("forecastPeriod", record)
            self.assertIn("forecastValue", record)
            self.assertIn("projectedInflow", record)
            self.assertIn("projectedOutflow", record)
            self.assertIn("generationDate", record)
            self.assertTrue(record["isValid"])


if __name__ == "__main__":
    unittest.main()

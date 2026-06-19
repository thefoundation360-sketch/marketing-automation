#!/bin/bash
# Credit Repair Suite — Main Launcher

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        CREDIT REPAIR AUTOMATION SUITE               ║"
echo "║  FCRA/FDCPA Dispute Letters + CFPB + Tracker        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  1) Generate PDF dispute letters (TransUnion, Experian, Equifax, CFPB, DVL)"
echo "  2) Auto-fill CFPB complaints in browser"
echo "  3) Open score & dispute tracker dashboard"
echo "  4) Run full suite (letters first, then tracker)"
echo ""
read -p "Select option [1-4]: " choice

case $choice in
  1)
    python3 credit_repair/generate_letters.py
    ;;
  2)
    python3 credit_repair/cfpb_filer.py
    ;;
  3)
    python3 credit_repair/score_tracker.py
    ;;
  4)
    python3 credit_repair/generate_letters.py
    echo ""
    python3 credit_repair/score_tracker.py
    ;;
  *)
    echo "Invalid option."
    exit 1
    ;;
esac

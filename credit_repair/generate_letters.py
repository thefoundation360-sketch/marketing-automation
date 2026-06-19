#!/usr/bin/env python3
"""
Credit Dispute Letter PDF Generator
Collects user info interactively and produces print-ready PDFs
for TransUnion, Experian, Equifax, CFPB complaints, and debt validation letters.
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path

import questionary
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUTPUT_DIR = Path(__file__).parent.parent / "generated_letters"
OUTPUT_DIR.mkdir(exist_ok=True)

TODAY = datetime.now().strftime("%B %d, %Y")
TODAY_ISO = datetime.now().strftime("%Y-%m-%d")


# ─── Color palette ───────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1a2744")
GOLD   = colors.HexColor("#c9a84c")
LIGHT  = colors.HexColor("#f5f7fa")
WHITE  = colors.white
RED    = colors.HexColor("#b91c1c")


def styles():
    base = getSampleStyleSheet()
    return {
        "title":   ParagraphStyle("title",   parent=base["Normal"], fontSize=16, textColor=WHITE,      fontName="Helvetica-Bold", spaceAfter=4,  alignment=TA_CENTER),
        "subtitle":ParagraphStyle("subtitle",parent=base["Normal"], fontSize=10, textColor=GOLD,       fontName="Helvetica-Bold", spaceAfter=2,  alignment=TA_CENTER),
        "h2":      ParagraphStyle("h2",      parent=base["Normal"], fontSize=12, textColor=NAVY,       fontName="Helvetica-Bold", spaceBefore=12,spaceAfter=4),
        "h3":      ParagraphStyle("h3",      parent=base["Normal"], fontSize=10, textColor=NAVY,       fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=3),
        "body":    ParagraphStyle("body",    parent=base["Normal"], fontSize=9,  textColor=colors.black,fontName="Helvetica",      spaceAfter=6,  leading=14, alignment=TA_JUSTIFY),
        "bullet":  ParagraphStyle("bullet",  parent=base["Normal"], fontSize=9,  textColor=colors.black,fontName="Helvetica",      spaceAfter=4,  leftIndent=20, bulletIndent=8),
        "label":   ParagraphStyle("label",   parent=base["Normal"], fontSize=8,  textColor=colors.HexColor("#666666"), fontName="Helvetica-Bold", spaceAfter=2),
        "value":   ParagraphStyle("value",   parent=base["Normal"], fontSize=9,  textColor=colors.black,fontName="Helvetica",      spaceAfter=6),
        "legal":   ParagraphStyle("legal",   parent=base["Normal"], fontSize=8,  textColor=colors.HexColor("#444444"),fontName="Helvetica",      spaceAfter=4,  leading=12, alignment=TA_JUSTIFY),
        "warning": ParagraphStyle("warning", parent=base["Normal"], fontSize=9,  textColor=RED,        fontName="Helvetica-Bold", spaceAfter=6),
        "sig":     ParagraphStyle("sig",     parent=base["Normal"], fontSize=9,  textColor=colors.black,fontName="Helvetica",      spaceAfter=10),
    }


def header_table(bureau_name, bureau_address, profile, s):
    """Build the top letterhead block."""
    sender = (
        f"{profile['name']}<br/>"
        f"{profile['address']}<br/>"
        f"{profile['city']}, {profile['state']} {profile['zip']}<br/>"
        f"{profile['phone']}<br/>{profile['email']}"
    )
    recipient = (
        f"<b>{bureau_name}</b><br/>"
        f"{bureau_address}"
    )
    data = [[
        Paragraph(sender,    ParagraphStyle("sl", parent=s["body"], fontSize=9)),
        Paragraph(f"<b>Date:</b> {TODAY}", ParagraphStyle("dc", parent=s["body"], fontSize=9, alignment=TA_CENTER)),
        Paragraph(recipient, ParagraphStyle("rl", parent=s["body"], fontSize=9, alignment=TA_LEFT)),
    ]]
    t = Table(data, colWidths=[2.5*inch, 2*inch, 2.8*inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (0,0), (-1,-1), LIGHT),
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#cccccc")),
        ("INNERGRID", (0,0), (-1,-1), 0.25, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    return t


def title_banner(text, subtext, s):
    data = [[Paragraph(text, s["title"])], [Paragraph(subtext, s["subtitle"])]]
    t = Table(data, colWidths=[7.3*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), NAVY),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
    ]))
    return t


def dispute_items_table(items, s):
    if not items:
        return Paragraph("No disputed items entered.", s["body"])
    rows = [["#", "Creditor / Agency", "Acct (last 4)", "Balance", "Basis", "Relief"]]
    for i, it in enumerate(items, 1):
        rows.append([
            str(i),
            it.get("creditor",""),
            it.get("acct","XXXX"),
            f"${it.get('balance','0')}",
            it.get("basis","Inaccurate"),
            it.get("relief","Delete"),
        ])
    t = Table(rows, colWidths=[0.3*inch, 1.6*inch, 1.1*inch, 0.8*inch, 1.5*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
        ("WORDWRAP", (0,0), (-1,-1), True),
    ]))
    return t


def signature_block(profile, s):
    elements = []
    elements.append(Spacer(1, 0.3*inch))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph(
        "I declare under penalty of perjury that the foregoing is true and correct.", s["legal"]
    ))
    elements.append(Spacer(1, 0.4*inch))
    sig_data = [
        ["Signature:", "_" * 40, "Date:", TODAY],
        ["Printed Name:", profile["name"], "SSN (last 4):", "XXXX"],
    ]
    t = Table(sig_data, colWidths=[1.2*inch, 3*inch, 0.8*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    elements.append(t)
    return elements


def send_instructions(bureau, address, online_url, s):
    elements = []
    elements.append(Spacer(1, 0.2*inch))
    data = [
        [Paragraph("<b>SEND VIA CERTIFIED MAIL:</b>", s["label"]),
         Paragraph(address, s["value"])],
        [Paragraph("<b>ONLINE DISPUTE:</b>", s["label"]),
         Paragraph(online_url, s["value"])],
        [Paragraph("<b>TRACKING #:</b>", s["label"]),
         Paragraph("______________________________  (fill in after mailing)", s["value"])],
        [Paragraph("<b>DATE MAILED:</b>", s["label"]),
         Paragraph("______________________________", s["value"])],
        [Paragraph("<b>30-DAY DEADLINE:</b>", s["label"]),
         Paragraph(f"Response required by: ______________________________", s["value"])],
    ]
    t = Table(data, colWidths=[1.8*inch, 5.5*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), LIGHT),
        ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    elements.append(t)
    return elements


# ─── Letter builders ─────────────────────────────────────────────────────────

def build_bureau_letter(profile, bureau_name, bureau_address, bureau_online, items, extra_clauses, s):
    elems = []

    elems.append(title_banner(
        f"FORMAL CREDIT DISPUTE — {bureau_name.upper()}",
        f"Fair Credit Reporting Act §§ 611 & 623  |  {TODAY}",
        s
    ))
    elems.append(Spacer(1, 0.15*inch))
    elems.append(header_table(bureau_name, bureau_address, profile, s))
    elems.append(Spacer(1, 0.15*inch))

    elems.append(Paragraph("RE: Formal Dispute of Inaccurate, Unverifiable, and Incomplete Credit Information", s["h2"]))
    elems.append(Paragraph(
        f"SSN (last 4): XXXX &nbsp;&nbsp;|&nbsp;&nbsp; DOB: {profile['dob']} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Current FICO (approx.): {profile['fico']}",
        s["body"]
    ))

    elems.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    elems.append(Spacer(1, 0.1*inch))

    elems.append(Paragraph("NOTICE OF DISPUTE UNDER THE FAIR CREDIT REPORTING ACT", s["h2"]))
    elems.append(Paragraph(
        "Pursuant to my rights under the <b>Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.</b>, "
        "specifically <b>Sections 611 (15 U.S.C. § 1681i)</b> and <b>623 (15 U.S.C. § 1681s-2)</b>, "
        "I am formally disputing the following items on my credit report as <b>inaccurate, unverifiable, "
        "incomplete, or reported in violation of applicable law.</b> Under FCRA § 611(a)(1), you are required "
        "to conduct a <b>reasonable investigation within 30 days</b> of receipt and correct, update, or delete "
        "any information that cannot be verified.", s["body"]
    ))

    elems.append(Paragraph("DISPUTED ITEMS", s["h2"]))
    elems.append(dispute_items_table(items, s))
    elems.append(Spacer(1, 0.1*inch))

    elems.append(Paragraph("LEGAL GROUNDS", s["h2"]))
    legal_grounds = [
        "FCRA § 611(a) — Right to dispute; CRA must reinvestigate within 30 days",
        "FCRA § 605(a)(4) — Adverse items older than 7 years from DOFD must be excluded",
        "FCRA § 605(a)(3)(B) — Hard inquiries older than 2 years must be removed",
        "FCRA § 623(a)(1) — Furnishers must report only accurate information",
        "FCRA § 623(a)(5) — Furnishers must report the correct Date of First Delinquency",
        "FCRA § 623(b) — Furnishers must investigate disputes forwarded by CRAs",
    ] + extra_clauses
    for g in legal_grounds:
        elems.append(Paragraph(f"• {g}", s["bullet"]))

    elems.append(Spacer(1, 0.1*inch))
    elems.append(Paragraph("DEMAND FOR ACTION", s["h2"]))
    demands = [
        f"Conduct a bona fide reinvestigation of all disputed items within 30 days",
        "Forward this dispute and all enclosed documentation to each furnisher (FCRA § 611(a)(2))",
        "Delete any item the furnisher cannot verify with completeness and accuracy",
        "Correct any inaccurate item to reflect true and accurate information",
        "Provide written notice of reinvestigation results within 5 business days of completion (FCRA § 611(a)(6))",
        "Send a corrected report to any entity that received my file in the past 6 months (FCRA § 611(d))",
    ]
    for d in demands:
        elems.append(Paragraph(f"• {d}", s["bullet"]))

    elems.append(Spacer(1, 0.1*inch))
    elems.append(Paragraph("NOTICE OF INTENT TO SUE", s["h2"]))
    elems.append(Paragraph(
        "Failure to comply with the FCRA will result in pursuit of all available legal remedies under "
        "<b>FCRA § 616</b> (willful noncompliance: $100–$1,000 statutory damages per violation + punitive + "
        "attorney fees) and <b>FCRA § 617</b> (negligent noncompliance: actual damages + attorney fees), "
        "as well as applicable state consumer protection laws.", s["body"]
    ))

    elems.append(Paragraph("ENCLOSURES", s["h2"]))
    enclosures = ["Government-issued photo ID", "Social Security card or SSN document",
                  "Proof of current address (dated within 60 days)", "Supporting documentation per disputed item"]
    for e in enclosures:
        elems.append(Paragraph(f"☐  {e}", s["bullet"]))

    elems += signature_block(profile, s)
    elems.append(Spacer(1, 0.2*inch))
    elems.append(Paragraph("MAILING & TRACKING INFORMATION", s["h2"]))
    elems += send_instructions(bureau_name, bureau_address, bureau_online, s)

    return elems


def build_cfpb_letter(profile, items, s):
    elems = []
    elems.append(title_banner(
        "CFPB CONSUMER COMPLAINT",
        f"Consumer Financial Protection Bureau  |  consumerfinance.gov/complaint  |  {TODAY}",
        s
    ))
    elems.append(Spacer(1, 0.15*inch))

    sender_para = Paragraph(
        f"<b>Complainant:</b> {profile['name']}<br/>"
        f"{profile['address']}, {profile['city']}, {profile['state']} {profile['zip']}<br/>"
        f"Phone: {profile['phone']}  |  Email: {profile['email']}",
        s["body"]
    )
    elems.append(sender_para)
    elems.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    elems.append(Spacer(1, 0.1*inch))

    for bureau in ["TransUnion LLC", "Experian Information Solutions, Inc.", "Equifax Information Services LLC"]:
        elems.append(Paragraph(f"COMPLAINT AGAINST: {bureau}", s["h2"]))
        elems.append(Paragraph(
            f"<b>Product:</b> Credit reporting, credit repair services, or other personal consumer reports<br/>"
            f"<b>Issue:</b> Incorrect information on your report<br/>"
            f"<b>FICO Score on File (approx.):</b> {profile['fico']}",
            s["body"]
        ))
        elems.append(Paragraph("Complaint Narrative:", s["h3"]))
        elems.append(Paragraph(
            f"I am filing this complaint against {bureau} for reporting inaccurate, unverifiable, and/or "
            f"obsolete information on my consumer credit file and for failing to conduct a proper "
            f"reinvestigation of disputed items as required by the Fair Credit Reporting Act (FCRA), "
            f"15 U.S.C. § 1681 et seq. I submitted formal written disputes via Certified Mail on {TODAY} "
            f"disputing the following items:", s["body"]
        ))
        elems.append(dispute_items_table(items, s))
        elems.append(Paragraph(
            "I demand that the CFPB require this company to: (1) conduct a proper reinvestigation, "
            "(2) delete all unverifiable or inaccurate items, and (3) provide written confirmation of corrections.",
            s["body"]
        ))
        elems.append(Spacer(1, 0.15*inch))
        elems.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
        elems.append(Spacer(1, 0.1*inch))

    elems += signature_block(profile, s)
    elems.append(Spacer(1, 0.2*inch))

    instructions = [
        "Go to consumerfinance.gov/complaint and create a free account",
        "Select 'Credit reporting' as the Product",
        "Paste the complaint narrative above into the description field",
        "Attach your dispute letter and any bureau responses as supporting documents",
        "Submit — you'll receive a confirmation email with a complaint number",
        "The bureau has 15 days to respond; CFPB may extend to 60 days for complex cases",
        "Also call CFPB at 1-855-411-2372 if you prefer phone",
    ]
    elems.append(Paragraph("HOW TO FILE THIS COMPLAINT", s["h2"]))
    for i, inst in enumerate(instructions, 1):
        elems.append(Paragraph(f"{i}. {inst}", s["bullet"]))

    return elems


def build_debt_validation_letter(profile, collectors, s):
    elems = []

    for collector in collectors:
        elems.append(title_banner(
            "DEBT VALIDATION DEMAND",
            f"Fair Debt Collection Practices Act § 809  |  {TODAY}",
            s
        ))
        elems.append(Spacer(1, 0.15*inch))
        elems.append(header_table(
            collector.get("name", "[COLLECTION AGENCY]"),
            collector.get("address", "[ADDRESS]"),
            profile, s
        ))
        elems.append(Spacer(1, 0.1*inch))

        elems.append(Paragraph(
            f"RE: Debt Validation Request — Account #{collector.get('acct','XXXX')} | "
            f"Alleged Amount: ${collector.get('amount','0')} | "
            f"Original Creditor: {collector.get('original_creditor','[NAME]')}",
            s["h2"]
        ))
        elems.append(HRFlowable(width="100%", thickness=1, color=GOLD))

        elems.append(Paragraph(
            "Pursuant to my rights under the <b>Fair Debt Collection Practices Act (FDCPA), "
            "15 U.S.C. § 1692g(b) (Section 809(b))</b>, I am formally requesting complete validation "
            "of the above-referenced alleged debt before any further collection activity is taken. "
            "<b>This is not a refusal to pay — this is a demand for verification.</b>", s["body"]
        ))

        elems.append(Paragraph("WHAT YOU MUST PROVIDE", s["h2"]))
        demands = [
            "Complete account history showing how the alleged balance was calculated",
            "A copy of the original signed contract or agreement with the original creditor",
            "Proof your company is licensed to collect debts in this state (license number)",
            "Chain of title — all assignment agreements showing ownership of this debt",
            "The name and address of the original creditor",
            "The Date of First Delinquency with the original creditor",
            "A copy of the last billing statement from the original creditor",
        ]
        for d in demands:
            elems.append(Paragraph(f"• {d}", s["bullet"]))

        elems.append(Paragraph("CEASE COLLECTION ACTIVITY", s["h2"]))
        elems.append(Paragraph(
            "Until validation is provided: <b>DO NOT</b> contact me by any means other than to provide validation. "
            "<b>DO NOT</b> report, update, or continue reporting this account to any credit bureau. "
            "<b>DO NOT</b> sell, transfer, or assign this debt. Continued collection activity before validation "
            "is a violation of <b>FDCPA § 809(b)</b> and subjects your agency to statutory damages up to "
            "<b>$1,000 per violation</b> plus attorney fees under <b>FDCPA § 813</b>.", s["body"]
        ))

        elems += signature_block(profile, s)
        elems.append(PageBreak())

    return elems


# ─── Tracker ─────────────────────────────────────────────────────────────────

def build_tracker(profile, items, s):
    elems = []
    elems.append(title_banner(
        "CREDIT DISPUTE TRACKER",
        f"Master Log — {profile['name']}  |  Starting FICO: {profile['fico']}  |  {TODAY}",
        s
    ))
    elems.append(Spacer(1, 0.2*inch))

    elems.append(Paragraph("BUREAU DISPUTE LOG", s["h2"]))
    headers = ["Bureau", "Sent Date", "Certified #", "30-Day Deadline", "Response", "Outcome"]
    rows = [headers]
    for bureau in ["TransUnion", "Experian", "Equifax"]:
        rows.append([bureau, "", "", "", "", ""])
    t = Table(rows, colWidths=[1.2*inch, 1*inch, 1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
    ]))
    elems.append(t)
    elems.append(Spacer(1, 0.2*inch))

    elems.append(Paragraph("DISPUTED ITEM OUTCOME TRACKER", s["h2"]))
    item_headers = ["#", "Creditor", "Bureau", "Filed", "Result", "Score Impact", "Notes"]
    item_rows = [item_headers]
    for i, it in enumerate(items, 1):
        item_rows.append([str(i), it.get("creditor",""), "All 3", "", "Pending", "", ""])
    t2 = Table(item_rows, colWidths=[0.3*inch, 1.4*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.9*inch, 1.6*inch])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
    ]))
    elems.append(t2)
    elems.append(Spacer(1, 0.2*inch))

    elems.append(Paragraph("SCORE PROGRESS LOG", s["h2"]))
    score_rows = [["Date", "Score", "Bureau", "What Changed", "Action Taken"]]
    score_rows.append([TODAY, profile["fico"], "FICO 8", "Baseline", "Dispute letters sent"])
    for _ in range(8):
        score_rows.append(["", "", "", "", ""])
    t3 = Table(score_rows, colWidths=[1*inch, 0.7*inch, 1*inch, 2.5*inch, 2.4*inch])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
    ]))
    elems.append(t3)
    elems.append(Spacer(1, 0.2*inch))

    elems.append(Paragraph("CFPB COMPLAINT LOG", s["h2"]))
    cfpb_rows = [["Bureau", "Filed Date", "Complaint #", "Status", "Resolution"]]
    for bureau in ["TransUnion", "Experian", "Equifax"]:
        cfpb_rows.append([bureau, "", "", "Not Filed", ""])
    t4 = Table(cfpb_rows, colWidths=[1.2*inch, 1*inch, 1.5*inch, 1.5*inch, 2.4*inch])
    t4.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
    ]))
    elems.append(t4)

    return elems


# ─── Input collection ─────────────────────────────────────────────────────────

def collect_profile():
    print("\n\033[1;34m=== PERSONAL INFORMATION ===\033[0m")
    profile = {}
    profile["name"]    = questionary.text("Full legal name:").ask()
    profile["address"] = questionary.text("Street address:").ask()
    profile["city"]    = questionary.text("City:").ask()
    profile["state"]   = questionary.text("State (2-letter):").ask().upper()
    profile["zip"]     = questionary.text("ZIP code:").ask()
    profile["phone"]   = questionary.text("Phone number:").ask()
    profile["email"]   = questionary.text("Email address:").ask()
    profile["dob"]     = questionary.text("Date of birth (MM/DD/YYYY):").ask()
    profile["fico"]    = questionary.text("Current FICO score (563 if unknown):").ask() or "563"
    return profile


def collect_items():
    items = []
    print("\n\033[1;34m=== DISPUTED ITEMS ===\033[0m")
    print("Enter each negative item on your credit report. Press Enter with empty creditor name when done.\n")

    basis_choices = [
        "Inaccurate Balance",
        "Not My Account",
        "Duplicate Entry",
        "Paid / Settled — still showing balance",
        "Obsolete — past 7-year reporting window",
        "Incorrect Date of First Delinquency",
        "Incorrect Account Status",
        "Unauthorized Hard Inquiry",
        "Re-aged Collection",
        "Identity Theft / Fraud",
    ]

    while True:
        creditor = questionary.text(f"Item #{len(items)+1} — Creditor/Agency name (or press Enter to finish):").ask()
        if not creditor:
            break
        item = {"creditor": creditor}
        item["acct"]    = questionary.text("  Account # (last 4 digits):").ask() or "XXXX"
        item["balance"] = questionary.text("  Reported balance ($):").ask() or "0"
        item["basis"]   = questionary.select("  Basis for dispute:", choices=basis_choices).ask()
        item["relief"]  = questionary.select("  Relief requested:", choices=["Delete", "Correct Balance", "Remove Late Payments", "Remove Inquiry"]).ask()
        items.append(item)

    return items


def collect_collectors():
    collectors = []
    print("\n\033[1;34m=== COLLECTION AGENCIES (for Debt Validation Letters) ===\033[0m")
    print("Enter each collection agency. Press Enter with empty name to skip.\n")

    while True:
        name = questionary.text(f"Collector #{len(collectors)+1} — Agency name (or Enter to skip):").ask()
        if not name:
            break
        c = {"name": name}
        c["address"]          = questionary.text("  Mailing address:").ask()
        c["acct"]             = questionary.text("  Account # (last 4):").ask() or "XXXX"
        c["amount"]           = questionary.text("  Alleged amount ($):").ask() or "0"
        c["original_creditor"]= questionary.text("  Original creditor name:").ask()
        collectors.append(c)

    return collectors


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("\n\033[1;32m╔══════════════════════════════════════════════════════╗\033[0m")
    print("\033[1;32m║   CREDIT REPAIR LETTER GENERATOR — FCRA/FDCPA Suite  ║\033[0m")
    print("\033[1;32m╚══════════════════════════════════════════════════════╝\033[0m")
    print("This tool generates print-ready PDF dispute letters for all 3 bureaus,")
    print("CFPB complaint templates, debt validation letters, and a dispute tracker.\n")

    profile    = collect_profile()
    items      = collect_items()
    collectors = collect_collectors()

    s = styles()

    bureaus = [
        ("TransUnion LLC",                    "Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016",        "dispute.transunion.com",         ["FCRA § 611(a)(7) — Right to description of investigation results"]),
        ("Experian Information Solutions",    "P.O. Box 4500\nAllen, TX 75013",                                   "experian.com/disputes",          ["Metro 2 compliance required per CDIA reporting standards"]),
        ("Equifax Information Services LLC",  "P.O. Box 740256\nAtlanta, GA 30374-0256",                          "equifax.com/personal/disputes",  ["FCRA § 605(c) — 7-year period runs from date of commencement of delinquency", "Re-aging violations: FCRA § 623(a)(5) prohibits manipulation of DOFD"]),
    ]

    generated = []

    print("\n\033[1;33mGenerating PDFs...\033[0m")

    # Bureau dispute letters
    for bureau_name, bureau_addr, bureau_url, extra in bureaus:
        safe_name = bureau_name.split()[0].lower()
        out_path  = OUTPUT_DIR / f"{safe_name}_dispute_{TODAY_ISO}.pdf"
        doc = SimpleDocTemplate(str(out_path), pagesize=letter,
                                leftMargin=0.75*inch, rightMargin=0.75*inch,
                                topMargin=0.75*inch, bottomMargin=0.75*inch)
        doc.build(build_bureau_letter(profile, bureau_name, bureau_addr, bureau_url, items, extra, s))
        generated.append(out_path)
        print(f"  ✓  {out_path.name}")

    # CFPB complaint
    cfpb_path = OUTPUT_DIR / f"cfpb_complaint_{TODAY_ISO}.pdf"
    doc = SimpleDocTemplate(str(cfpb_path), pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    doc.build(build_cfpb_letter(profile, items, s))
    generated.append(cfpb_path)
    print(f"  ✓  {cfpb_path.name}")

    # Debt validation letters
    if collectors:
        dv_path = OUTPUT_DIR / f"debt_validation_{TODAY_ISO}.pdf"
        doc = SimpleDocTemplate(str(dv_path), pagesize=letter,
                                leftMargin=0.75*inch, rightMargin=0.75*inch,
                                topMargin=0.75*inch, bottomMargin=0.75*inch)
        doc.build(build_debt_validation_letter(profile, collectors, s))
        generated.append(dv_path)
        print(f"  ✓  {dv_path.name}")

    # Dispute tracker
    tracker_path = OUTPUT_DIR / f"dispute_tracker_{TODAY_ISO}.pdf"
    doc = SimpleDocTemplate(str(tracker_path), pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    doc.build(build_tracker(profile, items, s))
    generated.append(tracker_path)
    print(f"  ✓  {tracker_path.name}")

    # Save profile + items as JSON for reuse
    data_path = OUTPUT_DIR / f"session_data_{TODAY_ISO}.json"
    with open(data_path, "w") as f:
        json.dump({"profile": profile, "items": items, "collectors": collectors}, f, indent=2)
    print(f"  ✓  {data_path.name}  (session data saved — reuse next time)")

    print(f"\n\033[1;32m✅ {len(generated)} PDFs generated in: {OUTPUT_DIR}\033[0m")
    print("\n\033[1;33mNEXT STEPS:\033[0m")
    print("  1. Print each bureau letter + sign it")
    print("  2. Gather enclosures: ID, SSN card, proof of address, supporting docs")
    print("  3. Send via Certified Mail, Return Receipt Requested — keep tracking numbers")
    print("  4. File CFPB complaints at consumerfinance.gov/complaint")
    print("  5. Update your dispute tracker as responses come in")
    print("  6. If no response in 30 days → file CFPB complaint immediately\n")


if __name__ == "__main__":
    main()

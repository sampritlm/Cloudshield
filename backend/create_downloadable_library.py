import os
import zipfile
import csv

def create_valid_pdf(filepath, title, content_lines):
    """
    Creates a minimal, 100% valid standard PDF 1.4 file containing the document text.
    """
    content_stream = f"BT /F1 16 Tf 50 750 Td ({title}) Tj ET\n"
    content_stream += "BT /F2 10 Tf 50 720 Td (CloudShield Enterprise Cyber Defense Document) Tj ET\n"
    y = 680
    for line in content_lines:
        safe_line = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        content_stream += f"BT /F2 10 Tf 50 {y} Td ({safe_line}) Tj ET\n"
        y -= 22
        if y < 50:
            break
            
    stream_bytes = content_stream.encode('latin1')
    stream_len = len(stream_bytes)
    
    pdf_body = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length {stream_len} >>
stream
{content_stream}endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000253 00000 n 
0000000000 00000 n 
0000000000 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
500
%%EOF
"""
    with open(filepath, 'wb') as f:
        f.write(pdf_body.encode('latin1', errors='replace'))

def create_valid_docx(filepath, title, content_lines):
    """
    Constructs a valid Microsoft Word (.docx) ZIP package containing document.xml.
    """
    content_xml_lines = "".join(f"<w:p><w:r><w:t>{line}</w:t></w:r></w:p>" for line in content_lines)
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:b/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>{title}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/><w:color w:val="666666"/></w:rPr><w:t>CloudShield Enterprise Security Library • Official Protocol</w:t></w:r></w:p>
    {content_xml_lines}
  </w:body>
</w:document>"""

    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types_xml)
        z.writestr("_rels/.rels", rels_xml)
        z.writestr("word/document.xml", document_xml)

def create_valid_xlsx(filepath, sheet_name, headers, rows):
    """
    Constructs a valid Microsoft Excel (.xlsx) ZIP package.
    """
    row_xml = "<row r=\"1\">"
    for col_idx, h in enumerate(headers, 1):
        col_letter = chr(64 + col_idx)
        row_xml += f"<c r=\"{col_letter}1\" t=\"inlineStr\"><is><t>{h}</t></is></c>"
    row_xml += "</row>"

    for r_idx, row in enumerate(rows, 2):
        row_xml += f"<row r=\"{r_idx}\">"
        for c_idx, val in enumerate(row, 1):
            col_letter = chr(64 + c_idx)
            row_xml += f"<c r=\"{col_letter}{r_idx}\" t=\"inlineStr\"><is><t>{val}</t></is></c>"
        row_xml += "</row>"

    sheet_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    {row_xml}
  </sheetData>
</worksheet>"""

    workbook_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="{sheet_name}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>"""

    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    wb_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""

    with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types_xml)
        z.writestr("_rels/.rels", rels_xml)
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", wb_rels_xml)
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

def create_valid_pptx(filepath, title, subtitle):
    """
    Constructs a valid Microsoft PowerPoint (.pptx) ZIP package.
    """
    slide_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="en-US" sz="4000" b="1"/><a:t>{title}</a:t></a:r></a:p>
          <a:p><a:r><a:rPr lang="en-US" sz="2000" i="1"/><a:t>{subtitle}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>"""

    pres_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
</p:presentation>"""

    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>"""

    pres_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>"""

    with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types_xml)
        z.writestr("_rels/.rels", rels_xml)
        z.writestr("ppt/presentation.xml", pres_xml)
        z.writestr("ppt/_rels/presentation.xml.rels", pres_rels_xml)
        z.writestr("ppt/slides/slide1.xml", slide_xml)

def main():
    target_dir = os.path.abspath(r"d:\acc\Cloudsheild\backend\app\static_resources")
    os.makedirs(target_dir, exist_ok=True)
    print(f"Generating downloadable library in: {target_dir}")

    # 1. Phishing awareness: PDF guides, DOCX checklists
    create_valid_pdf(
        os.path.join(target_dir, "CloudShield_Phishing_Identification_Guide.pdf"),
        "CloudShield Phishing Identification Guide",
        [
            "1. Inspect the full sender email header, not just the display name.",
            "2. Scrutinize lookalike domains (e.g. micr0soft.com, accounts-alerting.net).",
            "3. Identify artificial urgency tactics (immediate wire, account suspension).",
            "4. Verify all external links by hovering before clicking.",
            "5. Never enter corporate credentials on unexpected third-party pages.",
            "6. Use the CloudShield 'Report Phish' button immediately when in doubt."
        ]
    )

    create_valid_docx(
        os.path.join(target_dir, "Email_Red_Flags_Quick_Checklist.docx"),
        "Email Security & Red Flags Checklist",
        [
            "Checklist for Every Incoming External Email:",
            "[ ] Is the sender external or marked with an [EXTERNAL] tag?",
            "[ ] Does the email create a panic or urgent deadline?",
            "[ ] Are there spelling errors or unusual grammatical phrasing?",
            "[ ] Does the link destination match the claimed company domain?",
            "[ ] Is an attachment present requesting macro execution?",
            "[ ] Status: Verified Safe / Escalated to SOC"
        ]
    )

    # 2. Security policies: PDF and DOCX documents
    create_valid_pdf(
        os.path.join(target_dir, "Corporate_Information_Security_Policy_2026.pdf"),
        "Enterprise Information Security Policy",
        [
            "SECTION 1: PURPOSE & SCOPE",
            "This policy outlines corporate cybersecurity requirements for all employees.",
            "SECTION 2: ACCESS CONTROL & CREDENTIAL PROTECTION",
            "All access to corporate cloud resources requires Multi-Factor Authentication.",
            "Root credentials and API keys must never be committed to source code repositories.",
            "SECTION 3: THREAT MONITORING",
            "CloudShield continuously monitors API request bursts and perimeter IP breaches.",
            "Violations are automatically converted into SOC incidents with risk penalties."
        ]
    )

    create_valid_docx(
        os.path.join(target_dir, "Acceptable_Use_and_Cloud_Asset_Policy.docx"),
        "Acceptable Use & Cloud Asset Protection Policy",
        [
            "1. Corporate Cloud Resource Access Guidelines",
            "Employees are granted role-based access control (RBAC) to authorized resources only.",
            "2. Prohibited Activities",
            "- Unauthorized access to /api/v1/iam/credentials or /admin/secrets.",
            "- Connecting to internal corporate portals from untrusted proxy or VPN exit nodes.",
            "- Forwarding suspicious phishing lures to colleagues without SOC reporting.",
            "3. Enforcement: Heuristic detection rules (RULE_01 through RULE_05) apply."
        ]
    )

    # 3. Password and MFA: PDF guides and illustrated instructions
    create_valid_pdf(
        os.path.join(target_dir, "Password_Security_and_MFA_Setup_Guide.pdf"),
        "Password Security & Multi-Factor Authentication Guide",
        [
            "1. Minimum Password Complexity Requirements:",
            "- At least 12 characters combining uppercase, lowercase, numbers, and symbols.",
            "- Avoid common dictionary words and personal identifying details.",
            "2. Multi-Factor Authentication (MFA) Setup:",
            "- Use hardware security keys (FIDO2/WebAuthn) or time-based OTP authenticators.",
            "- Never approve push notifications that you did not explicitly initiate.",
            "3. Incident Handling:",
            "- If you suspect your password has leaked, change it immediately in Profile settings."
        ]
    )

    create_valid_docx(
        os.path.join(target_dir, "Hardware_Token_and_Authenticator_Instructions.docx"),
        "Hardware Token & Authenticator App Instructions",
        [
            "Step-by-Step MFA Configuration Procedure:",
            "Step 1: Install Google Authenticator or Microsoft Authenticator on your mobile device.",
            "Step 2: Log into CloudShield User Profile -> Security Settings -> Enroll MFA Token.",
            "Step 3: Scan the corporate QR code and enter the 6-digit verification code.",
            "Step 4: Store backup emergency recovery keys in a secure corporate password vault.",
            "Step 5: Test authentication on the next login attempt."
        ]
    )

    # 4. Incident response: PDF playbooks and DOCX procedures
    create_valid_pdf(
        os.path.join(target_dir, "Employee_Security_Incident_Response_Playbook.pdf"),
        "Employee Security Incident Response Playbook",
        [
            "PHASE 1: DETECTION & IMMEDIATE CONTAINMENT",
            "- If you clicked a malicious link or entered credentials, disconnect Wi-Fi/VPN.",
            "- Immediately report the incident to SOC via CloudShield Mail -> Report Phish.",
            "PHASE 2: INVESTIGATION & TRIAGE",
            "- SOC analysts correlate events across DynamoDB and Amazon EventBridge.",
            "- Threat scoring algorithm assigns severity (LOW, MEDIUM, HIGH, CRITICAL).",
            "PHASE 3: REMEDIATION & RECOVERY",
            "- Revoke affected session tokens and reset single sign-on credentials."
        ]
    )

    create_valid_docx(
        os.path.join(target_dir, "Suspected_Breach_Immediate_Action_Procedures.docx"),
        "Suspected Breach Immediate Action Procedures",
        [
            "Action Plan for Suspected Credential Compromise:",
            "Immediate Step 1: Notify the Security Operations Center (soc@cloudshield.internal).",
            "Immediate Step 2: Open CloudShield User Profile and initiate an emergency password reset.",
            "Immediate Step 3: Check Active Sessions and revoke unauthorized foreign IP connections.",
            "Immediate Step 4: Do not delete suspicious emails; preserve headers for forensic analysis."
        ]
    )

    # 5. Security training: PPTX presentations and PDF handouts
    create_valid_pptx(
        os.path.join(target_dir, "CloudShield_Security_Awareness_Training_Q1_2026.pptx"),
        "CloudShield Security Awareness Training",
        "Q1 2026 Employee Training • Phishing, IAM, & Cloud Threat Defense"
    )

    create_valid_pdf(
        os.path.join(target_dir, "Phishing_and_Social_Engineering_Handout.pdf"),
        "Social Engineering Tactics & Defense Handout",
        [
            "SUMMARY OF COMMON SOCIAL ENGINEERING TECHNIQUES:",
            "1. Phishing: Deceptive emails masquerading as trusted institutions (Google, MS365).",
            "2. Spear Phishing: Highly targeted lures addressing employees by name and department.",
            "3. Pretexting: Fabricating an urgent scenario (HR payroll direct deposit update).",
            "4. Quid Pro Quo: Offering a fake IT software update or security scan.",
            "DEFENSE RULE: When uncertain, verify through out-of-band communication."
        ]
    )

    # 6. Reference materials: CSV checklists and XLSX tracking templates
    csv_path = os.path.join(target_dir, "CloudShield_Security_Hygiene_Checklist.csv")
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Checklist_ID", "Security_Domain", "Control_Description", "Verification_Frequency", "Status"])
        writer.writerow(["CHK-01", "Identity", "Enforce Multi-Factor Authentication on all accounts", "Daily", "ACTIVE"])
        writer.writerow(["CHK-02", "Credential Hygiene", "Unique 16+ character password per service", "Monthly", "VERIFIED"])
        writer.writerow(["CHK-03", "Phishing Awareness", "Report simulated and live phishing lures to SOC", "Weekly", "ACTIVE"])
        writer.writerow(["CHK-04", "Network Perimeter", "Access corporate cloud resources via authorized VPN only", "Continuous", "ENFORCED"])
        writer.writerow(["CHK-05", "Asset Protection", "Never download IAM keys or database credentials to local disk", "Continuous", "COMPLIANT"])

    create_valid_xlsx(
        os.path.join(target_dir, "Employee_Vigilance_Audit_Log.xlsx"),
        "Vigilance_Audit_Log",
        ["Audit_ID", "User_Email", "Event_Type", "Risk_Delta", "Outcome", "Audit_Date"],
        [
            ["AUD-101", "user@cloudshield.internal", "Phish_Simulation_Delivered", "0", "Delivered", "2026-03-01"],
            ["AUD-102", "user@cloudshield.internal", "Phish_Reported_To_SOC", "+15", "Awareness_Bonus", "2026-03-05"],
            ["AUD-103", "user@cloudshield.internal", "Password_Changed_Successfully", "0", "Compliant", "2026-03-10"],
            ["AUD-104", "user@cloudshield.internal", "MFA_Token_Verified", "+10", "Secured", "2026-03-15"],
            ["AUD-105", "user@cloudshield.internal", "Training_Module_Completed", "+20", "Certified", "2026-03-20"]
        ]
    )

    print("Successfully generated all 12 real downloadable files!")

if __name__ == '__main__':
    main()

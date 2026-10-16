# CloudShield — Intelligent Cloud Security Monitoring and Automated Threat Detection System

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com)
[![AWS](https://img.shields.io/badge/AWS-EventBridge%20%7C%20DynamoDB%20%7C%20SQS%20%7C%20SNS-orange.svg)](https://aws.amazon.com)
[![Evaluation](https://img.shields.io/badge/Evaluation-30--Mark%20College%20Seminar-purple.svg)](#seminar-presentation-guide)

**CloudShield** is an enterprise-grade cloud security monitoring and automated incident detection application built for Advanced Cloud Computing academic evaluation. It analyzes continuous security events, executes rule-based correlation, assigns risk scores (0–100), creates incidents, and dispatches automated alerts for high-risk threats.

The system features dual-mode execution:
1. **Local Development / Simulation Mode**: 100% offline demonstration without AWS credentials or cloud billing risks.
2. **AWS Cloud-Native Mode**: Leverages Amazon EC2, Amazon DynamoDB, Amazon EventBridge, AWS Lambda, Amazon SQS, Amazon SNS, and Amazon S3.

---

## 1. System Architecture

```
                      +---------------------------------------+
                      |       Threat Simulator / Client       |
                      +---------------------------------------+
                                          |
                                          v (HTTP / REST)
                      +---------------------------------------+
                      |         Amazon EC2 Instance           |
                      |   - FastAPI Backend (Port 8000)       |
                      |   - React Vite Web App (Port 5173)    |
                      +---------------------------------------+
                                          |
                         +----------------+----------------+
                         |                                 |
                         v                                 v
              +----------------------+          +----------------------+
              |   Amazon DynamoDB    |          |  Amazon EventBridge  |
              | (Events & Incidents) |          |   (Custom Event Bus) |
              +----------------------+          +----------------------+
                                                           |
                                                           v
                                                +----------------------+
                                                |      AWS Lambda      |
                                                | (Threat Evaluator)   |
                                                +----------------------+
                                                           |
                                                           v (High/Critical)
                                                +----------------------+
                                                |      Amazon SQS      |
                                                |  (Incident Priority) |
                                                +----------------------+
                                                           |
                                                           v (Consumer Worker)
                                                +----------------------+
                                                |      Amazon SNS      |
                                                |  (Admin Alert Topic) |
                                                +----------------------+
                                                           |
                                                           v
                                                +----------------------+
                                                |  Security Dashboard  |
                                                |  (Admin / Analyst)   |
                                                +----------------------+
```

### Event Ingestion Pipeline:
1. **Threat Ingestion**: Ingests telemetry via REST API (`POST /api/events` or `/api/simulator/generate`).
2. **Rule-Based Detection Engine**: Correlates events over configurable time windows and evaluates indicators.
3. **Event Routing**: Explicitly dispatches ingested events to Amazon EventBridge (`cloudshield-event-bus`).
4. **Incident Creation & Idempotency**: Threat scores above 30 generate an incident record. Re-processing identical events checks event IDs to prevent duplicate incidents.
5. **Priority Queue & Notification**: High and Critical incidents are enqueued in Amazon SQS and published to Amazon SNS.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript 5.5, Vite 5, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python 3.13, FastAPI, Pydantic V2, Uvicorn, Pytest.
- **Authentication**: JWT (JSON Web Tokens), BCrypt password hashing, Role-Based Access Control (Admin, Analyst, User).
- **Database**:
  - *Local Mode*: SQLite database with indexed tables and atomic transactions.
  - *AWS Mode*: Amazon DynamoDB (`cloudshield-security-events`, `cloudshield-security-incidents`).
- **AWS Integrations**: Boto3 SDK for EventBridge, SQS, SNS, S3, and CloudWatch.

---

## 3. Project Directory Structure

```
Cloudshield/
├── backend/
│   ├── app/
│   │   ├── config.py              # Environment configuration & rule thresholds
│   │   ├── auth.py                # BCrypt auth, JWT generation & RBAC dependencies
│   │   ├── main.py                # FastAPI ASGI application & routers
│   │   ├── seed_data.py           # Synthetic demonstration data seeder
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic schemas (Events, Incidents, Reports)
│   │   ├── engine/
│   │   │   ├── rules.py           # Threat rule definitions & categories
│   │   │   └── detector.py        # Rule-based threat engine & risk score calculation
│   │   ├── storage/
│   │   │   ├── base.py            # Storage abstraction interface
│   │   │   ├── local_db.py        # Local SQLite storage engine
│   │   │   └── dynamodb.py        # Amazon DynamoDB Boto3 storage adapter
│   │   ├── aws/
│   │   │   ├── client_factory.py  # Safe boto3 client initialization
│   │   │   ├── eventbridge.py     # Explicit EventBridge event publishing
│   │   │   ├── sqs_handler.py     # SQS enqueue & dedicated consumer worker
│   │   │   ├── sns_handler.py     # SNS urgent alert publisher
│   │   │   └── s3_handler.py      # S3 report upload handler
│   │   └── routers/
│   │       ├── auth.py            # Login & profile endpoints
│   │       ├── dashboard.py       # Metrics, time series, and distributions
│   │       ├── events.py          # Paginated security events & ingestion
│   │       ├── incidents.py       # Incident triage & status progression
│   │       ├── simulator.py       # Safe threat generation engine
│   │       ├── reports.py         # Audit report compiler & CSV export
│   │       └── system.py          # Pipeline health & SQS worker triggers
│   ├── tests/
│   │   ├── test_detection_engine.py  # Threat scenario & risk score tests
│   │   ├── test_incidents.py         # Incident lifecycle & idempotency tests
│   │   ├── test_auth.py              # BCrypt & JWT authentication tests
│   │   └── test_api_scenarios.py     # End-to-end API scenario tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/            # Badges, modals, Navbar, Sidebar
│   │   ├── context/               # AuthContext (user, role, token)
│   │   ├── pages/
│   │   │   ├── Login.tsx          # CloudShield login page
│   │   │   ├── Dashboard.tsx      # Metrics, charts, and activity feeds
│   │   │   ├── ThreatSimulator.tsx# 5 interactive scenario generators
│   │   │   ├── SecurityEvents.tsx # Search, filter, pagination, details
│   │   │   ├── IncidentManagement.tsx # Status transitions (Open->Resolved)
│   │   │   ├── Reports.tsx        # Compliance reports & printable view
│   │   │   └── SystemMonitoring.tsx # Health diagnostics & AWS status
│   │   └── services/api.ts        # Typed API service client
│   ├── package.json
│   └── vite.config.ts
├── aws/
│   ├── cloudformation-template.yaml # Complete AWS infrastructure template
│   ├── lambda_detector.py           # Serverless rule evaluator function
│   └── deployment_guide.md          # Step-by-step EC2/AWS production guide
├── run_dev.bat                      # 1-click launcher for Windows
├── run_dev.ps1                      # PowerShell startup script
└── README.md
```

---

## 4. Local Installation & Quick Start

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node 20 / Node 25)

### Option A: One-Click Startup (Windows)
Double-click `run_dev.bat` or run:
```powershell
.\run_dev.bat
```
This automatically starts both the FastAPI backend on `http://127.0.0.1:8000` and the Vite frontend on `http://localhost:5173`.

### Option B: Manual Startup

**1. Setup Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**2. Setup Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 5. Seminar Demonstration Accounts

The system provides 3 pre-configured demo roles with hashed credentials:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@cloudshield.internal` | `Admin@CloudShield2026!` | Full access, status triage, system resets |
| **SOC Analyst** | `analyst@cloudshield.internal` | `Analyst@CloudShield2026!` | Triage incidents, run simulations, export reports |
| **Normal User** | `user@cloudshield.internal` | `User@CloudShield2026!` | Read-only view (status changes disabled) |

*(Quick-fill buttons on the login page allow single-click login for evaluation).*

---

## 6. Threat Detection Scenarios & Expected Results

Navigate to the **Threat Simulator** tab to test all 5 security scenarios:

### Scenario 1: Repeated Failed Login (Brute Force)
- **Description**: 5 failed login attempts for `test.victim@corp.internal` within the 300s window.
- **Triggered Rules**: `RULE_01_FAILED_LOGIN` (+40 pts), `RULE_02_UNUSUAL_IP` (+25 pts).
- **Expected Score**: **65 / 100** (Severity: **HIGH**).
- **Incident Action**: Incident generated, queued in SQS, and alert sent via SNS.

### Scenario 2: Unusual IP Address
- **Description**: API request originating from untrusted IP `203.0.113.89`.
- **Triggered Rules**: `RULE_02_UNUSUAL_IP` (+25 pts).
- **Expected Score**: **25 / 100** (Severity: **LOW**).
- **Incident Action**: Logged for correlation; does not meet the >30 incident threshold.

### Scenario 3: Unauthorized Resource Access
- **Description**: Access attempt targeting restricted asset `/api/v1/iam/credentials`.
- **Triggered Rules**: `RULE_03_UNAUTHORIZED_RESOURCE` (+45 pts).
- **Expected Score**: **45 / 100** (Severity: **MEDIUM**).
- **Incident Action**: Incident generated in `OPEN` status.

### Scenario 4: High Request Frequency Burst
- **Description**: Sudden burst of 35 requests within 60 seconds (threshold: 20 reqs).
- **Triggered Rules**: `RULE_04_REQUEST_BURST` (+35 pts), `RULE_02_UNUSUAL_IP` (+25 pts).
- **Expected Score**: **60 / 100** (Severity: **MEDIUM**).
- **Incident Action**: Incident generated; rate-limiting alert recorded.

### Scenario 5: Combined Suspicious Activity (Multi-Vector)
- **Description**: Foreign IP + repeated failed logins + restricted root secrets exfiltration (`/admin/secrets`).
- **Triggered Rules**: `RULE_01_FAILED_LOGIN` (+40), `RULE_02_UNUSUAL_IP` (+25), `RULE_03_UNAUTHORIZED_RESOURCE` (+45), plus `RULE_05_COMBINED_SUSPICIOUS` (+20).
- **Raw Points**: 130 pts.
- **Expected Score**: **100 / 100** (Capped at 100 max, Severity: **CRITICAL**).
- **Incident Action**: Emergency critical incident generated, SQS enqueued, high-priority SNS alert dispatched.

---

## 7. Running Backend Unit Tests

Run the test suite using pytest:
```powershell
.\backend\venv\Scripts\pytest.exe -v
```

**Test Coverage Highlights:**
- `test_severity_classification_boundaries`: Validates 0–30 Low, 31–60 Medium, 61–80 High, 81–100 Critical.
- `test_scenario_1_repeated_failed_login` through `test_scenario_5_combined_suspicious_activity_and_capping`: Confirms rules, weights, and capping.
- `test_incident_creation_and_status_transitions`: Confirms `OPEN` → `INVESTIGATING` → `RESOLVED` lifecycle and audit timestamps.
- `test_idempotent_duplicate_event_incident_protection`: Verifies that re-ingesting events does not duplicate incidents.
- `test_rbac_incident_status_update`: Verifies normal users receive 403 Forbidden when attempting triage.

---

## 8. AWS Cloud Deployment & Permissions

### Minimum Required IAM Permissions
The EC2 instance role requires:
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on the two CloudShield tables.
- `events:PutEvents` on `cloudshield-event-bus`.
- `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage` on `cloudshield-incident-queue`.
- `sns:Publish` on `cloudshield-alerts-topic`.
- `s3:PutObject`, `s3:GetObject` on `cloudshield-reports-*`.

### Cost Safety Checklist for Seminar Evaluations
- Keep `AWS_MODE=false` while practicing locally to prevent unnecessary AWS calls.
- In AWS mode, the DynamoDB tables use `PAY_PER_REQUEST` billing (no idle provisioned capacity cost).
- When deploying to EC2, use `t3.micro` or `t2.micro` within the AWS Free Tier.
- Delete the CloudFormation stack after grading to avoid ongoing charges.

---

## 9. Known Limitations
- The simulated IP whitelist is statically configured in `.env` (`TRUSTED_IPS`); dynamic CIDR calculation can be added in future iterations.
- In local development mode, SQS and SNS events are simulated in-process with full payload logging.
- Standalone AWS Lambda execution requires packaging `aws/lambda_detector.py` with the DynamoDB/SQS event rule mapping.
#   C l o u d s h i e l d  
 
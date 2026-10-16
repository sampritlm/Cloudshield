import urllib.request
import json

print("=== CloudShield Live Endpoint Verification ===")

# 1. Test root health
req = urllib.request.urlopen("http://127.0.0.1:8000/")
root_data = json.loads(req.read().decode())
print("1. Root API Status:", root_data["status"], "| Mode:", root_data["mode"])

# 2. Test Login
login_payload = json.dumps({
    "email": "admin@cloudshield.internal",
    "password": "Admin@CloudShield2026!"
}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req).read().decode())
token = resp["access_token"]
print("2. Authentication:", resp["user"]["name"], "| Role:", resp["user"]["role"])

# 3. Test Dashboard Summary
req = urllib.request.Request("http://127.0.0.1:8000/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
dash = json.loads(urllib.request.urlopen(req).read().decode())
print(f"3. Dashboard Telemetry: Total Events: {dash['total_events']} | Threats: {dash['detected_threats']} | Open Incidents: {dash['open_incidents']}")

# 4. Test Threat Simulator (Scenario 5 - Combined Suspicious Activity)
sim_payload = json.dumps({"scenario": "COMBINED_SUSPICIOUS"}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/simulator/generate", data=sim_payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
sim = json.loads(urllib.request.urlopen(req).read().decode())
print(f"4. Simulator Execution: {sim['scenario_title']} -> Score: {sim['risk_score']} ({sim['severity']}) | Incident Created: {sim['incident_id']}")

# 5. Test Reports Generation
report_payload = json.dumps({"title": "Live Seminar Audit Report"}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/reports/generate", data=report_payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
rep = json.loads(urllib.request.urlopen(req).read().decode())
print(f"5. Reports: Report ID {rep['report_id']} | Total Evaluated: {rep['total_events']} | Stored in S3: {rep['stored_in_s3']}")

# 6. Test Frontend Server
req = urllib.request.urlopen("http://localhost:5173/")
print("6. Frontend Vite Server: HTTP Status", req.status)

print("=== ALL LIVE ENDPOINTS OPERATIONAL! ===")

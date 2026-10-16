# CloudShield AWS Deployment Guide

This guide details the deployment of **CloudShield — Intelligent Cloud Security Monitoring & Automated Threat Detection System** to Amazon Web Services (AWS), designed for an Advanced Cloud Computing seminar evaluation.

---

## 1. Architectural Overview

```
                      +---------------------------------------+
                      |       Threat Simulator / Client       |
                      +---------------------------------------+
                                          |
                                          v (HTTP/REST)
                      +---------------------------------------+
                      |         Amazon EC2 Instance           |
                      |   - FastAPI Backend (Port 8000)       |
                      |   - Nginx Reverse Proxy (Port 80)     |
                      |   - React Vite Web App (Static Assets)|
                      +---------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
             +----------------------+            +----------------------+
             |   Amazon DynamoDB    |            |  Amazon EventBridge  |
             | - Events Table       |            |   (Custom Event Bus) |
             | - Incidents Table    |            +----------------------+
             +----------------------+                       |
                                                            v
                                                 +----------------------+
                                                 |      AWS Lambda      |
                                                 |  (Threat Evaluator)  |
                                                 +----------------------+
                                                            |
                                                            v (High/Critical)
                                                 +----------------------+
                                                 |      Amazon SQS      |
                                                 |   (Priority Queue)   |
                                                 +----------------------+
                                                            |
                                                            v (Consumer Worker)
                                                 +----------------------+
                                                 |      Amazon SNS      |
                                                 |   (Admin Alerts)     |
                                                 +----------------------+
                                                            |
                                                            v (Email/SMS)
                                                 +----------------------+
                                                 |  Security Dashboard  |
                                                 |     Administrator    |
                                                 +----------------------+
```

---

## 2. Infrastructure as Code (CloudFormation)

CloudShield includes a single-click CloudFormation template:
`aws/cloudformation-template.yaml`

To deploy via the AWS CLI:
```bash
aws cloudformation create-stack \
  --stack-name CloudShield-Production-Stack \
  --template-body file://aws/cloudformation-template.yaml \
  --parameters ParameterKey=AlertEmail,ParameterValue=your-admin-email@example.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

---

## 3. Manual EC2 Host Configuration

### Step 1: Launch EC2 Instance
- **AMI**: Amazon Linux 2023 or Ubuntu 22.04 LTS
- **Instance Type**: `t3.micro` or `t2.micro` (AWS Free Tier eligible)
- **IAM Instance Profile**: Attach `CloudShield-EC2-Host-Role` (from CloudFormation)
- **Security Group**: Allow TCP port 22 (SSH), port 80 (HTTP), and port 8000 (Backend API).

### Step 2: Install Runtime Dependencies
```bash
# Update packages
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm nginx git

# Clone repository
git clone <your-repo-url> /opt/cloudshield
cd /opt/cloudshield
```

### Step 3: Configure Environment Variables
Edit `/opt/cloudshield/backend/.env`:
```env
APP_NAME=CloudShield
APP_ENV=production
AWS_MODE=true
AWS_REGION=us-east-1

DYNAMODB_EVENTS_TABLE=cloudshield-security-events
DYNAMODB_INCIDENTS_TABLE=cloudshield-security-incidents
EVENTBRIDGE_BUS_NAME=cloudshield-event-bus
SQS_INCIDENT_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/<account-id>/cloudshield-incident-queue
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:<account-id>:cloudshield-alerts-topic
S3_REPORTS_BUCKET=cloudshield-reports-<account-id>-us-east-1
CLOUDWATCH_LOG_GROUP=/aws/cloudshield/security-monitoring
```

### Step 4: Setup Python Backend as Systemd Service
Create `/etc/systemd/system/cloudshield.service`:
```ini
[Unit]
Description=CloudShield Security Backend API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/cloudshield/backend
ExecStart=/opt/cloudshield/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudshield
```

### Step 5: Build Frontend & Configure Nginx
```bash
cd /opt/cloudshield/frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

Configure `/etc/nginx/sites-available/default` reverse proxy:
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Reload Nginx:
```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

## 4. AWS Free Tier Cost Precautions

1. **Amazon EC2**: Use `t2.micro` or `t3.micro` which provides 750 hours/month free for the first 12 months.
2. **Amazon DynamoDB**: Provisioned using `PAY_PER_REQUEST` billing mode, avoiding fixed provisioned read/write capacity charges. DynamoDB includes 25 GB free storage.
3. **AWS Lambda**: 1 million free invocations per month.
4. **Amazon SQS & SNS**: 1 million free requests per month.
5. **Amazon S3**: 5 GB standard storage included in Free Tier.
6. **Teardown**: Run `aws cloudformation delete-stack --stack-name CloudShield-Production-Stack` after seminar demonstration to guarantee zero recurring charges.

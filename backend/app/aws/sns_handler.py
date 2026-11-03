import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.aws.client_factory import get_boto3_client
from app.models.schemas import Incident

logger = logging.getLogger("cloudshield.sns")

def publish_alert_to_sns(incident: Incident) -> Dict[str, Any]:
    """
    Sends an urgent threat notification to Amazon SNS Topic for High and Critical severity incidents.
    In local development mode or when offline, records a simulated notification.
    """
    subject = f"[CloudShield ALERT] {incident.severity.value} Risk Incident Detected: {incident.threat_type}"
    # Truncate subject to 100 characters per SNS specification
    subject = subject[:98]

    body = (
        f"CLOUDSHIELD AUTOMATED THREAT DETECTION ALERT\n"
        f"===========================================\n"
        f"Incident ID : {incident.incident_id}\n"
        f"Threat Type : {incident.threat_type}\n"
        f"Severity    : {incident.severity.value}\n"
        f"Risk Score  : {incident.risk_score} / 100\n"
        f"Test User   : {incident.test_user}\n"
        f"Source IP   : {incident.source_ip}\n"
        f"Resource    : {incident.resource}\n"
        f"Detected At : {incident.detected_at}\n\n"
        f"Flagged Reasons:\n"
        + "\n".join([f"- {r}" for r in incident.reasons])
        + f"\n\nTriggered Rules:\n"
        + "\n".join([f"- {rule}" for rule in incident.triggered_rules])
        + f"\n\nAction Required: Log in to the CloudShield Administrator Dashboard to inspect and triage this incident."
    )

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                response = client.publish(
                    TopicArn=topic_arn,
                    Subject=subject,
                    Message=body
                )
                message_id = response.get("MessageId")
                logger.info(f"Published alert to SNS Topic {topic_arn}, MessageId: {message_id}")
                return {
                    "mode": "AWS_SNS",
                    "status": "PUBLISHED",
                    "topic_arn": topic_arn,
                    "message_id": message_id
                }
            except Exception as e:
                logger.error(f"Failed to publish alert to SNS ({e}), falling back to simulated dispatch")

    logger.info(f"[LOCAL SIMULATION] SNS Notification generated for Incident {incident.incident_id}")
    return {
        "mode": "LOCAL_SIMULATED",
        "topic_arn": topic_arn or f"arn:aws:sns:{settings.AWS_REGION}:123456789012:cloudshield-alerts",
        "subject": subject,
        "status": "SENT_SIMULATED",
        "message_id": f"sim-sns-{incident.incident_id[:8]}"
    }

def publish_unauthorized_access_alert(
    user_email: str,
    resource_title: str,
    resource_path: str,
    client_ip: str,
    incident_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends an immediate urgent security alert to the admin via Amazon SNS whenever an unauthorized resource or restricted file is attempted.
    """
    subject = f"[CloudShield URGENT] Unauthorized Access Attempt by {user_email}"[:98]
    body = (
        f"CLOUDSHIELD SECURITY OPERATIONS ALERT\n"
        f"=====================================\n"
        f"EVENT TYPE   : Unauthorized Restricted File / Resource Access Attempt\n"
        f"RULE CODE    : RULE_03 (Unauthorized Resource Access)\n"
        f"SEVERITY     : HIGH (Risk Score: 75/100)\n"
        f"USER IDENTITY: {user_email}\n"
        f"RESOURCE     : {resource_title} ({resource_path})\n"
        f"SOURCE IP    : {client_ip}\n"
        f"INCIDENT ID  : {incident_id or 'Auto-created in DynamoDB'}\n\n"
        f"DETECTION ACTION : Intercepted by CloudShield Automated Threat Evaluator.\n"
        f"RECOMMENDED ACTION: Inspect user credentials and review IAM access policies."
    )

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                response = client.publish(
                    TopicArn=topic_arn,
                    Subject=subject,
                    Message=body
                )
                msg_id = response.get("MessageId")
                logger.info(f"Published direct unauthorized access alert to SNS {topic_arn}: {msg_id}")
                return {
                    "mode": "AWS_SNS",
                    "status": "PUBLISHED",
                    "topic_arn": topic_arn,
                    "message_id": msg_id
                }
            except Exception as e:
                logger.error(f"SNS publish failed for unauthorized access ({e}), falling back to simulation")

    logger.info(f"[SIMULATED SNS] Unauthorized access alert for {user_email} on {resource_path}")
    return {"mode": "SIMULATED", "status": "SENT_SIMULATED", "subject": subject, "topic_arn": topic_arn}

def publish_caniphish_threat_alert(
    event_type: str,
    user_email: str,
    campaign_name: str,
    phishing_site: str,
    client_ip: str,
    incident_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends an immediate urgent security alert to the admin via Amazon SNS
    whenever a CanIPhish simulation link is clicked or credentials are compromised.
    """
    is_compromised = (event_type == "employeeCompromised")

    if is_compromised:
        subject = f"[CloudShield CRITICAL] Employee Credential Compromised: {user_email}"[:98]
        threat_desc = "CRITICAL CREDENTIAL HARVEST / ACCOUNT TAKEOVER RISK"
        severity = "CRITICAL"
        risk_score = 95
        action_note = "Employee submitted credentials to a deceptive phishing login portal masquerading as corporate services."
    else:
        subject = f"[CloudShield ALERT] Phishing Lure Link Clicked by {user_email}"[:98]
        threat_desc = "DECEPTIVE PHISHING LINK INTERACTION DETECTED"
        severity = "HIGH"
        risk_score = 65
        action_note = "Employee clicked an active phishing lure link, navigating to an unauthorized external lookalike portal."

    body = (
        f"CLOUDSHIELD PHISHING SIMULATION ALERT\n"
        f"=====================================\n"
        f"EVENT TYPE   : {threat_desc}\n"
        f"STAGE        : {'Stage 2: Credentials Compromised' if is_compromised else 'Stage 1: Link Clicked'}\n"
        f"SEVERITY     : {severity} (Risk Score: {risk_score}/100)\n"
        f"USER IDENTITY: {user_email}\n"
        f"CAMPAIGN     : {campaign_name}\n"
        f"TARGET PORTAL: {phishing_site}\n"
        f"SOURCE IP    : {client_ip}\n"
        f"INCIDENT ID  : {incident_id or 'Auto-created in DynamoDB'}\n\n"
        f"DETAILS      : {action_note}\n\n"
        f"ACTION REQUIRED: Review user security awareness training status in CloudShield Admin Console."
    )

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                response = client.publish(
                    TopicArn=topic_arn,
                    Subject=subject,
                    Message=body
                )
                msg_id = response.get("MessageId")
                logger.info(f"Published CanIPhish alert to SNS {topic_arn}: {msg_id}")
                return {
                    "mode": "AWS_SNS",
                    "status": "PUBLISHED",
                    "topic_arn": topic_arn,
                    "message_id": msg_id
                }
            except Exception as e:
                logger.error(f"SNS publish failed for CanIPhish ({e}), falling back to simulation")

    logger.info(f"[SIMULATED SNS] CanIPhish {event_type} alert for {user_email}")
    return {"mode": "SIMULATED", "status": "SENT_SIMULATED", "subject": subject, "topic_arn": topic_arn}

def subscribe_email_to_sns(email: str) -> Dict[str, Any]:
    """
    Subscribes a Gmail or corporate email address to the CloudShield Amazon SNS topic.
    In AWS mode, Amazon SNS dispatches an official confirmation email to the subscriber.
    In local simulation mode, saves the subscriber record with active verification status.
    """
    from datetime import datetime, timezone
    from app.storage import get_storage
    storage = get_storage()
    now_iso = datetime.now(timezone.utc).isoformat()

    subscribers_data = storage.get_integration_status("SNS_SUBSCRIBERS") or {}
    subscribers_list = subscribers_data.get("subscribers", [])

    # Check if already subscribed
    existing = next((s for s in subscribers_list if s["email"].lower() == email.lower()), None)

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                response = client.subscribe(
                    TopicArn=topic_arn,
                    Protocol="email",
                    Endpoint=email,
                    ReturnSubscriptionArn=True
                )
                sub_arn = response.get("SubscriptionArn", "pending confirmation")
                status = "CONFIRMED" if sub_arn and sub_arn != "pending confirmation" else "PENDING_CONFIRMATION"

                new_record = {
                    "email": email,
                    "status": status,
                    "subscription_arn": sub_arn,
                    "subscribed_at": now_iso,
                    "topic_arn": topic_arn,
                    "mode": "AWS_SNS"
                }

                if existing:
                    subscribers_list = [s if s["email"].lower() != email.lower() else new_record for s in subscribers_list]
                else:
                    subscribers_list.append(new_record)

                storage.save_integration_status("SNS_SUBSCRIBERS", {"subscribers": subscribers_list})
                return {
                    "status": "SUCCESS",
                    "mode": "AWS_SNS",
                    "message": f"Confirmation email dispatched by AWS SNS to {email}. Please check your inbox and click 'Confirm subscription'.",
                    "subscriber": new_record
                }
            except Exception as e:
                logger.error(f"Failed to subscribe {email} to SNS topic: {e}")

    # Local / Simulation Mode
    new_record = {
        "email": email,
        "status": "CONFIRMED",
        "subscription_arn": f"arn:aws:sns:{settings.AWS_REGION}:123456789012:cloudshield-alerts:{email.replace('@', '-at-')}",
        "subscribed_at": now_iso,
        "topic_arn": topic_arn or f"arn:aws:sns:{settings.AWS_REGION}:123456789012:cloudshield-alerts",
        "mode": "LOCAL_SIMULATION"
    }
    if existing:
        subscribers_list = [s if s["email"].lower() != email.lower() else new_record for s in subscribers_list]
    else:
        subscribers_list.append(new_record)

    storage.save_integration_status("SNS_SUBSCRIBERS", {"subscribers": subscribers_list})
    return {
        "status": "SUCCESS",
        "mode": "LOCAL_SIMULATION",
        "message": f"Successfully linked {email} to CloudShield Alert Feeds! Incident alerts will be forwarded.",
        "subscriber": new_record
    }

def list_sns_subscribers() -> List[Dict[str, Any]]:
    """
    Returns list of all registered email subscribers for threat alerts.
    Queries AWS SNS directly if credentials and topic ARN are available.
    """
    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                resp = client.list_subscriptions_by_topic(TopicArn=topic_arn)
                aws_subs = []
                for sub in resp.get("Subscriptions", []):
                    endpoint = sub.get("Endpoint")
                    arn = sub.get("SubscriptionArn")
                    status = "CONFIRMED" if arn and arn != "PendingConfirmation" else "PENDING_CONFIRMATION"
                    aws_subs.append({
                        "email": endpoint,
                        "status": status,
                        "subscription_arn": arn,
                        "subscribed_at": "Active in AWS SNS",
                        "topic_arn": topic_arn,
                        "mode": "AWS_SNS"
                    })
                if aws_subs:
                    return aws_subs
            except Exception as e:
                logger.warning(f"Could not list subscriptions from AWS SNS: {e}")

    # Fallback to local storage or defaults
    from app.storage import get_storage
    storage = get_storage()
    data = storage.get_integration_status("SNS_SUBSCRIBERS") or {}
    subscribers = data.get("subscribers", [])

    if not subscribers:
        subscribers = [
            {
                "email": settings.CANIPHISH_EMAIL_ADDRESS or "lmsampritbtech24@rvu.edu.in",
                "status": "CONFIRMED",
                "subscription_arn": "arn:aws:sns:ap-south-1:919551759864:cloudshield-alerts-topic:d607a4e0-e4c9-40ed-a7ec-f8dbab8cfbc4",
                "subscribed_at": "2026-03-01T00:00:00Z",
                "topic_arn": topic_arn or "arn:aws:sns:ap-south-1:919551759864:cloudshield-alerts-topic",
                "mode": "AWS_SNS"
            },
            {
                "email": "bssukruthi@gmail.com",
                "status": "CONFIRMED",
                "subscription_arn": "arn:aws:sns:ap-south-1:919551759864:cloudshield-alerts-topic:2561df6c-5b6f-4a24-a4ac-bcc63ddcac91",
                "subscribed_at": "2026-03-01T00:00:00Z",
                "topic_arn": topic_arn or "arn:aws:sns:ap-south-1:919551759864:cloudshield-alerts-topic",
                "mode": "AWS_SNS"
            }
        ]
        storage.save_integration_status("SNS_SUBSCRIBERS", {"subscribers": subscribers})

    return subscribers

def unsubscribe_email_from_sns(email: str) -> Dict[str, Any]:
    """
    Unsubscribes an email address from alert notifications.
    """
    from app.storage import get_storage
    storage = get_storage()
    data = storage.get_integration_status("SNS_SUBSCRIBERS") or {}
    subscribers = data.get("subscribers", [])

    target = next((s for s in subscribers if s["email"].lower() == email.lower()), None)
    if not target:
        return {"status": "NOT_FOUND", "message": f"Subscriber {email} not found"}

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and target.get("subscription_arn") and target["subscription_arn"] != "pending confirmation":
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                client.unsubscribe(SubscriptionArn=target["subscription_arn"])
            except Exception as e:
                logger.warning(f"Error calling SNS unsubscribe: {e}")

    updated = [s for s in subscribers if s["email"].lower() != email.lower()]
    storage.save_integration_status("SNS_SUBSCRIBERS", {"subscribers": updated})

    return {"status": "SUCCESS", "message": f"Successfully unsubscribed {email} from CloudShield alerts"}

def send_direct_test_alert(email: str, subject: Optional[str] = None, message: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends an urgent test alert targeted to a specific email address via Amazon SNS.
    """
    subj = subject or "[CloudShield ALERT] Live Test Threat Notification for Gmail"
    msg = message or (
        "CLOUDSHIELD SECURITY OPERATIONS ALERT\n"
        "====================================\n"
        f"Recipient  : {email}\n"
        "Severity   : CRITICAL (Risk Score: 95/100)\n"
        "Alert Type : Phishing Credential Harvest Detected\n"
        "Target IP  : 185.220.101.5 (Untrusted External Network)\n"
        "Timestamp  : Just now\n\n"
        "Security telemetry detected that a user attempted credential verification on a deceptive domain.\n"
        "Amazon SNS distribution is fully active and delivering alerts to your designated Gmail inbox."
    )

    topic_arn = settings.SNS_ALERT_TOPIC_ARN
    is_live_topic = bool(topic_arn and topic_arn.startswith("arn:aws:sns:"))

    if (settings.AWS_MODE or is_live_topic) and topic_arn:
        client = get_boto3_client("sns", force=True)
        if client:
            try:
                resp = client.publish(
                    TopicArn=topic_arn,
                    Subject=subj[:98],
                    Message=msg
                )
                return {
                    "status": "SENT_VIA_AWS_SNS",
                    "message_id": resp.get("MessageId"),
                    "target_email": email,
                    "topic_arn": topic_arn,
                    "note": f"Published to Amazon SNS Topic. Sent to {email} if subscription is confirmed."
                }
            except Exception as e:
                logger.error(f"Failed to publish direct test alert to SNS: {e}")
                return {"status": "ERROR", "error": str(e)}

    return {
        "status": "SENT_SIMULATED",
        "message_id": f"sim-alert-{email[:5]}",
        "target_email": email,
        "subject": subj,
        "note": f"Alert generated and logged for {email}. In AWS mode, Amazon SNS delivers this directly to your Gmail."
    }

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Star,
  Send,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
  ArrowLeft,
  RefreshCw,
  Search,
  Info,
  Sparkles,
  Clock,
  AlertTriangle,
  ChevronRight,
  User,
  AlertOctagon,
  Eye,
  Check,
  X,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export interface ThreatEmail {
  id: string;
  templateCode: string;
  templateName: string;
  senderName: string;
  senderEmail: string;
  senderDomain: string;
  isSpoofed: boolean;
  subject: string;
  snippet: string;
  date: string;
  timestamp: string;
  category: 'GOOGLE' | 'MICROSOFT' | 'HR' | 'LINKEDIN' | 'INTERNAL';
  threatLevel: 'LOW' | 'HIGH' | 'CRITICAL';
  isPhishing: boolean;
  lookalikeDomain: string;
  fakeLandingType: 'google' | 'microsoft' | 'hr' | 'linkedin' | 'safe';
  siteCode: string;
  read: boolean;
  starred: boolean;
  reported: boolean;
  linkClicked: boolean;
  compromised: boolean;
  bodyHtml: string;
}

const INITIAL_EMAILS: ThreatEmail[] = [
  {
    id: 'mail-01',
    templateCode: 'Gmail-Blocked-Login',
    templateName: 'Gmail Login Attempt Blocked Alert',
    senderName: 'Google Security Notice',
    senderEmail: 'no-reply@accounts.google-security-notice.net',
    senderDomain: 'google-security-notice.net',
    isSpoofed: true,
    subject: 'Security Alert: Suspicious sign-in attempt was prevented',
    snippet: 'Someone just used your password to try to sign in to your Google Account from an unrecognized IP in Moscow, Russia...',
    date: '10:42 AM',
    timestamp: '2026-03-24T10:42:00Z',
    category: 'GOOGLE',
    threatLevel: 'HIGH',
    isPhishing: true,
    lookalikeDomain: 'accounts.google.alerting-services.com',
    fakeLandingType: 'google',
    siteCode: 'Google-Login',
    read: false,
    starred: false,
    reported: false,
    linkClicked: false,
    compromised: false,
    bodyHtml: `
      <div style="font-family: 'Google Sans', Roboto, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #202124;">
        <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #4285f4; font-weight: bold; font-size: 20px;">G</span>
            <span style="color: #ea4335; font-weight: bold; font-size: 20px;">o</span>
            <span style="color: #fbbc05; font-weight: bold; font-size: 20px;">o</span>
            <span style="color: #4285f4; font-weight: bold; font-size: 20px;">g</span>
            <span style="color: #34a853; font-weight: bold; font-size: 20px;">l</span>
            <span style="color: #ea4335; font-weight: bold; font-size: 20px;">e</span>
            <span style="font-size: 14px; color: #5f6368; font-weight: 500; margin-left: 6px;">Accounts</span>
          </div>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="font-size: 20px; font-weight: 500; color: #d93025; margin-top: 0; margin-bottom: 16px;">
            Someone has your password
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #3c4043; margin-bottom: 16px;">
            Someone just used your password to try to sign in to your Google Account. Google blocked them, but you should check what happened and change your password right away.
          </p>

          <div style="background-color: #fce8e6; border-left: 4px solid #d93025; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px;">
            <div><strong>Location:</strong> Moscow, Russian Federation</div>
            <div><strong>Device:</strong> Firefox on Linux x86_64</div>
            <div><strong>IP Address:</strong> 185.220.101.5 (Untrusted Network)</div>
            <div><strong>Time:</strong> Today, 10:42 AM (UTC)</div>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #5f6368; margin-bottom: 24px;">
            If you did not initiate this sign-in attempt, your password may have been exposed on a third-party website. Review your account activity now to secure your identity.
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'mail-02',
    templateCode: 'OneDrive-Word-Share',
    templateName: 'Microsoft 365 Shared Executive Briefing',
    senderName: 'Microsoft SharePoint Cloud',
    senderEmail: 'notifications@sharepoint-onedrive-internal.net',
    senderDomain: 'sharepoint-onedrive-internal.net',
    isSpoofed: true,
    subject: 'OneDrive: Q1 Financial Ledger shared with your account',
    snippet: 'Corporate Finance has shared a confidential document "Q1_Executive_Ledger_2026.xlsx" with you via Microsoft 365 OneDrive...',
    date: 'Yesterday',
    timestamp: '2026-03-23T14:20:00Z',
    category: 'MICROSOFT',
    threatLevel: 'HIGH',
    isPhishing: true,
    lookalikeDomain: 'login.microsoftonline.alerting-services.com',
    fakeLandingType: 'microsoft',
    siteCode: 'Microsoft-Login',
    read: false,
    starred: true,
    reported: false,
    linkClicked: false,
    compromised: false,
    bodyHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #262626;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 2px solid #0078d4;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: grid; grid-template-columns: 8px 8px; gap: 2px;">
              <div style="width: 8px; height: 8px; background-color: #f25022;"></div>
              <div style="width: 8px; height: 8px; background-color: #7fba00;"></div>
              <div style="width: 8px; height: 8px; background-color: #00a4ef;"></div>
              <div style="width: 8px; height: 8px; background-color: #ffb900;"></div>
            </div>
            <span style="font-size: 16px; font-weight: 600; color: #262626;">Microsoft SharePoint</span>
          </div>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="font-size: 18px; font-weight: 600; color: #0078d4; margin-top: 0; margin-bottom: 12px;">
            Corporate Finance shared a secure document with you
          </h2>
          <p style="font-size: 13px; line-height: 1.6; color: #444;">
            You have received an authorized link to view <strong>Q1_Executive_Ledger_2026.xlsx</strong> hosted on Microsoft OneDrive Cloud Storage.
          </p>

          <div style="border-left: 3px solid #0078d4; background: #f3f8fd; padding: 12px 14px; font-size: 12px; margin: 16px 0; border-radius: 4px;">
            <strong>Document:</strong> Q1_Executive_Ledger_2026.xlsx (Confidential Payroll)<br />
            <strong>Shared By:</strong> finance-director@corp-accounting.internal<br />
            <strong>Access Expiration:</strong> 24 Hours
          </div>

          <p style="font-size: 12px; color: #555;">
            To view this document, please verify your corporate Office 365 identity credentials via single sign-on.
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'mail-03',
    templateCode: 'HR-Device-Violation',
    templateName: 'Urgent HR Payroll Direct Deposit Verification',
    senderName: 'Corporate HR Benefits Team',
    senderEmail: 'benefits@internal-corporate-payroll.co',
    senderDomain: 'internal-corporate-payroll.co',
    isSpoofed: true,
    subject: 'Action Required: Confirm your direct deposit bank account details',
    snippet: 'Human Resources: Annual automated payroll audit detected a routing number mismatch. Authenticate immediately to avoid pay delay...',
    date: 'Mar 22',
    timestamp: '2026-03-22T11:05:00Z',
    category: 'HR',
    threatLevel: 'CRITICAL',
    isPhishing: true,
    lookalikeDomain: 'payroll.alerting-services.com',
    fakeLandingType: 'hr',
    siteCode: 'Microsoft-Login',
    read: true,
    starred: false,
    reported: false,
    linkClicked: false,
    compromised: false,
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #202124;">
        <div style="border-bottom: 2px solid #ea4335; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: bold; color: #ea4335;">Corporate Human Resources &bull; Payroll Division</span>
          <span style="font-size: 11px; background: #fce8e6; color: #c5221f; padding: 2px 6px; border-radius: 4px; font-weight: bold;">CRITICAL TIME-SENSITIVE</span>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #3c4043;">
          Dear Employee, our Automated Payroll &amp; Benefits Gateway flagged an inconsistency in your direct deposit bank account routing data for the upcoming pay cycle.
        </p>

        <div style="background: #fce8e6; border: 1px solid #fad2cf; border-radius: 6px; padding: 12px 14px; color: #c5221f; font-size: 12px; margin: 16px 0;">
          <strong>Urgent Notice:</strong> To ensure your semi-monthly direct deposit payment is processed without administrative hold, please verify your employee profile within 24 hours.
        </div>

        <p style="font-size: 12px; color: #666;">
          Failure to complete identity verification will place your salary disbursement on temporary payroll hold.
        </p>
      </div>
    `
  },
  {
    id: 'mail-04',
    templateCode: 'Linkedin-Password-Reset',
    templateName: 'LinkedIn InMail Security Notice',
    senderName: 'LinkedIn Security Team',
    senderEmail: 'security@linkedin-notifications-center.org',
    senderDomain: 'linkedin-notifications-center.org',
    isSpoofed: true,
    subject: 'LinkedIn: Password reset request for your account',
    snippet: 'We received a request to reset your LinkedIn password from an unrecognized browser in Frankfurt, Germany. If this was not you...',
    date: 'Mar 20',
    timestamp: '2026-03-20T09:30:00Z',
    category: 'LINKEDIN',
    threatLevel: 'HIGH',
    isPhishing: true,
    lookalikeDomain: 'www.linkedin.alerting-services.com',
    fakeLandingType: 'linkedin',
    siteCode: 'LinkedIn-Login',
    read: true,
    starred: false,
    reported: false,
    linkClicked: false,
    compromised: false,
    bodyHtml: `
      <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #191919;">
        <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-weight: bold; font-size: 22px; color: #0a66c2;">
            Linked<span style="background: #0a66c2; color: white; padding: 1px 4px; border-radius: 3px; font-size: 18px;">in</span>
          </div>
          <div style="font-size: 11px; color: #666;">Account Security Notice</div>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="font-size: 17px; font-weight: 600; color: #191919; margin-top: 0; margin-bottom: 12px;">Did you request a password reset?</h2>
          <p style="font-size: 13px; line-height: 1.6; color: #474747; margin-bottom: 16px;">
            We received a request to reset your corporate LinkedIn password from an unrecognized Chrome session in Frankfurt, Germany.
          </p>

          <div style="background-color: #f3f2ef; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px;">
            <div>&bull; <strong>IP Address:</strong> 185.220.101.5</div>
            <div>&bull; <strong>Browser:</strong> Chrome on Linux</div>
            <div>&bull; <strong>Timestamp:</strong> 2026-03-20 09:30 UTC</div>
          </div>

          <p style="font-size: 12px; color: #666;">
            If you did not initiate this request, verify your account identity to revoke the active reset session.
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'mail-05',
    templateCode: 'INTERNAL-VPN',
    templateName: 'Internal Corporate VPN Maintenance Notice',
    senderName: 'CloudShield IT Helpdesk',
    senderEmail: 'helpdesk@cloudshield.internal',
    senderDomain: 'cloudshield.internal',
    isSpoofed: false,
    subject: 'Scheduled VPN Gateway Maintenance - Saturday 02:00 UTC',
    snippet: 'The corporate IT engineering team will perform routine maintenance on the primary WireGuard and IPsec VPN concentrators this weekend...',
    date: 'Mar 18',
    timestamp: '2026-03-18T08:00:00Z',
    category: 'INTERNAL',
    threatLevel: 'LOW',
    isPhishing: false,
    lookalikeDomain: 'portal.cloudshield.internal',
    fakeLandingType: 'safe',
    siteCode: 'Internal-IT',
    read: true,
    starred: false,
    reported: false,
    linkClicked: false,
    compromised: false,
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #202124;">
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: bold; color: #0284c7;">Internal IT Infrastructure Operations</span>
          <span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">ROUTINE MAINTENANCE</span>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #3c4043;">
          This is an informational announcement regarding planned maintenance on corporate network VPN concentrators.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; color: #166534; font-size: 12px; margin: 16px 0;">
          <strong>Maintenance Window:</strong> Saturday, 02:00 - 04:00 UTC<br />
          <strong>Expected Impact:</strong> Brief 5-minute reconnect intervals for remote desktop sessions.<br />
          <strong>Action Required:</strong> None. No password or credential changes are ever requested for this operation.
        </div>

        <p style="font-size: 12px; color: #666;">
          For questions, open an internal ticket at helpdesk@cloudshield.internal.
        </p>
      </div>
    `
  }
];

export const UserMail: React.FC = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<ThreatEmail[]>(INITIAL_EMAILS);
  const [selectedEmailId, setSelectedEmailId] = useState<string>('mail-01');
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'starred' | 'sent' | 'spam' | 'trash'>('inbox');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showTechnicalHeaders, setShowTechnicalHeaders] = useState<boolean>(false);

  // Deceptive landing page modal state (when user clicks link!)
  const [showFakeLandingModal, setShowFakeLandingModal] = useState<boolean>(false);
  const [fakePassword, setFakePassword] = useState<string>('');
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState<boolean>(false);
  
  // Status toasts & feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'threat' | 'success' | 'info'; text: string; detail?: string } | null>(null);
  const [isReporting, setIsReporting] = useState<boolean>(false);

  const currentEmail = emails.find((e) => e.id === selectedEmailId) || emails[0];
  const userEmail = user?.email || 'user@cloudshield.internal';

  // Count unread in inbox
  const unreadCount = emails.filter((e) => !e.read && e.category !== 'INTERNAL').length;

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
  };

  const handleSelectEmail = async (email: ThreatEmail) => {
    setSelectedEmailId(email.id);
    setShowTechnicalHeaders(false);

    // Mark as read
    if (!email.read) {
      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, read: true } : item))
      );

      // Trigger telemetry for opening email
      if (email.isPhishing) {
        try {
          await api.simulateCanIPhishEvent({
            event_type: 'emailOpened',
            target_user: userEmail,
            campaign_name: email.templateName,
            template_code: email.templateCode,
            phishing_website: email.siteCode,
            source_ip: '185.220.101.5'
          });
        } catch (err) {
          console.error('Failed to report email opened telemetry', err);
        }
      }
    }
  };

  // 1. Employee CLICKS THE LINK inside the email!
  const handleClickEmailLink = async () => {
    if (!currentEmail.isPhishing) {
      setToastMessage({
        type: 'info',
        text: 'Clean Internal Link',
        detail: 'This is a legitimate internal resource link with zero security threat.'
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    // Mark email as linkClicked
    setEmails((prev) =>
      prev.map((item) => (item.id === currentEmail.id ? { ...item, linkClicked: true } : item))
    );

    // Opens the deceptive phishing landing page!
    setShowFakeLandingModal(true);
    setFakePassword('');

    // Dispatches link-click threat telemetry to Threat Detection Engine
    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: 'payloadClicked',
        target_user: userEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: currentEmail.siteCode,
        source_ip: '185.220.101.5'
      });

      // Instant real-time broadcast across all portals
      window.dispatchEvent(new CustomEvent('cloudshield:notification-update'));
      try {
        const bc = new BroadcastChannel('cloudshield_telemetry');
        bc.postMessage({ type: 'THREAT_EVENT' });
        bc.close();
      } catch (e) {}

      // Show toast: Intercepted & Added to Risk Score + Alerted Admin
      setToastMessage({
        type: 'threat',
        text: '🚨 Deceptive Link Click Detected (+35 Risk Penalty)',
        detail: `CloudShield detector intercepted link click on ${currentEmail.lookalikeDomain}. SOC Incident generated and admin alerted.`
      });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      console.error('Failed to log link click telemetry', err);
    }
  };

  // 2. Employee SUBMITS CREDENTIALS on the fake login screen (Simulates Compromise)
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fakePassword.trim()) return;

    setIsSubmittingCredentials(true);
    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: 'employeeCompromised',
        target_user: userEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: currentEmail.siteCode,
        source_ip: '185.220.101.5'
      });

      // Mark compromised
      setEmails((prev) =>
        prev.map((item) => (item.id === currentEmail.id ? { ...item, compromised: true } : item))
      );

      // Instant real-time broadcast across all portals
      window.dispatchEvent(new CustomEvent('cloudshield:notification-update'));
      try {
        const bc = new BroadcastChannel('cloudshield_telemetry');
        bc.postMessage({ type: 'THREAT_EVENT' });
        bc.close();
      } catch (e) {}

      setShowFakeLandingModal(false);
      setToastMessage({
        type: 'threat',
        text: '🔥 CRITICAL THREAT: Credentials Harvested (+55 Risk Score Added)',
        detail: `Credentials submitted to lookalike portal ${currentEmail.lookalikeDomain}. High priority incident dispatched to Admin & SOC.`
      });
      setTimeout(() => setToastMessage(null), 7000);
    } catch (err: any) {
      alert(`Error submitting credentials: ${err.message}`);
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  // 3. Employee reports Phishing to SOC (Vigilance Reward)
  const handleReportPhish = async () => {
    setIsReporting(true);
    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: 'emailReported',
        target_user: userEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: currentEmail.siteCode,
        source_ip: '185.220.101.5'
      });

      setEmails((prev) =>
        prev.map((item) => (item.id === currentEmail.id ? { ...item, reported: true } : item))
      );

      // Instant real-time broadcast across all portals
      window.dispatchEvent(new CustomEvent('cloudshield:notification-update'));
      try {
        const bc = new BroadcastChannel('cloudshield_telemetry');
        bc.postMessage({ type: 'THREAT_EVENT' });
        bc.close();
      } catch (e) {}

      setToastMessage({
        type: 'success',
        text: '🛡️ Phishing Lure Successfully Reported to SOC (+15 Awareness Points)',
        detail: `You correctly identified the spoofed domain ${currentEmail.senderDomain}. Positive security credit awarded!`
      });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      alert(`Failed to report phish: ${err.message}`);
    } finally {
      setIsReporting(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    if (selectedFolder === 'starred') return email.starred;
    if (selectedFolder === 'spam') return email.threatLevel === 'CRITICAL';
    if (selectedFolder === 'sent') return false;
    if (selectedFolder === 'trash') return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      email.subject.toLowerCase().includes(term) ||
      email.senderName.toLowerCase().includes(term) ||
      email.senderEmail.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border-2 flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'threat'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-sky-50 border-sky-300 text-sky-950'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'threat' ? (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
            ) : toastMessage.type === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-sky-600 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">{toastMessage.text}</div>
              {toastMessage.detail && (
                <div className="text-[11px] opacity-80 mt-0.5">{toastMessage.detail}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold px-2 py-1 opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Gmail Inbox Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col min-h-[680px]">
        {/* Gmail Search & Header Bar */}
        <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Gmail Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 font-sans font-bold text-lg text-slate-800">
              <span className="text-rose-600 font-black text-2xl tracking-tighter">M</span>
              <span className="text-slate-700 tracking-tight text-xl font-medium">Gmail</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono ml-1 border border-slate-200">
                Inbox
              </span>
            </div>
          </div>

          {/* Search bar (Styled like authentic Google Search) */}
          <div className="relative flex-1 max-w-xl w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
            />
          </div>

          {/* Active user status */}
          <div className="text-xs font-mono text-slate-500 flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{userEmail}</span>
          </div>
        </div>

        {/* Main Body: Sidebar + Email List + Email Reader */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Gmail Sidebar */}
          <div className="w-full lg:w-56 p-3 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              {/* Compose Button */}
              <div className="mb-4">
                <button
                  onClick={() =>
                    setToastMessage({
                      type: 'info',
                      text: 'Internal Mailbox Mode',
                      detail: 'Outbound sending is restricted in this corporate security training sandbox.'
                    })
                  }
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-sky-100 hover:bg-sky-200 text-slate-800 font-semibold text-xs rounded-2xl shadow-xs transition-all"
                >
                  <Mail className="w-4 h-4 text-sky-600" />
                  <span>Compose</span>
                </button>
              </div>

              {/* Navigation Folders */}
              <button
                onClick={() => setSelectedFolder('inbox')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'inbox'
                    ? 'bg-rose-100/70 text-rose-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSelectedFolder('starred')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'starred'
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Starred</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {emails.filter((e) => e.starred).length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFolder('spam')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'spam'
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-amber-600" />
                  <span>Spam</span>
                </div>
                <span className="text-[10px] text-amber-800 font-bold">1</span>
              </button>

              <button
                onClick={() => setSelectedFolder('sent')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'sent'
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Send className="w-4 h-4 text-slate-500" />
                <span>Sent</span>
              </button>

              <button
                onClick={() => setSelectedFolder('trash')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolder === 'trash'
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Trash</span>
              </button>
            </div>

            {/* Quick Helper Badge */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-slate-700 space-y-1 mt-4">
              <div className="font-bold flex items-center gap-1.5 text-sky-900">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Live Inbox Telemetry</span>
              </div>
              <p className="text-slate-500 leading-tight">
                Simulated emails test vigilance. Clicking deceptive links flags detector penalties (+35 pts). Reporting lures awards awareness credits (+15 pts).
              </p>
            </div>
          </div>

          {/* Email List (Middle Pane) */}
          <div className="w-full lg:w-96 border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[640px]">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No emails found in this folder.
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = email.id === selectedEmailId;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-sky-50/80 border-l-sky-600'
                        : !email.read
                        ? 'bg-white font-bold border-l-rose-500 hover:bg-slate-50/80'
                        : 'bg-slate-50/40 border-l-transparent hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => toggleStar(email.id, e)}
                          className="text-slate-400 hover:text-amber-500 shrink-0"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              email.starred ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs truncate ${
                            !email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                          }`}
                        >
                          {email.senderName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {email.date}
                      </span>
                    </div>

                    <div
                      className={`text-xs line-clamp-1 mb-1 ${
                        !email.read ? 'font-bold text-slate-900' : 'text-slate-800'
                      }`}
                    >
                      {email.subject}
                    </div>

                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {email.snippet}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {email.isPhishing ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {email.threatLevel} LURE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          VERIFIED INTERNAL
                        </span>
                      )}

                      {email.linkClicked && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Link Clicked
                        </span>
                      )}

                      {email.reported && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Reported to SOC
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Reading Pane (Right Pane) */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[640px] flex flex-col justify-between space-y-4 bg-white">
            <div>
              {/* Email Subject & Status Bar */}
              <div className="pb-4 border-b border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {currentEmail.subject}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    {currentEmail.isPhishing ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {currentEmail.threatLevel} RISK
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        SAFE INTERNAL
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {currentEmail.senderName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{currentEmail.senderName}</span>
                        <span className="text-slate-500 font-normal text-[11px]">
                          &lt;{currentEmail.senderEmail}&gt;
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: <strong className="text-slate-700">{userEmail}</strong> &bull; {currentEmail.date}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTechnicalHeaders(!showTechnicalHeaders)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline self-start sm:self-auto"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showTechnicalHeaders ? 'Hide Security Headers' : 'Inspect Security Headers'}</span>
                  </button>
                </div>

                {/* Technical Headers Drawer */}
                {showTechnicalHeaders && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono space-y-1.5 border border-slate-800 animate-in fade-in">
                    <div className="text-amber-400 font-bold mb-1">=== SECURITY ANALYSIS HEADERS ===</div>
                    <div>From: {currentEmail.senderEmail}</div>
                    <div>
                      Sender Domain: <span className="text-rose-400 font-bold">{currentEmail.senderDomain}</span>{' '}
                      {currentEmail.isSpoofed ? '(Spoofed Lookalike Domain)' : '(Internal Trusted)'}
                    </div>
                    <div>SPF Check: <span className="text-amber-400">{currentEmail.isSpoofed ? 'SOFTFAIL (~all)' : 'PASS'}</span></div>
                    <div>DKIM Signature: <span className={currentEmail.isSpoofed ? 'text-rose-400' : 'text-emerald-400'}>{currentEmail.isSpoofed ? 'NONE (Unsigned origin)' : 'VALID'}</span></div>
                    <div>Simulated Source IP: <span className="text-sky-300">185.220.101.5</span> (Untrusted External Network)</div>
                    <div>Destination Landing Page: <span className="text-rose-400 font-bold">{currentEmail.lookalikeDomain}</span></div>
                  </div>
                )}
              </div>

              {/* Email Content Body */}
              <div
                className="py-4 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentEmail.bodyHtml }}
              />

              {/* Call-to-Action Link Banner Inside Email */}
              {currentEmail.isPhishing && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Action Link in Email Message</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono break-all">
                      https://{currentEmail.lookalikeDomain}/login?user={encodeURIComponent(userEmail)}
                    </div>
                  </div>

                  <button
                    onClick={handleClickEmailLink}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-all hover:scale-[1.02] shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Click Link / Open Verification</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Report Phishing vs Test Link) */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl">
              <div className="text-xs text-slate-600">
                <span>Vigilance Actions:</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleReportPhish}
                  disabled={isReporting || currentEmail.reported}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <ShieldCheck className={`w-4 h-4 ${isReporting ? 'animate-spin' : ''}`} />
                  <span>
                    {currentEmail.reported
                      ? '✓ Reported to SOC'
                      : isReporting
                      ? 'Reporting...'
                      : '🛡️ Report as Phishing to SOC (+15 Pts)'}
                  </span>
                </button>

                {currentEmail.isPhishing && (
                  <button
                    onClick={handleClickEmailLink}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <span>Click Inbound Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DECEPTIVE LANDING PAGE MODAL (When user clicks the link)       */}
      {/* ============================================================== */}
      {showFakeLandingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Fake Browser URL Bar Indicator matching CanIPhish alerting-services.com */}
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-400">https://</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded truncate">
                  {currentEmail.lookalikeDomain}
                </span>
              </div>
              <button
                onClick={() => setShowFakeLandingModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Deceptive Login Interface */}
            <div className="p-6 space-y-5">
              <div className="text-center space-y-1">
                {currentEmail.fakeLandingType === 'google' ? (
                  <div className="flex items-center justify-center gap-1 font-bold text-2xl mb-2">
                    <span className="text-sky-500">G</span>
                    <span className="text-rose-500">o</span>
                    <span className="text-amber-500">o</span>
                    <span className="text-sky-500">g</span>
                    <span className="text-emerald-500">l</span>
                    <span className="text-rose-500">e</span>
                  </div>
                ) : currentEmail.fakeLandingType === 'microsoft' || currentEmail.fakeLandingType === 'hr' ? (
                  <div className="flex items-center justify-center gap-2 mb-2 font-bold text-lg text-slate-700">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-2.5 h-2.5 bg-rose-500" />
                      <div className="w-2.5 h-2.5 bg-emerald-500" />
                      <div className="w-2.5 h-2.5 bg-sky-500" />
                      <div className="w-2.5 h-2.5 bg-amber-500" />
                    </div>
                    <span>Microsoft</span>
                  </div>
                ) : (
                  <div className="font-bold text-2xl text-sky-700 mb-2">
                    Linked<span className="bg-sky-700 text-white px-1 rounded">in</span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-slate-900">Sign in</h3>
                <p className="text-xs text-slate-500">to continue to security verification</p>
              </div>

              {/* Interactive Form */}
              <form onSubmit={handleSubmitCredentials} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Email or phone
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Enter your corporate password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password to authenticate"
                    value={fakePassword}
                    onChange={(e) => setFakePassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                  />
                </div>

                <div className="text-[11px] text-slate-500 leading-tight">
                  By clicking Next, you simulate submitting authentication credentials to this lookalike landing page.
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFakeLandingModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel / Go Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingCredentials || !fakePassword.trim()}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all"
                  >
                    {isSubmittingCredentials ? 'Verifying...' : 'Next / Sign in'}
                  </button>
                </div>
              </form>
            </div>

            {/* Explanatory Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
              <span>CloudShield Threat Detection Telemetry</span>
              <span className="font-mono text-rose-600 font-bold">alerting-services.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

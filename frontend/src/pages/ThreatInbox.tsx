import React, { useState, useEffect } from 'react';
import {
  Mail,
  AlertTriangle,
  ShieldCheck,
  Search,
  Star,
  Trash2,
  Send,
  Inbox,
  ShieldAlert,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Info,
  Radio,
  Clock,
  Sparkles,
  ArrowRight,
  User,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ThreatEmail {
  id: string;
  templateCode: string;
  templateName: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  compromiseRate: string;
  payloadType: string;
  scope: string;
  pairedWebsite: string;
  senderName: string;
  senderEmail: string;
  senderDomain: string;
  isSpoofed: boolean;
  subject: string;
  snippet: string;
  date: string;
  category: 'GOOGLE' | 'MICROSOFT' | 'LINKEDIN' | 'HR' | 'PAYROLL' | 'URGENT';
  threatLevel: 'HIGH' | 'CRITICAL';
  bodyHtml: string;
  phishingType: string;
  lookalikeDomain: string;
  fakeLandingType: 'google' | 'microsoft' | 'linkedin' | 'hr';
}

export const ThreatInbox: React.FC = () => {
  const { user } = useAuth();
  const [targetUserEmail, setTargetUserEmail] = useState<string>(
    user?.email || 'user@cloudshield.internal'
  );

  useEffect(() => {
    if (user?.email) {
      setTargetUserEmail(user.email);
    }
  }, [user?.email]);

  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'threats' | 'starred' | 'sent' | 'trash'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string>('threat-01');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set(['threat-01']));
  const [showTechnicalHeaders, setShowTechnicalHeaders] = useState(false);

  // Fake Login Modal State
  const [showFakeLoginModal, setShowFakeLoginModal] = useState(false);
  const [fakePassword, setFakePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);

  // Outcome Feedback Modals
  const [compromiseResult, setCompromiseResult] = useState<any | null>(null);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  // Official CanIPhish Email Threats Dataset
  const threatEmails: ThreatEmail[] = [
    {
      id: 'threat-01',
      templateCode: 'Gmail-Blocked-Login',
      templateName: 'Gmail Login Attempt Blocked.',
      difficulty: 'Hard',
      compromiseRate: '31%',
      payloadType: 'Website link',
      scope: 'Global',
      pairedWebsite: 'Google-Login',
      senderName: 'Google Account Security',
      senderEmail: 'no-reply@accounts.google-security-notice.net',
      senderDomain: 'google-security-notice.net',
      isSpoofed: true,
      subject: 'Security Alert: Suspicious sign-in attempt was blocked',
      snippet: 'Someone just used your password to try to sign in to your Google Account from Moscow, Russia...',
      date: '10:14 AM',
      category: 'GOOGLE',
      threatLevel: 'HIGH',
      phishingType: 'Masquerading as Google Login (alerting-services.com)',
      lookalikeDomain: 'accounts.google.alerting-services.com',
      fakeLandingType: 'google',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #202124;">
          <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">
              <span style="color: #4285F4;">G</span><span style="color: #EA4335;">o</span><span style="color: #FBBC05;">o</span><span style="color: #4285F4;">g</span><span style="color: #34A853;">l</span><span style="color: #EA4335;">e</span>
            </div>
            <div style="font-size: 11px; color: #5f6368;">CanIPhish Hard Simulation • 31% Compromise</div>
          </div>

          <div style="padding: 24px 0;">
            <div style="display: flex; align-items: center; gap: 8px; color: #c5221f; font-size: 16px; font-weight: bold; margin-bottom: 12px;">
              ⚠️ Suspicious sign-in prevented
            </div>
            <p style="font-size: 13px; line-height: 1.6; color: #3c4043; margin-bottom: 16px;">
              Someone just used your password to try to sign in to your Google Account. Google blocked them, but you should verify your credentials and check what happened immediately.
            </p>

            <div style="background-color: #f8f9fa; border: 1px solid #dadce0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px;">
              <div style="color: #5f6368; margin-bottom: 4px;"><strong>Attempted Sign-in Details:</strong></div>
              <div>• <strong>Device:</strong> Firefox on Windows 11</div>
              <div>• <strong>Location:</strong> Moscow, Russia (IP: 185.220.101.5)</div>
              <div>• <strong>Time:</strong> Today, 10:12 AM GMT+5:30</div>
            </div>

            <p style="font-size: 12px; color: #5f6368; margin-bottom: 24px;">
              If this was not you, your account may be compromised. Click below to review your security activity and protect your inbox.
            </p>
          </div>
        </div>
      `,
    },
    {
      id: 'threat-02',
      templateCode: 'OneDrive-Word-Share',
      templateName: 'OneDrive Word File Share.',
      difficulty: 'Hard',
      compromiseRate: '30%',
      payloadType: 'Website link',
      scope: 'Global',
      pairedWebsite: 'Microsoft-Login',
      senderName: 'OneDrive Document Sharing',
      senderEmail: 'shares@onedrive-corporate-docs.share-link.co',
      senderDomain: 'onedrive-corporate-docs.share-link.co',
      isSpoofed: true,
      subject: "Elena Gomez shared 'Q4_Executive_Compensation_Review.docx' with you",
      snippet: 'Elena Gomez has shared a restricted executive file via OneDrive. Click to authenticate via Microsoft 365...',
      date: '09:42 AM',
      category: 'MICROSOFT',
      threatLevel: 'HIGH',
      phishingType: 'Masquerading as Microsoft Login (alerting-services.com)',
      lookalikeDomain: 'login.microsoftonline.alerting-services.com',
      fakeLandingType: 'microsoft',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
          <div style="background: #0078d4; padding: 14px 18px; border-radius: 6px 6px 0 0; color: white; font-weight: bold; font-size: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span>OneDrive • Document Shared</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; rounded: 4px;">Hard · 30%</span>
          </div>
          <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 6px 6px;">
            <p style="font-size: 13px; color: #444; margin-top: 0;">
              <strong>Elena Gomez</strong> (Executive Compensation Committee) shared a protected file with you:
            </p>
            <div style="background: #f7f9fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 14px; margin: 16px 0; display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">📄</div>
              <div>
                <div style="font-size: 13px; font-weight: bold; color: #0078d4;">Q4_Executive_Compensation_Review.docx</div>
                <div style="font-size: 11px; color: #666;">Confidential Document • 1.8 MB</div>
              </div>
            </div>
            <p style="font-size: 12px; color: #666;">
              This link requires single sign-on authentication through Microsoft 365 before access is granted.
            </p>
          </div>
        </div>
      `,
    },
    {
      id: 'threat-03',
      templateCode: 'Microsoft-Security-Alert',
      templateName: 'Email advising that someone else might have accessed their Microsoft account.',
      difficulty: 'Easy',
      compromiseRate: '14%',
      payloadType: 'Website link',
      scope: 'Global',
      pairedWebsite: 'Microsoft-Login',
      senderName: 'Microsoft Account Security',
      senderEmail: 'security-alert@accountprotection-microsoft.security-session.live',
      senderDomain: 'accountprotection-microsoft.security-session.live',
      isSpoofed: true,
      subject: 'Microsoft Security Alert: Someone else might have accessed your account',
      snippet: 'Someone else might have accessed your Microsoft account. You must verify identity immediately...',
      date: 'Yesterday',
      category: 'MICROSOFT',
      threatLevel: 'CRITICAL',
      phishingType: 'Masquerading as Microsoft Login (alerting-services.com)',
      lookalikeDomain: 'login.microsoftonline.alerting-services.com',
      fakeLandingType: 'microsoft',
      bodyHtml: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #262626;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 2px solid #0078d4;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="display: grid; grid-template-columns: 8px 8px; gap: 2px;">
                <div style="width: 8px; height: 8px; background-color: #f25022;"></div>
                <div style="width: 8px; height: 8px; background-color: #7fba00;"></div>
                <div style="width: 8px; height: 8px; background-color: #00a4ef;"></div>
                <div style="width: 8px; height: 8px; background-color: #ffb900;"></div>
              </div>
              <span style="font-size: 16px; font-weight: 600; color: #505050;">Microsoft Security Alert</span>
            </div>
            <span style="font-size: 11px; color: #0078d4; font-weight: bold;">Easy · 14% Compromise</span>
          </div>

          <div style="padding: 24px 0;">
            <h2 style="font-size: 18px; color: #c5221f; margin-top: 0; margin-bottom: 12px;">Unrecognized sign-in detected</h2>
            <p style="font-size: 13px; line-height: 1.6; color: #444;">
              We detected a sign-in to your Microsoft account from an unusual browser or device. If this was not you, someone else might have accessed your account.
            </p>
            <div style="border-left: 3px solid #c5221f; background: #fdf2f2; padding: 12px 14px; font-size: 12px; margin: 16px 0;">
              <strong>Country:</strong> Romania • <strong>IP:</strong> 185.220.101.5 • <strong>Timestamp:</strong> Recent
            </div>
            <p style="font-size: 12px; color: #555;">
              To protect your inbox and organization, sign in to your Microsoft identity portal to confirm your password and secure your session.
            </p>
          </div>
        </div>
      `,
    },
    {
      id: 'threat-04',
      templateCode: 'HR-Device-Violation',
      templateName: 'Email from HR advising the employee has breached the device policy',
      difficulty: 'Hard',
      compromiseRate: '44%',
      payloadType: 'Website link',
      scope: 'Global',
      pairedWebsite: 'Microsoft-Login',
      senderName: 'HR Security & Compliance Operations',
      senderEmail: 'compliance-audit@internal-hr-device-audit.com',
      senderDomain: 'internal-hr-device-audit.com',
      isSpoofed: true,
      subject: 'URGENT NOTICE: Breached Corporate IT & Personal Device Policy',
      snippet: 'HR Audit Notification: Your enrolled device has violated corporate compliance policy. Login to review audit...',
      date: 'Oct 21',
      category: 'HR',
      threatLevel: 'CRITICAL',
      phishingType: 'Corporate Device Compliance Portal (alerting-services.com)',
      lookalikeDomain: 'compliance.microsoft.alerting-services.com',
      fakeLandingType: 'hr',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #202124;">
          <div style="border-bottom: 2px solid #ea4335; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: bold; color: #ea4335;">HR Operations • Immediate Policy Violation</span>
            <span style="font-size: 11px; background: #fce8e6; color: #c5221f; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Hard · 44% Highest Risk</span>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #3c4043;">
            Dear Employee, our IT Compliance Monitoring system recorded that your registered laptop/mobile device has breached organizational endpoint security policies (Section 4.12 - Unauthorized Software).
          </p>
          <div style="background: #fce8e6; border: 1px solid #fad2cf; border-radius: 6px; padding: 12px 14px; color: #c5221f; font-size: 12px; margin: 16px 0;">
            <strong>Mandatory Action:</strong> Authenticate into the Compliance Audit Portal within 4 hours to review violation sanctions and submit device logs.
          </div>
          <p style="font-size: 12px; color: #666;">
            Failure to verify identity will result in immediate temporary revocation of company network privileges.
          </p>
        </div>
      `,
    },
    {
      id: 'threat-05',
      templateCode: 'Linkedin-Password-Reset',
      templateName: 'LinkedIn Password Reset Request.',
      difficulty: 'Moderate',
      compromiseRate: '22%',
      payloadType: 'Website link',
      scope: 'Global',
      pairedWebsite: 'LinkedIn-Login',
      senderName: 'LinkedIn Security Team',
      senderEmail: 'security@linkedin-notifications-center.org',
      senderDomain: 'linkedin-notifications-center.org',
      isSpoofed: true,
      subject: 'LinkedIn: Password reset request for your account',
      snippet: 'A password reset was requested for your LinkedIn profile. If this was not you, verify and secure account...',
      date: 'Oct 20',
      category: 'LINKEDIN',
      threatLevel: 'HIGH',
      phishingType: 'Masquerading as LinkedIn Login (alerting-services.com)',
      lookalikeDomain: 'www.linkedin.alerting-services.com',
      fakeLandingType: 'linkedin',
      bodyHtml: `
        <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #191919;">
          <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: bold; font-size: 22px; color: #0a66c2;">
              Linked<span style="background: #0a66c2; color: white; padding: 1px 4px; border-radius: 3px; font-size: 18px;">in</span>
            </div>
            <div style="font-size: 11px; color: #666;">Moderate · 22% Compromise</div>
          </div>

          <div style="padding: 24px 0;">
            <h2 style="font-size: 17px; font-weight: 600; color: #191919; margin-top: 0; margin-bottom: 12px;">Did you request a password reset?</h2>
            <p style="font-size: 13px; line-height: 1.6; color: #474747; margin-bottom: 16px;">
              We received a request to reset your LinkedIn password from an unrecognized browser in Frankfurt, Germany.
            </p>

            <div style="background-color: #f3f2ef; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px;">
              <div>• <strong>IP Address:</strong> 185.220.101.5</div>
              <div>• <strong>Browser:</strong> Chrome / Linux x86_64</div>
              <div>• <strong>Requested:</strong> Today, 09:30 AM</div>
            </div>

            <p style="font-size: 12px; color: #666; margin-bottom: 24px;">
              If you didn't initiate this request, you should authenticate through LinkedIn Security Portal immediately to cancel the token.
            </p>
          </div>
        </div>
      `,
    },
  ];

  const currentEmail = threatEmails.find((e) => e.id === selectedEmailId) || threatEmails[0];

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 1. Employee clicks "Check Activity / Verify" (Opens Fake Sign-In Screen)
  const handleOpenFakeLogin = async () => {
    setShowFakeLoginModal(true);
    setFakePassword('');
    const siteCode =
      currentEmail.fakeLandingType === 'google'
        ? 'Google-Login'
        : currentEmail.fakeLandingType === 'microsoft'
        ? 'Microsoft-Login'
        : currentEmail.fakeLandingType === 'linkedin'
        ? 'LinkedIn-Login'
        : 'Microsoft-Login';

    try {
      await api.simulateCanIPhishEvent({
        event_type: 'payloadClicked',
        target_user: targetUserEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: siteCode,
        source_ip: '185.220.101.5',
      });
    } catch (err) {
      console.error('Failed to log link click telemetry', err);
    }
  };

  // 2. Employee enters password in Fake Login Screen (Simulates Compromise)
  const handleSubmitFakeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fakePassword.trim()) return;

    setIsSubmittingCredentials(true);
    const siteCode =
      currentEmail.fakeLandingType === 'google'
        ? 'Google-Login'
        : currentEmail.fakeLandingType === 'microsoft'
        ? 'Microsoft-Login'
        : currentEmail.fakeLandingType === 'linkedin'
        ? 'LinkedIn-Login'
        : 'Microsoft-Login';

    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: 'employeeCompromised',
        target_user: targetUserEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: siteCode,
        source_ip: '185.220.101.5',
      });

      setShowFakeLoginModal(false);
      setCompromiseResult({
        ...res,
        target_user: targetUserEmail,
        entered_password: '•'.repeat(fakePassword.length),
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: siteCode,
        deceptive_domain: 'alerting-services.com',
      });
    } catch (err: any) {
      alert(err.message || 'Error simulating compromise event');
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  // 3. Employee reports Phishing to SOC (Vigilance Reward)
  const handleReportPhish = async () => {
    setIsReporting(true);
    const siteCode =
      currentEmail.fakeLandingType === 'google'
        ? 'Google-Login'
        : currentEmail.fakeLandingType === 'microsoft'
        ? 'Microsoft-Login'
        : currentEmail.fakeLandingType === 'linkedin'
        ? 'LinkedIn-Login'
        : 'Microsoft-Login';

    try {
      const res = await api.simulateCanIPhishEvent({
        event_type: 'emailReported',
        target_user: targetUserEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
        phishing_website: siteCode,
        source_ip: '185.220.101.5',
      });

      setReportResult({
        ...res,
        target_user: targetUserEmail,
        campaign_name: currentEmail.templateName,
        template_code: currentEmail.templateCode,
      });
    } catch (err: any) {
      alert(err.message || 'Error reporting phishing event');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Banner & Dynamic Target Email Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Gmail Threat Mailbox & Fake Login Simulator
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Live Simulation
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Experience realistic phishing lures (Gmail security alerts, fake Google sign-ins, Microsoft credential harvesters) and test employee response
          </p>
        </div>

        {/* Dynamic Target User Input */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-[11px] font-semibold text-slate-500">Target User:</div>
          <input
            type="email"
            value={targetUserEmail}
            onChange={(e) => setTargetUserEmail(e.target.value)}
            placeholder="e.g. employee@company.com"
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-48 sm:w-60"
          />
        </div>
      </div>

      {/* Gmail Client Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[640px]">
        {/* Gmail Search & Toolbar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-base tracking-tight text-slate-800 font-sans">
              <span className="text-rose-600 font-black text-xl">M</span>
              <span>Gmail</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
                SIMULATOR
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in threat mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
            />
          </div>

          <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Mailbox: <strong className="text-slate-800">{targetUserEmail}</strong>
          </div>
        </div>

        {/* Main Body: Sidebar + Email List + Email Reader */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Gmail Sidebar */}
          <div className="w-full lg:w-56 p-3 border-r border-slate-200 bg-slate-50/30 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder('inbox')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedFolder === 'inbox'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                  {threatEmails.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFolder('threats')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedFolder === 'threats'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Threat Feeds</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold">
                  4
                </span>
              </button>

              <button
                onClick={() => setSelectedFolder('starred')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedFolder === 'starred' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <Star className="w-4 h-4 text-amber-500" />
                <span>Starred</span>
              </button>

              <button
                onClick={() => setSelectedFolder('sent')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedFolder === 'sent' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <Send className="w-4 h-4 text-slate-500" />
                <span>Sent</span>
              </button>
            </div>

            {/* Quick Helper Badge */}
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Threat Simulation Mode</span>
              </div>
              <p className="text-slate-600 leading-tight">
                Clicking links will open deceptive login screens. Reporting will reward positive score!
              </p>
            </div>
          </div>

          {/* Email List (Middle Pane) */}
          <div className="w-full lg:w-96 border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[640px]">
            {threatEmails
              .filter((e) =>
                searchTerm
                  ? e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  e.senderName.toLowerCase().includes(searchTerm.toLowerCase())
                  : true
              )
              .map((email) => {
                const isSelected = email.id === selectedEmailId;
                const isStarred = starredIds.has(email.id);

                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`p-3.5 cursor-pointer transition-all ${isSelected
                        ? 'bg-sky-50/80 border-l-4 border-l-sky-600'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button onClick={(e) => toggleStar(email.id, e)} className="text-slate-400 hover:text-amber-500">
                          <Star
                            className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                              }`}
                          />
                        </button>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {email.senderName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {email.date}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                      {email.subject}
                    </div>

                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {email.snippet}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {email.threatLevel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {email.phishingType}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Email Reading Pane (Right Pane) */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[640px] flex flex-col justify-between space-y-4">
            <div>
              {/* Email Header */}
              <div className="pb-4 border-b border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {currentEmail.subject}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                    {currentEmail.threatLevel} RISK
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                      {currentEmail.senderName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {currentEmail.senderName}
                        <span className="text-slate-500 font-normal text-[11px]">
                          &lt;{currentEmail.senderEmail}&gt;
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: <strong className="text-slate-700">{targetUserEmail}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTechnicalHeaders(!showTechnicalHeaders)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    <Info className="w-3.5 h-3.5" />
                    {showTechnicalHeaders ? 'Hide Security Headers' : 'Inspect Security Headers'}
                  </button>
                </div>

                {/* Technical Headers Drawer */}
                {showTechnicalHeaders && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono space-y-1.5 border border-slate-800 animate-fadeIn">
                    <div className="text-amber-400 font-bold mb-1">=== SECURITY ANALYSIS HEADERS ===</div>
                    <div>From: {currentEmail.senderEmail}</div>
                    <div>Sender Domain: <span className="text-rose-400 font-bold">{currentEmail.senderDomain}</span> (Lookalike domain)</div>
                    <div>SPF Check: <span className="text-amber-400">SOFTFAIL (~all)</span></div>
                    <div>DKIM Signature: <span className="text-rose-400">NONE (Unsigned origin)</span></div>
                    <div>Simulated Source IP: <span className="text-sky-300">185.220.101.5</span> (Untrusted External Network)</div>
                    <div>Destination Landing Page: <span className="text-rose-400 font-bold">{currentEmail.lookalikeDomain}</span></div>
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div
                className="py-4 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentEmail.bodyHtml }}
              />

              {/* Call-to-Action Link Banner Inside Email */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Lure Call-to-Action Target</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    https://{currentEmail.lookalikeDomain}/login?user={encodeURIComponent(targetUserEmail)}
                  </div>
                </div>

                <button
                  onClick={handleOpenFakeLogin}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-all hover:scale-[1.02]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Check Activity / Sign In</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions Bar (Report Phishing vs Test Link) */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-4 rounded-xl">
              <div className="text-xs text-slate-600">
                <span>Evaluate employee response to this threat lure:</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleReportPhish}
                  disabled={isReporting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <ShieldCheck className={`w-4 h-4 ${isReporting ? 'animate-spin' : ''}`} />
                  <span>{isReporting ? 'Reporting...' : '🛡️ Report as Phishing to SOC (+15 Pts)'}</span>
                </button>

                <button
                  onClick={handleOpenFakeLogin}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <span>Simulate Credential Phish</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: Realistic Fake Google / Microsoft Sign-In Screen      */}
      {/* ============================================================== */}
      {showFakeLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-scaleIn">
            {/* Fake Browser URL Bar Indicator matching CanIPhish alerting-services.com */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-slate-400">https://</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded truncate">
                  {currentEmail.fakeLandingType === 'google'
                    ? 'accounts.google.alerting-services.com'
                    : currentEmail.fakeLandingType === 'microsoft'
                    ? 'login.microsoftonline.alerting-services.com'
                    : currentEmail.fakeLandingType === 'linkedin'
                    ? 'www.linkedin.alerting-services.com'
                    : 'compliance-portal.alerting-services.com'}
                </span>
                <span className="text-slate-400">/signin</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                Managed Lure
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header with Google, Microsoft, LinkedIn, or HR Branding */}
              <div className="text-center space-y-2">
                {currentEmail.fakeLandingType === 'google' && (
                  <div>
                    <div className="text-2xl font-bold tracking-tight">
                      <span className="text-blue-500">G</span>
                      <span className="text-red-500">o</span>
                      <span className="text-amber-500">o</span>
                      <span className="text-blue-500">g</span>
                      <span className="text-green-500">l</span>
                      <span className="text-red-500">e</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">Sign in</h3>
                    <p className="text-xs text-slate-500 font-mono">Phishing Website: Google-Login (alerting-services.com)</p>
                  </div>
                )}

                {currentEmail.fakeLandingType === 'microsoft' && (
                  <div>
                    <div className="flex items-center justify-center gap-2 text-xl font-bold text-slate-800">
                      <div className="grid grid-cols-2 gap-1 w-5 h-5">
                        <div className="bg-red-500 rounded-sm"></div>
                        <div className="bg-green-500 rounded-sm"></div>
                        <div className="bg-blue-500 rounded-sm"></div>
                        <div className="bg-yellow-500 rounded-sm"></div>
                      </div>
                      <span>Microsoft</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">Sign in to your account</h3>
                    <p className="text-xs text-slate-500 font-mono">Phishing Website: Microsoft-Login (alerting-services.com)</p>
                  </div>
                )}

                {currentEmail.fakeLandingType === 'linkedin' && (
                  <div>
                    <div className="inline-flex items-center justify-center font-bold text-2xl text-[#0a66c2]">
                      Linked<span className="bg-[#0a66c2] text-white px-1.5 py-0.5 rounded ml-0.5 text-xl font-extrabold">in</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">Sign in to LinkedIn</h3>
                    <p className="text-xs text-slate-500 font-mono">Phishing Website: LinkedIn-Login (alerting-services.com)</p>
                  </div>
                )}

                {currentEmail.fakeLandingType === 'hr' && (
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">Corporate Identity Compliance</h3>
                    <p className="text-xs text-slate-500 font-mono">Device Policy Verification Portal (alerting-services.com)</p>
                  </div>
                )}
              </div>

              {/* Account Pill */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{targetUserEmail}</span>
                </div>
              </div>

              {/* Fake Form */}
              <form onSubmit={handleSubmitFakeLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Enter your password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={fakePassword}
                      onChange={(e) => setFakePassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-900"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span className="hover:underline cursor-pointer">Forgot password?</span>
                  <span className="hover:underline cursor-pointer">Use another account</span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFakeLoginModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingCredentials || !fakePassword.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmittingCredentials ? 'Verifying...' : 'Next'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Education Warning Note */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Simulation Safety Notice:</strong> Submitting credentials here simulates credential compromise in CloudShield and triggers live incident triage. No actual passwords are saved.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Credential Compromise Threat Teardown                 */}
      {/* ============================================================== */}
      {compromiseResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-rose-300 overflow-hidden animate-scaleIn">
            <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Credential Compromise Simulated!</h3>
                  <p className="text-xs text-rose-100">
                    High-Severity Threat Event Ingested into CloudShield Pipeline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompromiseResult(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-rose-50 p-4 rounded-2xl border border-rose-200">
                <div>
                  <div className="text-slate-500 text-[11px]">Compromised User</div>
                  <div className="font-bold text-slate-900">{compromiseResult.target_user}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Calculated Risk Score</div>
                  <div className="font-extrabold text-rose-700 text-sm">
                    {compromiseResult.risk_score || 95} / 100 ({compromiseResult.severity || 'CRITICAL'})
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Triggered Incident ID</div>
                  <div className="font-mono font-bold text-slate-800">
                    {compromiseResult.incident_id || 'inc-threat-comp-01'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Amazon SNS Alert Broadcast</div>
                  <div className="font-bold text-emerald-700 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Dispatched to Gmail</span>
                  </div>
                </div>
              </div>

              {/* What the employee missed */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900">What went wrong in this attack?</div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>
                      <strong>Deceptive Lookalike Domain:</strong> The login was hosted on{' '}
                      <code className="bg-slate-100 px-1 rounded text-rose-600 font-mono">
                        {compromiseResult.deceptive_domain}
                      </code>
                      , NOT the legitimate Google/Microsoft identity provider.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>
                      <strong>Artificial Urgency:</strong> The email pressured the recipient with instant account locking.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>
                      <strong>SOC Automated Action:</strong> CloudShield has updated this employee's risk score and assigned refresher training on domain lookalikes.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setCompromiseResult(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all"
                >
                  Close & View in Security Events
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Positive Phishing Report Confirmation (Reward)        */}
      {/* ============================================================== */}
      {reportResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-emerald-300 overflow-hidden animate-scaleIn">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Vigilance Reward Awarded!</h3>
                  <p className="text-xs text-emerald-100">+15 Points Added to Employee Awareness Score</p>
                </div>
              </div>
              <button
                onClick={() => setReportResult(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Great job! You identified the indicators of phishing in <strong>{reportResult.campaign_name}</strong> and reported it to CloudShield Security Operations.
              </p>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Telemetry Successfully Recorded</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Target: {reportResult.target_user} • Event: emailReported • Status: Ingested & Evaluated
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setReportResult(null)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

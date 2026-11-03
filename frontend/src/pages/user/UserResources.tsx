import React, { useState, useEffect } from 'react';
import {
  FolderDown,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  Shield,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Filter,
  ExternalLink,
  Info,
  Check,
  HardDrive,
  Lock,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Ban,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Database,
  Server,
  X,
  ChevronRight,
  ChevronLeft,
  Printer
} from 'lucide-react';
import { api } from '../../services/api';

export interface SecurityResource {
  id: string;
  title: string;
  category: string;
  description: string;
  file_name: string;
  file_type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'CSV';
  file_size: string;
  badge: string;
  version: string;
  last_updated: string;
  restricted: boolean;
  required_role: string;
}

interface Props {
  onNavigateTab?: (tab: string) => void;
}

// Built-in Comprehensive Structured Document Library
const DOCUMENT_PREVIEW_LIBRARY: Record<string, any> = {
  'res-phish-guide-pdf': {
    document_type: 'guide',
    title: 'CloudShield Phishing Identification Guide',
    classification: 'OFFICIAL CORPORATE CYBER DEFENSE MANUAL',
    version: 'v2.4 (Certified)',
    last_updated: '2026-03-15',
    summary: 'Comprehensive enterprise reference guide detailing modern email-based social engineering, technical header analysis, typosquatting domains, and actionable reporting workflows.',
    sections: [
      {
        heading: '1. Modern Phishing Tactics & Social Engineering',
        text: 'Cybercriminals increasingly deploy hyper-targeted spear-phishing campaigns leveraging organizational hierarchies, publicly available vendor relationships, and AI-assisted pretexting. Unlike traditional spam, modern deceptive communications mirror internal corporate templates and replicate executive communication styles to induce immediate compliance.'
      },
      {
        heading: '2. Technical Header Inspection Protocols',
        text: 'Every suspicious email must be analyzed across three core cryptographic authentication vectors:\n• SPF (Sender Policy Framework): Validates whether the transmitting server IP is explicitly authorized in the sender domain DNS TXT record.\n• DKIM (DomainKeys Identified Mail): Uses asymmetric public-key cryptography to verify message integrity and ensure the body has not been altered in transit.\n• DMARC (Domain-based Message Authentication): Enforces organizational policy (none, quarantine, or reject) when SPF or DKIM checks fail alignment.'
      },
      {
        heading: '3. Domain Spoofing & URL Deception Techniques',
        text: 'Attackers deploy sophisticated domain masking tactics:\n• Typosquatting: Substituting visually identical characters (e.g., lowercase "l" with numeral "1", or "rn" mimicking "m").\n• Punycode & IDN Spoofing: Registering Internationalized Domain Names using Cyrillic or Greek homoglyphs.\n• URL Shorteners & Redirect Chains: Hiding credential harvesting destinations behind multi-hop HTTP 302 redirects.\n• Subdomain Masquerading: Crafting deceptive subdomains like "cloudshield.internal.attacker-server.com" to deceive hasty users.'
      },
      {
        heading: '4. Step-by-Step Reporting Standard Operating Procedure',
        text: 'When encountering a suspicious communication:\n1. Do NOT click hyperlinks, open attachments, or reply to the sender.\n2. Click the "Report Phish" button on the CloudShield email ribbon.\n3. The message is automatically quarantined and dispatched to the SOC triage pipeline for automated sandbox detonation.'
      }
    ]
  },
  'res-phish-checklist-docx': {
    document_type: 'checklist',
    title: 'Email Red Flags & Sender Verification Checklist',
    classification: 'OPERATIONAL VERIFICATION CHECKLIST',
    version: 'v1.8',
    last_updated: '2026-03-12',
    summary: 'Operational 10-point inspection checklist for employees evaluating unexpected or sensitive incoming electronic communications before interacting.',
    checklist: [
      { item: 'Sender Identity Verification', detail: 'Compare friendly display name against actual SMTP sender address in raw RFC-822 headers.' },
      { item: 'Orthographic Domain Scrutiny', detail: 'Inspect domain letter-by-letter to identify character substitutions or subtle misspellings.' },
      { item: 'External Sender Warning Banner', detail: 'Verify presence of mandatory [EXTERNAL SENDER] safety warning tags appended by corporate gateways.' },
      { item: 'Urgency & Psychological Coercion', detail: 'Identify artificial deadlines threatening punitive measures, immediate suspension, or missed opportunities.' },
      { item: 'Hyperlink Destination Inspection', detail: 'Hover over hyperlinks without clicking to confirm target domain matches legitimate HTTPS corporate URLs.' },
      { item: 'Attachment Payload Risk Assessment', detail: 'Check for dangerous file extensions (.html, .iso, .exe, .scr, or macro-enabled .xlsm documents).' },
      { item: 'Credential & MFA Token Solicitations', detail: 'Remember that CloudShield IT will NEVER ask for passwords, private keys, or MFA codes via email.' },
      { item: 'Banking & Wire Transfer Redirection Policy', detail: 'Any request to change vendor payment routing requires out-of-band verbal voice confirmation on a known phone number.' },
      { item: 'Tone & Stylistic Consistency Review', detail: 'Verify if the writing style, signature block, and greeting conform to previous authentic communications from this contact.' },
      { item: 'SOC Incident Escalation', detail: 'Submit unverified emails to soc-triage@cloudshield.internal preserving all original header metadata.' }
    ]
  },
  'res-policy-acceptable-docx': {
    document_type: 'policy',
    title: 'Acceptable Use & Cloud Asset Protection Policy',
    classification: 'ENTERPRISE GOVERNANCE POLICY',
    version: 'v3.0',
    last_updated: '2026-02-01',
    summary: 'Corporate rules and employee responsibilities regarding acceptable use of workstations, cloud infrastructure, intellectual property, and internal communication channels.',
    sections: [
      {
        heading: '1. Corporate Asset Ownership & Monitoring',
        text: 'All laptops, mobile endpoints, network equipment, email accounts, and digital files are the exclusive property of CloudShield Enterprise. Monitoring and auditing are continuously active without expectation of personal privacy.'
      },
      {
        heading: '2. Credential Protection & Access Governance',
        text: 'Employees must adhere to strict credential hygiene:\n• Passwords must be at least 16 characters and generated via enterprise password managers.\n• Multi-Factor Authentication (MFA) must never be bypassed or approved without explicit user action.\n• Workstations must lock automatically after 5 minutes of inactivity (Win + L).'
      },
      {
        heading: '3. Cloud Infrastructure & Secret Handling',
        text: 'Developers and systems engineers are strictly prohibited from:\n• Committing AWS IAM keys, API secrets, or private TLS certificates to public source control repositories.\n• Storing plaintext database credentials in configuration files.\n• Uploading proprietary source code or confidential customer data into unapproved public AI services.'
      },
      {
        heading: '4. Network Access & Remote Work',
        text: 'All remote connections to internal cloud resources must traverse CloudShield corporate VPN tunnels. Accessing administrative consoles over public, unsecured Wi-Fi without VPN is a severe security violation.'
      }
    ]
  },
  'res-pass-mfa-pdf': {
    document_type: 'guide',
    title: 'Password Security & MFA Configuration Guide',
    classification: 'TECHNICAL CYBERSECURITY STANDARD',
    version: 'v2.1',
    last_updated: '2026-03-01',
    summary: 'Illustrated standard for passphrase entropy, password manager adoption, and multi-factor authentication enrollment complying with NIST SP 800-63B guidelines.',
    sections: [
      {
        heading: '1. Passphrase Entropy Standards (NIST SP 800-63B)',
        text: 'CloudShield enforces passphrase complexity adhering to NIST SP 800-63B guidelines:\n• Minimum length: 16 characters for standard users, 20 characters for cloud administrators.\n• Recommended method: 4 random dictionary words separated by hyphens (e.g., "correct-horse-battery-staple").\n• Never reuse passwords across corporate and personal accounts.'
      },
      {
        heading: '2. Multi-Factor Authentication Hierarchy',
        text: '• Tier 1 (Mandatory for Admins): FIDO2 / WebAuthn Hardware Keys (YubiKey 5 Series).\n• Tier 2 (Standard Employees): App-based TOTP (Google/Microsoft Authenticator) rotating every 30 seconds.\n• Phased Out: SMS and Voice OTP are strictly forbidden due to SS7 interception and SIM-swap exploits.'
      },
      {
        heading: '3. Emergency Backup Codes & Recovery',
        text: 'Upon MFA setup, generate a set of 10 emergency one-time recovery scratch codes. Store these codes in a physical secure safe or encrypted offline storage. Never store backup codes in unencrypted text files.'
      }
    ]
  },
  'res-pass-token-docx': {
    document_type: 'instructions',
    title: 'Hardware Token & Authenticator Instructions',
    classification: 'IT OPERATIONAL RUNBOOK',
    version: 'v1.5',
    last_updated: '2026-02-20',
    summary: 'Walkthrough for configuring YubiKey 5 hardware security tokens and mobile TOTP authenticator applications.',
    sections: [
      {
        heading: '1. Hardware Key Provisioning',
        text: '1. Insert the YubiKey into an available USB port.\n2. Navigate to CloudShield User Portal -> Security Settings -> Register Security Key.\n3. Touch the gold contact sensor when the browser prompt appears.\n4. Set a 6-digit hardware User PIN to enforce two-factor biometric verification.'
      },
      {
        heading: '2. Mobile TOTP Authenticator Pairing',
        text: '1. Open Google Authenticator or Microsoft Authenticator on your mobile device.\n2. Tap "+" and select "Scan QR Code".\n3. Scan the provisioning barcode displayed on the CloudShield IAM portal.\n4. Enter the 6-digit verification code to confirm synchronization.'
      },
      {
        heading: '3. Clock Drift Troubleshooting',
        text: 'If generated TOTP codes are rejected, your device clock may be desynchronized. Ensure your mobile settings are set to "Automatic Network Time". A clock drift exceeding 30 seconds will cause authentication failures.'
      }
    ]
  },
  'res-train-slides-pptx': {
    document_type: 'presentation',
    title: 'CloudShield Security Awareness Training Presentation',
    classification: 'EXECUTIVE & EMPLOYEE SLIDE DECK',
    version: 'Q1 2026 Edition',
    last_updated: '2026-03-20',
    summary: 'Executive slide deck for Q1 2026 enterprise cybersecurity awareness training covering cloud perimeter defense, zero trust, and social engineering.',
    slides: [
      {
        slide: 1,
        title: 'CloudShield Cyber Defense Architecture 2026',
        subtitle: 'Building Human Firewalls & Resilient Cloud Operations',
        points: [
          'Presenter: Alex Vance (Head of Information Security)',
          'Audience: All CloudShield Staff & Engineering Teams',
          'Mandatory SOC 2 / ISO 27001 Compliance Training'
        ]
      },
      {
        slide: 2,
        title: 'The Modern Threat Landscape',
        subtitle: 'Evolving Attack Vectors in Cloud Environments',
        points: [
          '85% of successful cloud breaches originate from identity compromises and phishing.',
          'Surge in AI-assisted spear phishing and executive voice cloning.',
          'Ransomware operators targeting Amazon S3 backups and DynamoDB clusters.'
        ]
      },
      {
        slide: 3,
        title: 'Zero Trust Principles in Practice',
        subtitle: 'Never Trust, Always Verify',
        points: [
          'Verify explicitly across all session requests.',
          'Enforce Just-In-Time (JIT) and Least Privilege access.',
          'Assume breach: segment VPC networks to minimize lateral movement.'
        ]
      },
      {
        slide: 4,
        title: 'Identifying Social Engineering Vectors',
        subtitle: 'Phishing, Pretexting, Baiting, and Quishing',
        points: [
          'Spear Phishing: Tailored emails using scraped organizational context.',
          'Pretexting: Impersonating IT support or external compliance auditors.',
          'Quishing: Malicious QR codes evading traditional email security scanners.'
        ]
      },
      {
        slide: 5,
        title: 'Endpoint & Cloud Asset Protection',
        subtitle: 'Safeguarding Corporate Data',
        points: [
          'Full disk encryption (BitLocker 256-bit) active on all mobile endpoints.',
          'Zero plaintext credentials in code repositories or local drives.',
          'Always lock workstations when leaving your desk.'
        ]
      },
      {
        slide: 6,
        title: 'Incident Escalation & Reporting Protocol',
        subtitle: 'Immediate Actions When Compromise is Suspected',
        points: [
          '1. Disconnect network cable / disconnect from Wi-Fi immediately.',
          '2. Do NOT power off computer (preserves volatile forensic RAM).',
          '3. Contact SOC Hotline (+1-800-555-SECOPS) or report via portal.'
        ]
      }
    ]
  },
  'res-train-handout-pdf': {
    document_type: 'handout',
    title: 'Social Engineering & Phishing Tactics Handout',
    classification: 'FIELD REFERENCE QUICK GUIDE',
    version: 'v1.9',
    last_updated: '2026-03-10',
    summary: 'Visual reference handout outlining common social engineering attack vectors, defense guidelines, and emergency contact numbers.',
    sections: [
      {
        heading: 'Vector 1: Business Email Compromise (BEC)',
        text: 'Attackers impersonate executives or trusted suppliers requesting urgent fund transfers, banking detail modifications, or employee tax records. Defense: Always enforce dual-channel verification for payment changes.'
      },
      {
        heading: 'Vector 2: Smishing (SMS Phishing)',
        text: 'Text messages alerting users to fictitious delivery failures or emergency account freezes. Defense: Never tap links in SMS messages; navigate directly to official portals.'
      },
      {
        heading: 'Vector 3: Vishing & Voice Deepfakes',
        text: 'Phone calls using synthesized executive voices instructing staff to bypass standard controls. Defense: Challenge the caller with internal knowledge or call them back on authorized internal extensions.'
      },
      {
        heading: 'Vector 4: Quishing (QR Code Attacks)',
        text: 'QR codes placed on parking signs, café tables, or embedded in PDFs. Defense: Use camera preview to verify the actual domain before opening.'
      },
      {
        heading: 'Emergency Security Contacts',
        text: '• SOC Incident Hotline: +1 (800) 555-SECOPS\n• Email: soc-triage@cloudshield.internal\n• Security Slack Channel: #cloudshield-secops-urgent'
      }
    ]
  },
  'res-ref-hygiene-csv': {
    document_type: 'table',
    title: 'CloudShield Security Hygiene Audit Checklist',
    classification: 'MACHINE-READABLE COMPLIANCE AUDIT',
    version: 'v2.0',
    last_updated: '2026-03-14',
    summary: 'Structured cybersecurity hygiene controls checklist tracking verification cadence, responsible teams, and compliance scores.',
    table_data: {
      headers: ['Control ID', 'Security Domain', 'Control Description', 'Frequency', 'Owner', 'Status'],
      rows: [
        ['CHK-01', 'Identity & Access', 'Enforce Multi-Factor Authentication on all user and admin accounts', 'Continuous', 'Identity Ops', 'COMPLIANT (100%)'],
        ['CHK-02', 'Credential Hygiene', 'Minimum 16-character passphrase with zero dictionary word reuse', 'Monthly', 'SecOps', 'COMPLIANT (98.4%)'],
        ['CHK-03', 'Phishing Resilience', 'Monthly simulated phishing campaigns with CanIPhish platform', 'Monthly', 'Training Team', 'ACTIVE (4.2% click rate)'],
        ['CHK-04', 'Network Perimeter', 'Disallow direct SSH/RDP from public internet; enforce VPN tunnels', 'Continuous', 'Cloud Infra', 'ENFORCED (0 exposed ports)'],
        ['CHK-05', 'Cloud IAM Keys', 'Automated 90-day rotation and deactivation of unused IAM access keys', 'Weekly', 'Cloud Sec', 'COMPLIANT (100%)'],
        ['CHK-06', 'Endpoint Encryption', 'BitLocker XTS-AES 256-bit full disk encryption on all laptops', 'Continuous', 'Desktop IT', 'VERIFIED (100%)'],
        ['CHK-07', 'Vulnerability Scanning', 'Automated daily container and EC2 vulnerability scanning', 'Daily', 'DevSecOps', 'ACTIVE (0 critical CVEs)'],
        ['CHK-08', 'Database Vault Access', 'Database access restricted to VPC private subnets with TLS 1.3', 'Continuous', 'Database Ops', 'ENFORCED'],
        ['CHK-09', 'Log Aggregation', 'All API, auth, and network events ingested into Amazon DynamoDB', 'Real-Time', 'SOC Engineering', 'HEALTHY'],
        ['CHK-10', 'Automated Incident Escalation', 'Sub-second EventBridge routing to SQS and SNS alert topics', 'Continuous', 'Automation SOAR', 'OPERATIONAL']
      ]
    }
  }
};

export const UserResources: React.FC<Props> = ({ onNavigateTab }) => {
  const [resources, setResources] = useState<SecurityResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'ALLOWED' | 'RESTRICTED'>('ALL');
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [recentlyDownloaded, setRecentlyDownloaded] = useState<string | null>(null);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Track unlocked restricted resources during session
  const [unlockedResourceIds, setUnlockedResourceIds] = useState<Set<string>>(new Set());

  // Passcode Authorization Modal State (for Restricted Decoy Assets)
  const [selectedRestrictedResource, setSelectedRestrictedResource] = useState<SecurityResource | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [pendingDownloadAfterUnlock, setPendingDownloadAfterUnlock] = useState<boolean>(false);

  // Decoy Decrypted Document Viewer Modal State (for Restricted Honeypots)
  const [unlockedDecoy, setUnlockedDecoy] = useState<any | null>(null);
  const [showDecoyModal, setShowDecoyModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Allowed Document Preview Viewer Modal State
  const [showDocumentViewerModal, setShowDocumentViewerModal] = useState<boolean>(false);
  const [viewingResource, setViewingResource] = useState<SecurityResource | null>(null);
  const [documentPreviewData, setDocumentPreviewData] = useState<any | null>(null);
  const [checklistChecked, setChecklistChecked] = useState<Record<string, boolean>>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserDownloadableResources();
      setResources(data || []);
    } catch (err) {
      console.error('Failed to load downloadable resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. OPEN Action Handler
  const handleOpenClick = async (resource: SecurityResource) => {
    if (resource.restricted) {
      // If already unlocked in this session, open decoy viewer directly
      if (unlockedResourceIds.has(resource.id) && unlockedDecoy && unlockedDecoy.resource_id === resource.id) {
        setShowDecoyModal(true);
        return;
      }
      // Otherwise, prompt for PIN decryption
      setSelectedRestrictedResource(resource);
      setPasscode('');
      setPasscodeError(null);
      setPendingDownloadAfterUnlock(false);
      setShowPasscodeModal(true);
    } else {
      // Allowed Resource: Open Rich Document Viewer Modal
      setViewingResource(resource);
      setActiveSlideIndex(0);
      setChecklistChecked({});

      // Try fetching preview from backend, fall back to local rich preview library
      try {
        const res = await api.previewResourceDocument(resource.id);
        if (res && res.preview_data) {
          setDocumentPreviewData(res.preview_data);
        } else {
          setDocumentPreviewData(DOCUMENT_PREVIEW_LIBRARY[resource.id] || {
            document_type: 'guide',
            title: resource.title,
            summary: resource.description,
            sections: [{ heading: 'Overview', text: resource.description }]
          });
        }
      } catch {
        setDocumentPreviewData(DOCUMENT_PREVIEW_LIBRARY[resource.id] || {
          document_type: 'guide',
          title: resource.title,
          summary: resource.description,
          sections: [{ heading: 'Overview', text: resource.description }]
        });
      }
      setShowDocumentViewerModal(true);
    }
  };

  // 2. DOWNLOAD Action Handler
  const handleDownloadClick = async (resource: SecurityResource) => {
    if (resource.restricted) {
      // If already unlocked, download directly with valid passcode
      if (unlockedResourceIds.has(resource.id)) {
        await executeDownload(resource, 'adminaccess2026');
        return;
      }
      // Otherwise, prompt for passcode first with clear download intent
      setSelectedRestrictedResource(resource);
      setPasscode('');
      setPasscodeError(null);
      setPendingDownloadAfterUnlock(true);
      setShowPasscodeModal(true);
    } else {
      await executeDownload(resource);
    }
  };

  const executeDownload = async (resource: SecurityResource, pin?: string) => {
    setDownloadingId(resource.id);
    setRecentlyDownloaded(null);
    setAccessDeniedNotice(null);

    try {
      const res = await api.downloadResourceFile(resource.id, pin);
      if (res.success) {
        setRecentlyDownloaded(res.filename || resource.file_name);
        setTimeout(() => setRecentlyDownloaded(null), 6000);
      } else {
        setAccessDeniedNotice(`Access Denied: CloudShield Threat Detector intercepted download for "${resource.title}".`);
        setTimeout(() => setAccessDeniedNotice(null), 10000);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setAccessDeniedNotice(`Access Denied: CloudShield Threat Detector intercepted download for "${resource.title}".`);
    } finally {
      setDownloadingId(null);
    }
  };

  // 3. Unlock Restricted Resource Handler
  const handleUnlockDecoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestrictedResource) return;
    if (!passcode.trim()) {
      setPasscodeError('Please enter the authorization passcode.');
      return;
    }

    setIsUnlocking(true);
    setPasscodeError(null);

    try {
      const res = await api.unlockResourceDocument(selectedRestrictedResource.id, passcode.trim());
      if (res.success && res.decoy_data) {
        setShowPasscodeModal(false);
        const decoy = { ...res.decoy_data, resource_id: selectedRestrictedResource.id };
        setUnlockedDecoy(decoy);
        setUnlockedResourceIds(prev => new Set(prev).add(selectedRestrictedResource.id));

        if (pendingDownloadAfterUnlock) {
          // Immediately trigger download
          await executeDownload(selectedRestrictedResource, passcode.trim());
        } else {
          // Open Decoy Document Viewer Modal
          setShowDecoyModal(true);
        }
      } else {
        setPasscodeError(res.message || "Invalid authorization passcode. Access denied.");
      }
    } catch (err: any) {
      setPasscodeError(err.message || "Invalid authorization passcode. Access denied.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownloadDecryptedFile = () => {
    if (!unlockedDecoy) return;
    const content = unlockedDecoy.raw_text || unlockedDecoy.raw_csv || JSON.stringify(unlockedDecoy, null, 2);
    const filename = unlockedDecoy.download_filename || 'Confidential_Document.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setRecentlyDownloaded(filename);
    setTimeout(() => setRecentlyDownloaded(null), 6000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleChecklistItem = (index: number) => {
    setChecklistChecked(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const categories = [
    'ALL',
    'Phishing Awareness',
    'Security Policies',
    'Password & MFA',
    'Incident Response',
    'Security Training',
    'Reference Materials'
  ];

  const filteredResources = resources.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesFormat = selectedFormat === 'ALL' || item.file_type === selectedFormat;
    const matchesAccess =
      accessFilter === 'ALL' ||
      (accessFilter === 'ALLOWED' && !item.restricted) ||
      (accessFilter === 'RESTRICTED' && item.restricted);
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesFormat && matchesAccess && matchesSearch;
  });

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'PDF':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: <FileText className="w-4 h-4 text-red-600" />
        };
      case 'DOCX':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <FileCheck className="w-4 h-4 text-blue-600" />
        };
      case 'XLSX':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        };
      case 'PPTX':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Presentation className="w-4 h-4 text-amber-600" />
        };
      case 'CSV':
      default:
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <FileSpreadsheet className="w-4 h-4 text-purple-600" />
        };
    }
  };

  const allowedCount = resources.filter((r) => !r.restricted).length;
  const restrictedCount = resources.filter((r) => r.restricted).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold font-mono">
              <FolderDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>CloudShield Security Documentation &bull; S3 Asset Vault</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Security Resources &amp; Document Library
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Open and download certified cybersecurity training guides, operational checklists, policy runbooks, and audit spreadsheets. Every document contains comprehensive, certified enterprise security data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-emerald-400 font-mono">{allowedCount} Allowed</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">General Access</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-rose-400 font-mono">{restrictedCount} Restricted</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Passcode Vault</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Download Notice Banner */}
      {recentlyDownloaded && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Successfully downloaded document: <strong>{recentlyDownloaded}</strong></span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            Verified Hash &bull; Clean
          </span>
        </div>
      )}

      {/* Access Denied Warning (Triggered if direct unauthorized download attempted) */}
      {accessDeniedNotice && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{accessDeniedNotice}</span>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, policies, checklists, playbooks, audits..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Access Filter (Allowed vs Restricted) */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1">Access:</span>
            <button
              onClick={() => setAccessFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                accessFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Files ({resources.length})
            </button>
            <button
              onClick={() => setAccessFilter('ALLOWED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                accessFilter === 'ALLOWED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <FileCheck className="w-3 h-3" />
              <span>Allowed ({allowedCount})</span>
            </button>
            <button
              onClick={() => setAccessFilter('RESTRICTED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                accessFilter === 'RESTRICTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Restricted Passcode Vault ({restrictedCount})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Resources Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-slate-500 font-mono">Loading Security Documents...</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <FolderDown className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Matching Security Documents</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const fmt = getFormatBadge(res.file_type);
            const isDownloading = downloadingId === res.id;
            const isUnlocked = unlockedResourceIds.has(res.id);
            return (
              <div
                key={res.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group ${
                  res.restricted
                    ? 'border-rose-200/80 bg-rose-50/15 hover:border-rose-300'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        res.restricted
                          ? isUnlocked
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {res.restricted ? (
                        isUnlocked ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Unlocked Session</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-rose-600" />
                            <span>Passcode Protected</span>
                          </>
                        )
                      ) : (
                        <>
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>Allowed Document</span>
                        </>
                      )}
                    </span>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${fmt.bg}`}>
                      {fmt.icon}
                      <span>{res.file_type}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3 leading-snug group-hover:text-indigo-600 transition-colors">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                    {res.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[180px] text-slate-500">{res.file_name}</span>
                    <span>{res.file_size}</span>
                  </div>
                </div>

                {/* DUAL ACTION BUTTONS: OPEN & DOWNLOAD */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenClick(res)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 text-slate-800 hover:text-indigo-900 shadow-2xs transition-all focus:ring-2 focus:ring-indigo-400 group/btn"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600 group-hover/btn:scale-110 transition-transform" />
                    <span>Open</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadClick(res)}
                    disabled={isDownloading}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all focus:ring-2 disabled:opacity-50 ${
                      res.restricted && !isUnlocked
                        ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-500'
                    }`}
                  >
                    {isDownloading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. ALLOWED DOCUMENT PREVIEW VIEWER MODAL */}
      {showDocumentViewerModal && viewingResource && documentPreviewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider font-mono">
                      General Access Certified
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {documentPreviewData.version || viewingResource.version} &bull; {viewingResource.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-0.5">{viewingResource.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadClick(viewingResource)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setShowDocumentViewerModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Render Tailored Structured Document */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1 font-sans">
              {/* Executive Summary Callout */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Document Abstract &amp; Compliance Scope</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {documentPreviewData.summary || viewingResource.description}
                </p>
              </div>

              {/* View 1: Standard Sections (Guides, Policies, Runbooks, Handouts) */}
              {documentPreviewData.sections && (
                <div className="space-y-4">
                  {documentPreviewData.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        <span>{sec.heading}</span>
                      </h4>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs pl-4 border-l-2 border-indigo-100">
                        {sec.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* View 2: Interactive Checklist */}
              {documentPreviewData.checklist && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span>10-Point Interactive Inspection Checklist:</span>
                    <span className="text-indigo-600 font-mono text-[11px]">
                      {Object.values(checklistChecked).filter(Boolean).length} of {documentPreviewData.checklist.length} Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {documentPreviewData.checklist.map((chk: any, idx: number) => {
                      const isChecked = !!checklistChecked[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleChecklistItem(idx)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="space-y-0.5">
                            <div className={`font-bold text-xs ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {idx + 1}. {chk.item}
                            </div>
                            <div className="text-[11px] text-slate-600 leading-relaxed">{chk.detail}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View 3: Structured Table (CSV / Audit Checklist) */}
              {documentPreviewData.table_data && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Tabular Audit Controls &amp; Verification Matrix:
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <tr>
                          {documentPreviewData.table_data.headers.map((h: string, idx: number) => (
                            <th key={idx} className="py-2.5 px-3 font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {documentPreviewData.table_data.rows.map((row: string[], rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell: string, cIdx: number) => (
                              <td key={cIdx} className="py-2.5 px-3 font-mono text-[11px] text-slate-800">
                                {cell.includes('COMPLIANT') || cell.includes('ACTIVE') || cell.includes('VERIFIED') || cell.includes('ENFORCED') ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                                    {cell}
                                  </span>
                                ) : (
                                  cell
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 4: Presentation Slides (PPTX) */}
              {documentPreviewData.slides && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">
                      Slide Deck Preview: Slide {activeSlideIndex + 1} of {documentPreviewData.slides.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                        disabled={activeSlideIndex === 0}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveSlideIndex(prev => Math.min(documentPreviewData.slides.length - 1, prev + 1))}
                        disabled={activeSlideIndex === documentPreviewData.slides.length - 1}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Active Slide Card */}
                  {(() => {
                    const slide = documentPreviewData.slides[activeSlideIndex];
                    return (
                      <div className="p-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-slate-50 to-white space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold">
                            SLIDE {slide.slide}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">CloudShield Enterprise Security Deck</span>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{slide.title}</h4>
                          <div className="text-xs text-indigo-700 font-medium mt-0.5">{slide.subtitle}</div>
                        </div>
                        <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                          {slide.points.map((pt: string, pIdx: number) => (
                            <li key={pIdx} className="flex items-start gap-2">
                              <span className="text-indigo-600 font-bold">&bull;</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Slide Thumbnails strip */}
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {documentPreviewData.slides.map((s: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`p-2 rounded-lg border text-center text-[10px] font-mono transition-all ${
                          activeSlideIndex === idx
                            ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Slide {s.slide}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>CloudShield Certified Document &bull; Approved for General Access</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadClick(viewingResource)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download File ({viewingResource.file_name})</span>
                </button>
                <button
                  onClick={() => setShowDocumentViewerModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. PASSCODE AUTHORIZATION MODAL (For Restricted Decoy Assets) */}
      {showPasscodeModal && selectedRestrictedResource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Lock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Protected Document Authorization</h3>
                  <span className="text-[11px] text-slate-500">Departmental Security Policy Decryption</span>
                </div>
              </div>
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800 mb-1">Target Asset:</div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                {selectedRestrictedResource.title}
              </div>
            </div>

            {passcodeError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockDecoy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Authorization Passcode:
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter authorization passcode"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isUnlocking ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Decrypting Asset...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>{pendingDownloadAfterUnlock ? 'Decrypt & Download' : 'Decrypt & View Document'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DECOY DOCUMENT VIEWER MODAL (Displays Authentic-Looking Sensitive Information) */}
      {showDecoyModal && unlockedDecoy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider font-mono">
                      Decrypted Successfully
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Clearance Verified</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{unlockedDecoy.title}</h3>
                </div>
              </div>

              <button
                onClick={() => setShowDecoyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Render Tailored Decoy Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 font-sans">
              {/* Classification Pill */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-mono">
                <span>{unlockedDecoy.classification || 'CONFIDENTIAL INTERNAL ASSET'}</span>
                <span className="text-emerald-400 font-bold">Encrypted AES-256 GCM</span>
              </div>

              {/* View 1: Passwords Vault View */}
              {unlockedDecoy.decoy_type === 'passwords' && unlockedDecoy.credentials && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Master Enterprise Access Tokens &amp; Database Secrets:
                  </div>

                  <div className="space-y-3">
                    {unlockedDecoy.credentials.map((cred: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{cred.system}</span>
                          <button
                            onClick={() => handleCopyText(cred.secret_access_key || cred.master_password || cred.session_token || cred.secret_key, `cred-${idx}`)}
                            className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedKey === `cred-${idx}` ? 'Copied!' : 'Copy Secret'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                          {cred.access_key_id && (
                            <div className="p-2 bg-white rounded border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Access Key ID:</span>
                              <strong className="text-slate-800">{cred.access_key_id}</strong>
                            </div>
                          )}
                          {cred.secret_access_key && (
                            <div className="p-2 bg-white rounded border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Secret Access Key:</span>
                              <strong className="text-slate-800">{cred.secret_access_key}</strong>
                            </div>
                          )}
                          {cred.endpoint && (
                            <div className="p-2 bg-white rounded border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">DB Endpoint:</span>
                              <strong className="text-slate-800">{cred.endpoint}</strong>
                            </div>
                          )}
                          {cred.master_password && (
                            <div className="p-2 bg-white rounded border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">DB Password:</span>
                              <strong className="text-slate-800">{cred.master_password}</strong>
                            </div>
                          )}
                          {cred.session_token && (
                            <div className="p-2 bg-white rounded border border-slate-200 col-span-2">
                              <span className="text-slate-400 block text-[10px]">VPN SSO Token:</span>
                              <strong className="text-slate-800">{cred.session_token}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View 2: Financial & Infrastructure Audit View */}
              {unlockedDecoy.decoy_type === 'audit' && unlockedDecoy.audit_rows && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Q4 Infrastructure Audit &amp; Risk Findings:
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{unlockedDecoy.lead_auditor}</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Budget</th>
                          <th className="py-2.5 px-3">PCI Score</th>
                          <th className="py-2.5 px-3">Unpatched Nodes</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {unlockedDecoy.audit_rows.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{row.department}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{row.budget}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.pci_score}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-rose-700">{row.unpatched_nodes}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800' :
                                row.status === 'HIGH RISK' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 3: Formatted Raw Text View (General Policies & SOPs) */}
              {unlockedDecoy.raw_text && unlockedDecoy.decoy_type !== 'passwords' && unlockedDecoy.decoy_type !== 'audit' && (
                <div className="p-4 bg-slate-900 text-sky-300 font-mono rounded-xl text-xs leading-relaxed overflow-x-auto">
                  <pre>{unlockedDecoy.raw_text}</pre>
                </div>
              )}
            </div>

            {/* Modal Footer with Direct File Download */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Encrypted in S3 production vault &bull; Decrypted for your session
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDecryptedFile}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download Decrypted File ({unlockedDecoy.download_filename || 'document.txt'})</span>
                </button>
                <button
                  onClick={() => setShowDecoyModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Document Governance Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-slate-700 text-xs">
          <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
          <span>Corporate Document Governance &amp; Information Security Policy</span>
        </div>
        <p className="leading-relaxed">
          All downloadable assets in this library are strictly governed by organizational Information Security and Acceptable Use policies. Access permissions are enforced based on role clearance. All download and open requests are audited.
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2, ExternalLink, Mail } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBackToHome: () => void;
  onNavigateToContact: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBackToHome, onNavigateToContact }) => {
  const OWNER_EMAIL = 'emanualcharles139@gmail.com';
  const EFFECTIVE_DATE = 'November 7, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-slate-200">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] px-3.5 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Games</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#161b22] via-[#1c2128] to-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-10 mb-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Transparency &amp; Trust</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last Updated &amp; Effective Date: <strong className="text-slate-300 font-mono">{EFFECTIVE_DATE}</strong>
        </p>
      </div>

      {/* Content Body */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        {/* 1. Introduction */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>1. Introduction</span>
          </h2>
          <p className="mb-2">
            Welcome to <strong>Pixel Arcade</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are committed to being transparent about how our online browser gaming platform handles information. This Privacy Policy outlines what information is collected, how it is used, and what choices and rights you have when playing our games or browsing our website.
          </p>
          <p>
            Pixel Arcade is designed as a free, lightweight gaming portal. We do not require you to create an account, register, or provide personal credentials to play our games.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>2. Information We Collect</span>
          </h2>
          <div className="space-y-3">
            <div>
              <strong className="text-white block mb-1">A. Local Browser Storage (localStorage)</strong>
              <p className="text-slate-400">
                To provide a seamless arcade experience, our games utilize standard HTML5 Web Storage (<code className="bg-[#0d1117] px-1 py-0.5 rounded text-cyan-300">localStorage</code>) directly on your device. This is strictly used to store:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-400 ml-2">
                <li>Your high scores and best distances (e.g. Stack Ball scores, Car Racing distances).</li>
                <li>Your sound and volume preference toggles (Mute/Unmute).</li>
                <li>Your selected cosmetic game items (such as custom Carrom strikers or Pool cues).</li>
              </ul>
              <p className="text-slate-400 mt-1.5">
                This data is stored purely locally within your own browser and is never uploaded, transferred, or sold to our servers.
              </p>
            </div>

            <div>
              <strong className="text-white block mb-1">B. Automatically Collected Technical Data</strong>
              <p className="text-slate-400">
                Like most websites, our web hosting infrastructure may record standard internet log data when you access the site. This may include your IP address, browser type and version, referring URL, date and time of visit, and operating system for server security and diagnostics.
              </p>
            </div>

            <div>
              <strong className="text-white block mb-1">C. Direct Communications</strong>
              <p className="text-slate-400">
                If you contact us via our Contact Us form or directly by email, we retain your email address, name, and message content solely to respond to your inquiry.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Cookies and Third-Party Advertising */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>3. Google AdSense &amp; Third-Party Advertising</span>
          </h2>
          <p className="mb-3">
            To keep Pixel Arcade free for players worldwide, we partner or prepare to partner with third-party advertising networks, such as <strong>Google AdSense</strong>, to display advertisements on our website.
          </p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites on the Internet.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Users may opt out of personalized advertising by visiting Google's official <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-0.5">Ads Settings <ExternalLink className="w-3 h-3" /></a>.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-0.5">www.aboutads.info <ExternalLink className="w-3 h-3" /></a> or the Network Advertising Initiative at <a href="https://www.networkadvertising.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-0.5">www.networkadvertising.org <ExternalLink className="w-3 h-3" /></a>.</span>
            </div>
          </div>
        </section>

        {/* 4. How to Manage Cookies and Preferences */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3">
            4. Managing Cookies in Your Browser
          </h2>
          <p className="text-slate-400 mb-2">
            You possess full control over cookies and local data. You can configure your browser settings to accept, reject, or delete cookies at any time:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
            <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Cookies and other site data.</li>
            <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Enhanced Tracking Protection / Cookies.</li>
            <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data / Block all cookies.</li>
            <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies.</li>
          </ul>
          <p className="text-slate-400 mt-2">
            Please note that if you choose to clear your browser's local storage, your saved high scores and cosmetic equipment will be reset to default.
          </p>
        </section>

        {/* 5. Children's Privacy (COPPA Compliance) */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3">
            5. Children's Online Privacy Protection (COPPA)
          </h2>
          <p className="text-slate-400">
            Pixel Arcade offers casual family-friendly arcade games and does not knowingly collect any personally identifiable information from children under the age of 13. If you believe that a child has submitted personal information through our contact form, please notify us immediately at <a href={`mailto:${OWNER_EMAIL}`} className="text-cyan-400 hover:underline">{OWNER_EMAIL}</a>, and we will promptly remove such information from our records.
          </p>
        </section>

        {/* 6. Data Protection Rights (GDPR & CCPA) */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3">
            6. Your Data Protection Rights (GDPR &amp; CCPA)
          </h2>
          <p className="text-slate-400 mb-2">
            Depending on your location (such as the European Economic Area, United Kingdom, or California), you may hold specific statutory rights regarding personal data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
            <li><strong>Right to Access:</strong> You can request confirmation of any data we hold about you.</li>
            <li><strong>Right to Rectification or Erasure:</strong> You can request that any personal correspondence be updated or deleted.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will never discriminate against you for exercising your privacy rights.</li>
          </ul>
        </section>

        {/* 7. Changes to This Privacy Policy */}
        <section>
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3">
            7. Changes to This Privacy Policy
          </h2>
          <p className="text-slate-400">
            We may update our Privacy Policy periodically to reflect changes in our operational, legal, or regulatory practices. Any changes will be posted on this page with an updated &ldquo;Last Updated&rdquo; date at the top of the policy.
          </p>
        </section>

        {/* 8. Contact Information */}
        <section className="pt-4 border-t border-[#30363d]">
          <h2 className="text-base sm:text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>8. Contact Us Regarding Privacy</span>
          </h2>
          <p className="text-slate-400 mb-3">
            If you have questions, feedback, or concerns regarding this Privacy Policy or our data handling practices, please contact the website administrator:
          </p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 inline-block">
            <div className="text-xs text-slate-400 mb-1">Pixel Arcade Privacy Administrator</div>
            <a
              href={`mailto:${OWNER_EMAIL}`}
              className="text-sm font-mono font-bold text-cyan-400 hover:underline"
            >
              {OWNER_EMAIL}
            </a>
          </div>
        </section>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Pixel Arcade</span>
        </button>
      </div>
    </div>
  );
};

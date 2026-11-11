import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, Copy, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface ContactPageProps {
  onBackToHome: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBackToHome }) => {
  const OWNER_EMAIL = 'emanualcharles139@gmail.com';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('feedback');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(OWNER_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    // Generate functional mailto link with encoded user inputs
    const subject = encodeURIComponent(`[Pixel Arcade - ${category.toUpperCase()}] Inquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email || 'Not provided'}\nCategory: ${category}\n\nMessage:\n${message}\n\nSent from Pixel Arcade Contact Form`
    );

    // Open user's default email client with pre-filled content
    window.location.href = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

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
            <Mail className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Get in Touch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-4">
          Contact Pixel Arcade
        </h1>
        <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
          Have feedback on a game, encountered a technical bug, or looking to inquire about business partnerships or advertising? We are happy to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Direct Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Owner Email Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              <Mail className="w-4 h-4" />
              <span>Direct Email</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              You can contact the website administrator directly at:
            </p>

            <a
              href={`mailto:${OWNER_EMAIL}`}
              className="text-sm font-mono font-bold text-white hover:text-cyan-400 break-all transition-colors block mb-4"
            >
              {OWNER_EMAIL}
            </a>

            <button
              onClick={handleCopyEmail}
              className="w-full flex items-center justify-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-slate-200 py-2.5 px-3 rounded-lg border border-[#30363d] transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Email Address</span>
                </>
              )}
            </button>
          </div>

          {/* Response Time Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Response Time</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              We strive to respond to all legitimate player feedback, technical reports, and inquiries within <strong>24 to 48 hours</strong> on business days.
            </p>
          </div>

          {/* Inquiries Guide */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <AlertCircle className="w-4 h-4 text-cyan-400" />
              <span>Inquiry Types</span>
            </div>
            <ul className="text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Gameplay feedback &amp; suggestions</li>
              <li>Physics or rules bug reports</li>
              <li>Advertising &amp; partnership inquiries</li>
              <li>Privacy &amp; data inquiries</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Working Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold font-display text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span>Send a Message</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Fill out this form to prepare and send your message directly to our team via your email client.
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-1">Your email client has been opened!</strong>
                  <span>If your email client did not open automatically, you can send your message directly to <strong>{OWNER_EMAIL}</strong>.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Your Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Subject / Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="feedback">Gameplay Feedback &amp; Suggestions</option>
                  <option value="bug">Bug Report / Technical Issue</option>
                  <option value="advertising">Advertising &amp; Sponsorship</option>
                  <option value="privacy">Privacy / Data Inquiry</option>
                  <option value="other">General Question</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Message <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your question, issue, or feedback in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send via Email Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Gamepad2, ArrowLeft, Target, Sparkles, Shield, Monitor, Zap, Trophy } from 'lucide-react';

interface AboutPageProps {
  onBackToHome: () => void;
  onNavigateToContact: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBackToHome, onNavigateToContact }) => {
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
            <Gamepad2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">About Our Platform</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-4">
          Welcome to Pixel Arcade
        </h1>
        <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
          Pixel Arcade is an independent web gaming platform built for players seeking instant, high-quality, and completely free browser gaming without downloads, mandatory logins, or disruptive paywalls.
        </p>
      </div>

      {/* Core Principles */}
      <section className="mb-10">
        <h2 className="text-xl font-bold font-display text-white mb-5 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <span>Our Mission &amp; Purpose</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Zero-Friction Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every title runs directly in your modern web browser using client-side HTML5 canvas and WebGL technology. No app stores, no installations, and no registration forms.
            </p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Responsive &amp; Mobile-Ready</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engineered with mobile-first controls, fluid touch gestures, and desktop keyboard shortcuts, ensuring a seamless experience across phones, tablets, and laptops.
            </p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Respect for Player Privacy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your scores and visual preferences stay on your device via standard browser local storage. We do not require your identity, passwords, or intrusive permissions.
            </p>
          </div>
        </div>
      </section>

      {/* The 8 Curated Games */}
      <section className="mb-10 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold font-display text-white mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Curated Collection of 8 Games</span>
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Pixel Arcade intentionally avoids thousands of uncurated clone games. Instead, we maintain eight distinct, thoroughly engineered titles across arcade, sports physics, and classic tabletop genres:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">1. Stack Ball – Crash Platform</strong>
            <span className="text-slate-400">3D-styled arcade tower drop game with rotating platform destruction, black obstacles, and fireball overdrive combos.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">2. Tic Tac Toe</strong>
            <span className="text-slate-400">Classic 3x3 strategic match featuring 3 distinct AI difficulty tiers (Easy, Medium, Minimax) and local 2-Player mode.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">3. 8 Ball Pool</strong>
            <span className="text-slate-400">Authentic billiards with 16 glossy 3D balls, impulse physics, solids vs. stripes, aiming guidelines, cue customization, and foul tracking.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">4. Gun Sprint</strong>
            <span className="text-slate-400">Dynamic cartoon arcade runner propelled entirely by weapon recoil, featuring floating targets, breakable crates, and gap leaps.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">5. Ludo Classic</strong>
            <span className="text-slate-400">Complete 4-color board game with 16 tokens, animated dice rolls, mandatory 6 entry rules, safe stars, and opponent capture mechanics.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">6. Snakes &amp; Ladders</strong>
            <span className="text-slate-400">Illustrated 100-square boustrophedon board with detailed curved snakes, wooden ladders, step-by-step hopping, and exact-finish rules.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">7. Carrom Board</strong>
            <span className="text-slate-400">Top-down tabletop carrom featuring baseline striker positioning, 9 white and 9 black pucks, red queen cover rules, and custom striker skins.</span>
          </div>

          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <strong className="text-white block font-semibold mb-1">8. Car Racing</strong>
            <span className="text-slate-400">High-speed multi-lane highway racer with overtaking traffic, fuel canister pickups, coin boosts, speed gauges, and distance scoring.</span>
          </div>
        </div>
      </section>

      {/* What Visitors Can Expect */}
      <section className="mb-10 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold font-display text-white mb-4">
          What Visitors Can Expect
        </h2>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            When visiting Pixel Arcade, you can expect an environment crafted with care, clean design, and respect for your time. We do not employ misleading download buttons, pop-under windows, or deceptive promotional tricks.
          </p>
          <p>
            Our web platform is continually optimized for fast asset loading, minimal CPU footprint, and broad compatibility with modern web standards, including Chrome, Safari, Firefox, Edge, and Android web viewports.
          </p>
          <p>
            We welcome constructive feedback, bug reports, and suggestions from our community to continuously improve game balance, accessibility, and visual appeal.
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-[#30363d] flex flex-wrap gap-4 items-center justify-between">
          <span className="text-xs text-slate-400">Have a question or suggestion?</span>
          <button
            onClick={onNavigateToContact}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
          >
            Visit our Contact Page &rarr;
          </button>
        </div>
      </section>
    </div>
  );
};

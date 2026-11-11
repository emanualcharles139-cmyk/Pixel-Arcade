import React, { useState, useMemo, useEffect } from 'react';
import { Gamepad2, Search, Play, Sparkles, X } from 'lucide-react';
import { GAMES } from './types';
import { GameThumbnail } from './components/GameThumbnail';
import { sounds } from './utils/audio';

// 8 Individual Game Components (Strictly preserved)
import { StackBallGame } from './games/StackBallGame';
import { TicTacToeGame } from './games/TicTacToeGame';
import { Pool8BallGame } from './games/Pool8BallGame';
import { GunSprintGame } from './games/GunSprintGame';
import { LudoGame } from './games/LudoGame';
import { SnakesAndLaddersGame } from './games/SnakesAndLaddersGame';
import { CarromGame } from './games/CarromGame';
import { CarRacingGame } from './games/CarRacingGame';

// Dedicated AdSense-Ready Information Pages
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';

type ViewMode = 'home' | 'about' | 'contact' | 'privacy';

export default function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Synchronize hash routing for direct access (/ #about, / #contact, / #privacy)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#about') {
        setCurrentView('about');
        setActiveGameId(null);
      } else if (hash === '#contact') {
        setCurrentView('contact');
        setActiveGameId(null);
      } else if (hash === '#privacy') {
        setCurrentView('privacy');
        setActiveGameId(null);
      } else {
        setCurrentView('home');
      }
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Filtered games based on search and category
  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'arcade' && game.category === 'arcade') ||
        (selectedCategory === 'board' && game.category === 'board') ||
        (selectedCategory === 'sports' && game.category === 'sports');

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const navigateTo = (view: ViewMode) => {
    sounds.playClick();
    setActiveGameId(null);
    setCurrentView(view);
    if (view === 'home') {
      window.history.pushState(null, '', ' ');
    } else {
      window.location.hash = view;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayGame = (id: string) => {
    sounds.playClick();
    setActiveGameId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    sounds.playClick();
    setActiveGameId(null);
    setCurrentView('home');
    window.history.pushState(null, '', ' ');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRandomPlay = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    handlePlayGame(randomGame.id);
  };

  // 1. If an individual game is active, render its dedicated gameplay screen
  if (activeGameId) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col items-center justify-start py-6 px-4">
        {activeGameId === 'stack-ball' && <StackBallGame onBack={handleBackToHome} />}
        {activeGameId === 'tic-tac-toe' && <TicTacToeGame onBack={handleBackToHome} />}
        {activeGameId === '8-ball-pool' && <Pool8BallGame onBack={handleBackToHome} />}
        {activeGameId === 'gun-sprint' && <GunSprintGame onBack={handleBackToHome} />}
        {activeGameId === 'ludo' && <LudoGame onBack={handleBackToHome} />}
        {activeGameId === 'snakes-and-ladders' && <SnakesAndLaddersGame onBack={handleBackToHome} />}
        {activeGameId === 'carrom' && <CarromGame onBack={handleBackToHome} />}
        {activeGameId === 'car-racing' && <CarRacingGame onBack={handleBackToHome} />}
      </main>
    );
  }

  // 2. MAIN LAYOUT (Homepage, About Us, Contact Us, Privacy Policy)
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col justify-between">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5">
          {/* Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-display font-extrabold tracking-wide text-xl">PIXEL ARCADE</span>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => {
                navigateTo('home');
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'home' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Home
            </button>
            <a
              href="#games-catalog"
              onClick={() => {
                if (currentView !== 'home') navigateTo('home');
              }}
              className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              All Games
            </a>
            <button
              onClick={() => navigateTo('about')}
              className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'about' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'contact' ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              Contact Us
            </button>
          </nav>

          {/* Primary Action CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRandomPlay}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Random Game</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {/* VIEW 1: ABOUT US */}
        {currentView === 'about' && (
          <AboutPage
            onBackToHome={() => navigateTo('home')}
            onNavigateToContact={() => navigateTo('contact')}
          />
        )}

        {/* VIEW 2: CONTACT US */}
        {currentView === 'contact' && (
          <ContactPage onBackToHome={() => navigateTo('home')} />
        )}

        {/* VIEW 3: PRIVACY POLICY */}
        {currentView === 'privacy' && (
          <PrivacyPolicyPage
            onBackToHome={() => navigateTo('home')}
            onNavigateToContact={() => navigateTo('contact')}
          />
        )}

        {/* VIEW 4: HOMEPAGE (With the 8 curated games) */}
        {currentView === 'home' && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
            {/* Simple Heading & Tagline */}
            <section className="text-center max-w-2xl mx-auto mb-10">
              <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white mb-3">
                Play. Enjoy. Repeat.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Instant browser gaming featuring 8 distinct, fully playable arcade, board, and physics challenges.
              </p>
            </section>

            {/* Search Bar & Category Filters */}
            <div className="max-w-3xl mx-auto mb-10 flex flex-col sm:flex-row items-center gap-4">
              {/* Search bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 8 games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9.5 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#161b22] border border-[#30363d] rounded-lg w-full sm:w-auto overflow-x-auto">
                {[
                  { id: 'all', label: 'All Games' },
                  { id: 'arcade', label: 'Arcade' },
                  { id: 'board', label: 'Board & Classic' },
                  { id: 'sports', label: 'Sports & Physics' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All Games Grid (Exactly 8 games) */}
            <section id="games-catalog" className="mb-14">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display text-white">
                  All Games <span className="text-xs font-normal text-slate-400 ml-2">({filteredGames.length} available)</span>
                </h2>
                <div className="text-xs text-slate-500">
                  No downloads · Instant play
                </div>
              </div>

              {filteredGames.length === 0 ? (
                <div className="p-12 text-center bg-[#161b22] border border-[#30363d] rounded-xl">
                  <p className="text-sm text-slate-400 mb-3">No games match your search query.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-xs text-cyan-400 hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredGames.map((game) => (
                    <div
                      key={game.id}
                      className="group bg-[#161b22] border border-[#30363d] hover:border-cyan-500/50 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      {/* Card Thumbnail */}
                      <div
                        onClick={() => handlePlayGame(game.id)}
                        className="relative aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer"
                      >
                        <GameThumbnail
                          src={game.thumbnail}
                          alt={game.title}
                          gameId={game.id}
                        />

                        {/* Category Label Overlay */}
                        <div className="absolute top-3 left-3 bg-[#0d1117]/80 backdrop-blur-sm border border-[#30363d] px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300">
                          {game.categoryLabel}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-base text-white mb-2 group-hover:text-cyan-400 transition-colors">
                            {game.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                            {game.shortDesc}
                          </p>
                        </div>

                        {/* Play Now CTA Button */}
                        <button
                          onClick={() => handlePlayGame(game.id)}
                          className="w-full flex items-center justify-center gap-2 bg-[#21262d] hover:bg-cyan-600 text-slate-200 hover:text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Website Footer (AdSense Readiness Links) */}
      <footer className="bg-[#161b22] border-t border-[#30363d] py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          {/* Brand Info */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-bold text-slate-300">PIXEL ARCADE</span>
            <span className="hidden sm:inline">·</span>
            <span>Play. Enjoy. Repeat.</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-slate-400">8 Original HTML5 Browser Games</span>
          </div>

          {/* Footer Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              onClick={() => navigateTo('about')}
              className={`transition-colors ${currentView === 'about' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-300'}`}
            >
              About Us
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`transition-colors ${currentView === 'contact' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-300'}`}
            >
              Contact Us
            </button>
            <button
              onClick={() => navigateTo('privacy')}
              className={`transition-colors ${currentView === 'privacy' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-300'}`}
            >
              Privacy Policy
            </button>
            <a
              href="#games-catalog"
              onClick={() => {
                if (currentView !== 'home') navigateTo('home');
              }}
              className="hover:text-slate-300 transition-colors"
            >
              All Games
            </a>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-slate-300 transition-colors text-slate-400"
            >
              Top &uarr;
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-[#30363d]/60 text-center text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} Pixel Arcade. All rights reserved. Free browser gaming for everyone.
        </div>
      </footer>
    </div>
  );
}

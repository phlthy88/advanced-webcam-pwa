
import React from 'react';

interface HeaderProps {
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  onShowShortcuts: () => void;
}

const SunIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);

const MoonIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

const Header: React.FC<HeaderProps> = ({ onToggleTheme, theme, onShowShortcuts }) => {
  return (
    <header className="bg-blue-600 text-white shadow-md z-10 p-3 sm:p-4">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          Advanced Webcam Controls
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Toggle theme">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={onShowShortcuts} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Keyboard shortcuts (?)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M9 16h6"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

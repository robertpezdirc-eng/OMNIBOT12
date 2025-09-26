import React from 'react';
import { useTheme } from './ThemeProvider';

const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDark ? 'Temna tema' : 'Svetla tema'}
        </span>
      )}
      
      <button
        onClick={toggleTheme}
        className="theme-toggle relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Preklopi na ${isDark ? 'svetlo' : 'temno'} temo`}
        title={`Preklopi na ${isDark ? 'svetlo' : 'temno'} temo`}
      >
        <span className="theme-toggle-icon sun">☀️</span>
        <span className="theme-toggle-icon moon">🌙</span>
      </button>
      
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isDark ? 'Temno' : 'Svetlo'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
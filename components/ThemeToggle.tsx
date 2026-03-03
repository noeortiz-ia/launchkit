import React from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 p-3 rounded-full bg-surface border-2 border-border shadow-lg hover:shadow-xl hover:-translate-y-1 hover:border-accent group transition-all z-50 flex items-center justify-center"
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-textSec group-hover:text-textMain transition-colors" />
      ) : (
        <Sun className="w-5 h-5 text-accentAmber group-hover:text-amber-400 transition-colors" />
      )}
    </button>
  );
};

export default ThemeToggle;

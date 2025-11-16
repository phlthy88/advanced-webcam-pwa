
import React, { useState, ReactNode } from 'react';

interface ControlSectionProps {
  title: string;
  children: ReactNode;
  onReset?: () => void;
  badge?: { text: string; color: 'green' | 'yellow' | 'blue' };
  startCollapsed?: boolean;
}

const ControlSection: React.FC<ControlSectionProps> = ({ title, children, onReset, badge, startCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed);

  const badgeColors = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <header
        className="flex justify-between items-center p-3 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{title}</h3>
            {badge && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColors[badge.color]}`}>
                    {badge.text}
                </span>
            )}
        </div>
        <button className="text-gray-500 dark:text-gray-400">
          <svg className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </header>
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-4">
          {children}
          {onReset && (
            <button
              onClick={onReset}
              className="mt-2 w-full text-sm text-center py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
            >
              Reset Section
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlSection;

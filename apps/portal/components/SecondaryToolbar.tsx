'use client';

import React from 'react';

export interface ToolbarButton {
  id: string;
  icon: string; // SVG as string or emoji
  label: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface SecondaryToolbarProps {
  buttons: ToolbarButton[];
  isVisible?: boolean;
}

export const SecondaryToolbar: React.FC<SecondaryToolbarProps> = ({
  buttons,
  isVisible = true,
}) => {
  if (!isVisible || buttons.length === 0) {
    return null;
  }

  const isSvg = (str: string): boolean => str.trim().startsWith('<svg');

  return (
    <div className="sticky top-16 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 py-3 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-5 flex items-center gap-2">
        {buttons.map((button) => (
          <div key={button.id} className="group relative">
            <button
              onClick={button.onClick}
              disabled={button.disabled}
              aria-label={button.label}
              title={button.tooltip || button.label}
              className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
                button.disabled
                  ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-slate-500'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100'
              }`}
            >
              {isSvg(button.icon) ? (
                <div
                  dangerouslySetInnerHTML={{ __html: button.icon }}
                  className="h-5 w-5"
                />
              ) : (
                <span className="text-lg">{button.icon}</span>
              )}
            </button>
            {button.tooltip && (
              <span className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-40 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-none pointer-events-none">
                {button.tooltip}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecondaryToolbar;

import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 border-t border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm py-3 px-4 backdrop-blur-sm backdrop-saturate-150"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          &copy; {year} RetireWise. All rights reserved.
        </div>
        <div className="text-xs text-gray-600 dark:text-slate-400">
          These tools are for educational purposes only and are not financial advice.
        </div>
      </div>
    </footer>
  );
}

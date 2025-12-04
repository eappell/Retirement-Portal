/**
 * EXAMPLE: How to integrate Retirement Planner AI toolbar buttons with the portal
 * 
 * This file shows the exact code modifications needed for the embedded app's Header.tsx
 * to send toolbar buttons to the parent portal.
 * 
 * Location: In your embedded app (e.g., Retirement Planner AI)
 * File: components/Header.tsx
 */

import React, { useEffect, useState } from 'react';
import {
  QuestionMarkCircleIcon,
  PrinterIcon,
  AdjustmentsHorizontalIcon,
  ShieldExclamationIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Helper: Convert HeroIcon to SVG string
 * This helper converts HeroIcons React components to SVG strings for transmission via PostMessage
 */
function heroIconToSvg(Icon: any): string {
  // Create a temporary container
  const div = document.createElement('div');
  const root = ReactDOM.createRoot(div);
  root.render(<Icon className="h-5 w-5" />);
  
  // Get the SVG string
  const svgString = div.innerHTML;
  root.unmount();
  
  return svgString;
}

/**
 * Alternative: Use direct SVG strings (recommended for better control)
 */
const TOOLBAR_ICONS = {
  print: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a60.773 60.773 0 0 1 10.56 0m-10.56 0v5.094m0 0a20.518 20.518 0 0 1 3.824-1.689 22.02 22.02 0 0 0 3.824-1.689m-7.648 0A20.474 20.474 0 0 1 12 6.74m0 0a22.02 22.02 0 0 1 3.824 1.689m-7.648 0v5.094m0 0a2.25 2.25 0 0 0 3.825 2.25m0 0a2.25 2.25 0 0 0 3.825-2.25" /></svg>`,
  help: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.90.813-2.612 1.128-4.242 0M3 21h18M3.75 3h16.5" /></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94m-.213 5.378l-.524 1.585c-.113.339-.364.645-.712.8-.348.156-.763.156-1.142 0l-.524-1.585m13.637-6.638a.75.75 0 0 0-1.06-1.06M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M5.378 14.406l-1.585.524c-.339.113-.645.364-.8.712-.156.348-.156.763 0 1.142l1.585.524" /></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c.866.866 2.271 1.375 3.816 1.375h12.974c1.545 0 2.95-.509 3.816-1.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>`,
  reset: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
};

/**
 * Extract toolbar buttons from Header component
 * These are the buttons from your existing header's right side
 */
function getToolbarButtons() {
  return [
    {
      id: 'print',
      icon: TOOLBAR_ICONS.print,
      label: 'Print',
      tooltip: 'Print or save as PDF',
    },
    {
      id: 'help',
      icon: TOOLBAR_ICONS.help,
      label: 'User Manual',
      tooltip: 'Open User Manual',
    },
    {
      id: 'settings',
      icon: TOOLBAR_ICONS.settings,
      label: 'Settings',
      tooltip: 'Application Settings',
    },
    {
      id: 'disclaimer',
      icon: TOOLBAR_ICONS.warning,
      label: 'Disclaimer',
      tooltip: 'View disclaimer',
    },
    {
      id: 'reset',
      icon: TOOLBAR_ICONS.reset,
      label: 'Reset',
      tooltip: 'Reset all data',
    },
  ];
}

/**
 * Updated Header component with toolbar integration
 */
const Header: React.FC<HeaderProps> = ({
  // ... existing props
  handlePrint,
  setIsManualOpen,
  setIsDisclaimerOpen,
  handleResetPlan,
  onSaveDefaults,
  // ... etc
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  /**
   * STEP 1: Send toolbar buttons to parent portal on mount
   * This tells the portal: "I have these buttons and want them in the toolbar"
   */
  useEffect(() => {
    // Check if we're in an iframe (embedded in portal)
    if (window.self !== window.top) {
      const toolbarButtons = getToolbarButtons();
      
      window.parent.postMessage(
        {
          type: 'TOOLBAR_BUTTONS',
          buttons: toolbarButtons,
        },
        '*' // In production: use specific origin like 'https://retire-portal.com'
      );
    }
  }, []);

  /**
   * STEP 2: Listen for button clicks from the portal
   * When user clicks a toolbar button in the portal, we receive a message here
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TOOLBAR_BUTTON_CLICKED') {
        const { buttonId } = event.data;

        // Route to the appropriate handler
        switch (buttonId) {
          case 'print':
            handlePrint();
            break;
          case 'help':
            setIsManualOpen(true);
            break;
          case 'settings':
            setIsSettingsOpen(prev => !prev);
            break;
          case 'disclaimer':
            setIsDisclaimerOpen(true, false);
            break;
          case 'reset':
            if (confirm('Reset all data? This cannot be undone.')) {
              handleResetPlan();
            }
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    handlePrint,
    setIsManualOpen,
    setIsDisclaimerOpen,
    handleResetPlan,
  ]);

  // Keep your existing header for use WITHIN the iframe
  // (for when the app is loaded standalone, not via portal)
  return (
    <header className="bg-brand-surface shadow-md h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20">
      {/* Keep existing header content but hide buttons if in iframe */}
      {window.self === window.top ? (
        // Standalone mode: show buttons
        <div className="flex items-center space-x-2">
          <button type="button" onClick={handlePrint} title="Print">
            <PrinterIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setIsManualOpen(true)} title="Help">
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setIsSettingsOpen(!isSettingsOpen)} title="Settings">
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
          {/* ... other buttons */}
        </div>
      ) : (
        // Embedded mode: show minimal header (toolbar handled by portal)
        <div className="text-gray-600 text-sm">
          Use toolbar buttons above
        </div>
      )}
    </header>
  );
};

export default Header;

/**
 * INTEGRATION CHECKLIST
 * 
 * ✓ 1. Import this code into your Header.tsx
 * ✓ 2. Add getToolbarButtons() function
 * ✓ 3. Add useEffect hooks at top of Header component
 * ✓ 4. Modify existing button click handlers if needed
 * ✓ 5. Update header JSX to hide buttons when embedded
 * ✓ 6. Test in iframe: Open DevTools → Console → Check for TOOLBAR_BUTTONS message
 * ✓ 7. Test button clicks: Click toolbar buttons and verify handlers fire
 * 
 * TESTING STEPS
 * 
 * 1. In browser console (while embedded in portal):
 *    window.addEventListener('message', (e) => console.log(e.data));
 * 
 * 2. Look for message like:
 *    { type: 'TOOLBAR_BUTTONS', buttons: [...] }
 * 
 * 3. Click a toolbar button and verify you see:
 *    { type: 'TOOLBAR_BUTTON_CLICKED', buttonId: 'print' }
 * 
 * 4. Verify your handler executes (e.g., print dialog opens)
 */

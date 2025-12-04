# Secondary Toolbar Integration Guide

## Overview

The Retire Portal now supports displaying app-specific toolbar buttons in a secondary navbar for embedded applications. This guide shows how to integrate your app's toolbar buttons.

## How It Works

1. **Portal receives toolbar config** - Embedded apps send toolbar button definitions via PostMessage
2. **SecondaryToolbar renders** - Buttons display between main navbar and app content
3. **Button clicks handled** - Actions are managed by your app through the iframe

## Implementation in Your App

### Step 1: Extract Toolbar Configuration

In your app's `Header.tsx` (or main layout component), extract the icon buttons you want to expose:

```tsx
// Example from Retirement Planner AI Header.tsx
const toolbarButtons = [
  {
    id: 'print',
    icon: '<svg ...>...</svg>', // SVG as string
    label: 'Print',
    tooltip: 'Print or save as PDF',
  },
  {
    id: 'help',
    icon: '<svg ...>...</svg>',
    label: 'User Manual',
    tooltip: 'Open User Manual',
  },
  {
    id: 'settings',
    icon: '<svg ...>...</svg>',
    label: 'Settings',
    tooltip: 'App Settings',
  },
];
```

### Step 2: Send Toolbar Config to Portal

After the iframe loads, send your toolbar buttons to the parent portal:

```tsx
useEffect(() => {
  // Tell the parent portal about our toolbar buttons
  window.parent.postMessage(
    {
      type: 'TOOLBAR_BUTTONS',
      buttons: toolbarButtons,
    },
    '*'
  );
}, []);
```

### Step 3: Handle Button Clicks

Listen for the parent portal calling your button handlers:

```tsx
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'TOOLBAR_BUTTON_CLICKED') {
      const { buttonId } = event.data;
      
      switch (buttonId) {
        case 'print':
          handlePrint();
          break;
        case 'help':
          setIsManualOpen(true);
          break;
        case 'settings':
          setIsSettingsOpen(true);
          break;
      }
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Step 4: Update Button Handlers

Modify your existing button click handlers to work in iframe context:

```tsx
const handlePrint = () => {
  // Your existing print logic
  window.print();
};

const handleHelp = () => {
  setIsManualOpen(true);
};

// etc...
```

## Complete Example Integration

Here's a complete example for integrating Retirement Planner AI buttons:

```tsx
// components/Header.tsx (in your embedded app)
import React, { useEffect, useState } from 'react';

const Header = ({ /* props */ }) => {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Extract buttons from your existing header
  const toolbarButtons = [
    {
      id: 'print',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
      label: 'Print',
      tooltip: 'Print or save as PDF',
    },
    {
      id: 'help',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4m0-4h.01"></path></svg>`,
      label: 'Help',
      tooltip: 'Open User Manual',
    },
    {
      id: 'settings',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path></svg>`,
      label: 'Settings',
      tooltip: 'App Settings',
    },
  ];

  // Send buttons to parent portal on mount
  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'TOOLBAR_BUTTONS',
        buttons: toolbarButtons,
      },
      '*'
    );
  }, []);

  // Listen for button clicks from portal
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TOOLBAR_BUTTON_CLICKED') {
        const { buttonId } = event.data;

        switch (buttonId) {
          case 'print':
            window.print();
            break;
          case 'help':
            setIsManualOpen(true);
            break;
          case 'settings':
            setIsSettingsOpen(true);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Return your existing header (kept inside iframe for internal use)
  return (
    <header className="...">
      {/* Your existing header content */}
    </header>
  );
};
```

## Portal-Side Integration

The portal automatically:

1. **Receives toolbar data** - Listens for `TOOLBAR_BUTTONS` messages
2. **Renders SecondaryToolbar** - Displays buttons with tooltips
3. **Forwards clicks** - Sends `TOOLBAR_BUTTON_CLICKED` messages to the iframe
4. **Handles visibility** - Shows/hides toolbar based on button count

## Button Format

Each button must have:

```typescript
interface ToolbarButton {
  id: string;           // Unique identifier (used in click handler)
  icon: string;         // SVG as string or emoji (e.g., "🖨️")
  label: string;        // Aria label / button name
  tooltip?: string;     // Tooltip text shown on hover
  onClick?: () => void;  // Optional (handled by parent message)
  disabled?: boolean;    // Optional disable state
}
```

## Icon Guidelines

- **SVG icons**: Pass as string with `<svg>...</svg>` markup
- **Emoji icons**: Pass as string (e.g., `"🖨️"`)
- **Size**: SVGs rendered at 20x20px (h-5 w-5)
- **Color**: Inherits text color (gray-700 light / slate-300 dark)

## Examples

### Print Button with SVG
```tsx
{
  id: 'print',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2m2 4H7a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 00-2-2zm0 0V9" /></svg>',
  label: 'Print',
  tooltip: 'Print or save as PDF',
}
```

### Download Button with Emoji
```tsx
{
  id: 'download',
  icon: '⬇️',
  label: 'Download',
  tooltip: 'Download scenarios',
}
```

### Settings with Icon
```tsx
{
  id: 'settings',
  icon: '⚙️',
  label: 'Settings',
  tooltip: 'Application settings',
}
```

## Testing

1. **In your embedded app**:
   - Open browser DevTools → Console
   - Verify `TOOLBAR_BUTTONS` message is sent to parent
   - Listen for `TOOLBAR_BUTTON_CLICKED` messages

2. **In the portal**:
   - Navigate to the app iframe
   - Check if secondary toolbar appears below main navbar
   - Click buttons and verify handlers execute

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Buttons not appearing | Check that `postMessage` is called with correct `type: 'TOOLBAR_BUTTONS'` |
| Clicks not working | Verify button IDs match in send and receive handlers |
| Styling issues | Buttons use Tailwind dark mode classes; check CSS imports |
| SVG not rendering | Ensure SVG string is valid HTML; test in browser console |

## Advanced: Dynamic Buttons

You can update buttons dynamically:

```tsx
const [toolbarButtons, setToolbarButtons] = useState(initialButtons);

// Later, update buttons based on app state
useEffect(() => {
  const updatedButtons = toolbarButtons.map(btn => 
    btn.id === 'save' ? { ...btn, disabled: !hasChanges } : btn
  );
  
  window.parent.postMessage(
    {
      type: 'TOOLBAR_BUTTONS',
      buttons: updatedButtons,
    },
    '*'
  );
}, [hasChanges]);
```

## Security Considerations

- **Origin verification**: In production, verify `event.origin` matches expected domain
- **Sandbox restrictions**: Use `allow-same-origin allow-scripts` in iframe sandbox
- **Token handling**: Auth tokens are passed separately; don't expose them in toolbar config

## Next Steps

1. Extract your app's toolbar buttons from its header
2. Add `postMessage` to send buttons to portal
3. Add message listener to handle button clicks
4. Test integration with portal

Questions? Check the implementation in `/components/IFrameWrapper.tsx` and `/components/SecondaryToolbar.tsx`.

# Secondary Toolbar Integration - Complete Setup

## What Was Implemented

### 1. **SecondaryToolbar Component** ✓
**File**: `/apps/portal/components/SecondaryToolbar.tsx`

A new React component that displays icon buttons from embedded apps. Features:
- Renders between main navbar and page content
- Shows SVG or emoji icons
- Displays tooltips on hover (positioned below)
- Dark mode support
- Responsive layout
- Disabled state handling

```tsx
interface ToolbarButton {
  id: string;           // Unique button ID
  icon: string;         // SVG string or emoji
  label: string;        // Aria label
  tooltip?: string;     // Hover tooltip
  onClick?: () => void; // Click handler
  disabled?: boolean;   // Disabled state
}
```

### 2. **Updated IFrameWrapper** ✓
**File**: `/apps/portal/components/IFrameWrapper.tsx`

Enhanced with PostMessage communication:
- **Receives**: `TOOLBAR_BUTTONS` messages from embedded apps with button config
- **Sends**: `TOOLBAR_BUTTON_CLICKED` messages when buttons are clicked
- **Renders**: SecondaryToolbar with buttons from the embedded app
- **Forwards**: Button click actions back to the iframe for handling

### 3. **Integration Guides** ✓
**Files**: 
- `TOOLBAR_INTEGRATION_GUIDE.md` - Complete implementation guide
- `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx` - Concrete example for Retirement Planner AI

## How It Works

### Portal Flow (Retire Portal)
```
1. User navigates to embedded app
2. IFrameWrapper loads the app in iframe
3. App sends: window.parent.postMessage({ 
     type: 'TOOLBAR_BUTTONS', 
     buttons: [...] 
   })
4. Portal receives message in useEffect listener
5. SecondaryToolbar renders the buttons
6. User clicks button
7. Portal sends: window.parent.postMessage({
     type: 'TOOLBAR_BUTTON_CLICKED',
     buttonId: 'print'
   })
8. App's message listener receives event
9. App handler executes (e.g., window.print())
```

### Embedded App Flow (Retirement Planner AI, Retire Abroad AI)
```
1. Extract toolbar buttons from your Header.tsx
2. On mount: Send buttons to portal via window.parent.postMessage
3. Listen for: TOOLBAR_BUTTON_CLICKED messages
4. Route to appropriate handler based on buttonId
5. Execute handler in your app
```

## Implementation Checklist

For **Retirement Planner AI** (or similar embedded app):

- [ ] Extract toolbar button definitions from Header.tsx
- [ ] Convert HeroIcons to SVG strings using TOOLBAR_ICONS
- [ ] Add `useEffect` hook to send buttons to parent portal
- [ ] Add `useEffect` hook to listen for button clicks
- [ ] Update button click handlers to work from iframe messages
- [ ] Optionally hide buttons when embedded in portal

Example from guide:
```tsx
// Send buttons to portal
useEffect(() => {
  if (window.self !== window.top) {
    window.parent.postMessage({
      type: 'TOOLBAR_BUTTONS',
      buttons: getToolbarButtons(),
    }, '*');
  }
}, []);

// Handle clicks from portal
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'TOOLBAR_BUTTON_CLICKED') {
      const { buttonId } = event.data;
      switch (buttonId) {
        case 'print': window.print(); break;
        case 'help': setIsManualOpen(true); break;
        // ... more handlers
      }
    }
  };
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

## File Structure

```
Retire-Portal/
├── apps/portal/
│   ├── components/
│   │   ├── SecondaryToolbar.tsx          ← NEW
│   │   ├── IFrameWrapper.tsx             ← UPDATED
│   │   ├── Header.tsx
│   │   └── ...
│   └── ...
├── TOOLBAR_INTEGRATION_GUIDE.md          ← NEW
└── TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx    ← NEW
```

## Testing the Integration

### In Portal (Standalone)
```bash
cd apps/portal
npm run dev
# Navigate to embedded app
# Check if SecondaryToolbar appears
```

### In Browser Console (while viewing embedded app)
```javascript
// Listen for all messages
window.addEventListener('message', (e) => console.log('Message:', e.data));

// Should see from app:
// { type: 'TOOLBAR_BUTTONS', buttons: [...] }

// Click a button, should see:
// { type: 'TOOLBAR_BUTTON_CLICKED', buttonId: 'print' }
```

### Testing Retirement Planner AI
After adding the integration code:
1. Deploy updated portal
2. Navigate to Retirement Planner AI app
3. Verify toolbar appears below main navbar
4. Click each button and verify:
   - Print opens print dialog
   - Help opens manual modal
   - Settings opens settings menu
   - Disclaimer shows disclaimer
   - Reset clears data

## Styling

SecondaryToolbar uses Tailwind CSS with dark mode:
- Light mode: gray-700 text, hover:bg-gray-100
- Dark mode: slate-300 text, hover:bg-slate-700
- Tooltips: gray-800 background (light), slate-700 (dark)
- Positioning: `top-16` (below main navbar at h-16)
- Spacing: `py-3 px-4` with button gap-2

## Security Considerations

**Current**: Uses wildcard origin `'*'` for PostMessage

**For Production** - add origin verification:

```tsx
const ALLOWED_ORIGINS = [
  'https://retirement-planner-ai.vercel.app',
  'https://retire-abroad-ai.vercel.app',
];

const handleMessage = (event: MessageEvent) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  // Process message...
};
```

## Next Steps

1. **Retirement Planner AI Integration**:
   - Add the code from `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx`
   - Test button clicks in iframe
   - Deploy to production

2. **Retire Abroad AI Integration** (optional):
   - Extract toolbar buttons (currently minimal)
   - Add integration code
   - Test

3. **Additional Features** (future):
   - Button state management (enabled/disabled based on app state)
   - Dynamic button updates
   - Button grouping/sections
   - Keyboard shortcuts for buttons
   - Mobile responsive button menu

## Documentation

- **For Developers**: See `TOOLBAR_INTEGRATION_GUIDE.md`
- **For Examples**: See `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx`
- **Component API**: See `components/SecondaryToolbar.tsx`

## Build Status

✓ All components compile successfully
✓ No TypeScript errors
✓ All 12 pages prerender correctly
✓ Ready for testing with embedded apps

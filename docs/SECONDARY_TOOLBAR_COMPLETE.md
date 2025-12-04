# Secondary Toolbar Integration - Implementation Complete ✓

## Summary

You now have a complete secondary toolbar system that allows embedded apps to display icon buttons in the portal's navbar area. This enables seamless toolbar button integration from apps like Retirement Planner AI and Retire Abroad AI.

## What Was Built

### 1. SecondaryToolbar Component
**Location**: `apps/portal/components/SecondaryToolbar.tsx`

A reusable React component that:
- Displays icon buttons in a sticky toolbar below the main navbar
- Supports SVG icons and emoji
- Shows tooltips on hover (positioned below)
- Handles dark mode styling
- Provides disabled state support
- Uses Tailwind CSS with slate/gray color scheme

```tsx
<SecondaryToolbar 
  buttons={[
    {
      id: 'print',
      icon: '<svg>...</svg>',
      label: 'Print',
      tooltip: 'Print or save as PDF'
    }
  ]}
/>
```

### 2. Enhanced IFrameWrapper
**Location**: `apps/portal/components/IFrameWrapper.tsx`

Updated to:
- **Listen for**: `TOOLBAR_BUTTONS` messages from embedded apps
- **Send**: `TOOLBAR_BUTTON_CLICKED` messages when buttons are pressed
- **Render**: SecondaryToolbar component above the iframe
- **Maintain**: Existing auth token passing functionality

```tsx
// Embedded app sends:
window.parent.postMessage({
  type: 'TOOLBAR_BUTTONS',
  buttons: [...]
}, '*')

// Portal sends back when button clicked:
window.parent.postMessage({
  type: 'TOOLBAR_BUTTON_CLICKED',
  buttonId: 'print'
}, '*')
```

### 3. Integration Guides

**TOOLBAR_INTEGRATION_GUIDE.md**
- Complete step-by-step implementation guide
- Button format specifications
- SVG and emoji examples
- Testing instructions
- Troubleshooting reference

**TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx**
- Production-ready code example
- Shows exact implementation for Retirement Planner AI
- Includes comments explaining each step
- Testing checklist

**SECONDARY_TOOLBAR_SETUP.md**
- High-level overview
- Architecture explanation
- File structure
- Security considerations

## Communication Flow

### From Embedded App to Portal
```
Embedded App (iframe)
  ↓
1. Header.tsx mounts
2. Extract toolbar buttons
3. Send via postMessage:
   window.parent.postMessage({
     type: 'TOOLBAR_BUTTONS',
     buttons: [...]
   }, '*')
  ↓
Portal (IFrameWrapper)
  ↓
1. Listen for TOOLBAR_BUTTONS message
2. Update state: setToolbarButtons(...)
3. Render: <SecondaryToolbar buttons={...} />
```

### From Portal to Embedded App
```
Portal (SecondaryToolbar)
  ↓
1. User clicks button
2. Send via postMessage:
   window.parent.postMessage({
     type: 'TOOLBAR_BUTTON_CLICKED',
     buttonId: 'print'
   }, '*')
  ↓
Embedded App (iframe)
  ↓
1. Message listener receives event
2. Match buttonId to handler
3. Execute: handlePrint() / setIsManualOpen(true) / etc.
```

## For Embedded Apps - Quick Start

### Step 1: Define Toolbar Buttons
```tsx
const toolbarButtons = [
  {
    id: 'print',
    icon: '<svg>...</svg>',
    label: 'Print',
    tooltip: 'Print or save as PDF',
  },
  // ... more buttons
];
```

### Step 2: Send to Portal
```tsx
useEffect(() => {
  if (window.self !== window.top) { // Check if embedded
    window.parent.postMessage({
      type: 'TOOLBAR_BUTTONS',
      buttons: toolbarButtons,
    }, '*');
  }
}, []);
```

### Step 3: Handle Clicks
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
        // ... more handlers
      }
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

## File Changes Summary

### Created
- ✓ `apps/portal/components/SecondaryToolbar.tsx` (54 lines)
- ✓ `TOOLBAR_INTEGRATION_GUIDE.md` (300+ lines)
- ✓ `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx` (200+ lines)
- ✓ `SECONDARY_TOOLBAR_SETUP.md` (200+ lines)

### Modified
- ✓ `apps/portal/components/IFrameWrapper.tsx`
  - Added SecondaryToolbar import
  - Added toolbarButtons state
  - Added message listener for TOOLBAR_BUTTONS
  - Added flex layout to display toolbar
  - 5 lines added, 1 line changed

## Testing the Implementation

### 1. Verify Build
```bash
cd apps/portal
npm run build
# ✓ All 12 pages compile successfully
# ✓ No TypeScript errors
```

### 2. Test in Browser
```bash
npm run dev
# Navigate to embedded app
# Open DevTools → Console
```

### 3. Verify PostMessage Flow
```javascript
// In console while viewing embedded app:
window.addEventListener('message', (e) => {
  console.log('Message received:', e.data);
});

// Should see:
// { type: 'TOOLBAR_BUTTONS', buttons: [...] }
```

### 4. Test Button Clicks
- Click a toolbar button
- Verify the corresponding action executes
- Check console for TOOLBAR_BUTTON_CLICKED message

## Styling Notes

### SecondaryToolbar Styling
```css
/* Positioning */
sticky top-16  /* Below main navbar (h-16) */
z-10           /* Above page content */

/* Light Mode */
bg-white       /* White background */
text-gray-700  /* Gray text */
hover:bg-gray-100  /* Hover background */

/* Dark Mode */
dark:bg-slate-800  /* Dark background */
dark:text-slate-300  /* Light text */
dark:hover:bg-slate-700  /* Hover background */

/* Tooltips */
bg-gray-800    /* Dark background */
text-white     /* White text */
top-full mt-2  /* Below buttons */
invisible group-hover:visible  /* Show on hover */
```

## Security Considerations

### Current Implementation
- Uses wildcard origin `'*'` for PostMessage

### Production Recommendations
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

### For Retirement Planner AI
1. Open `apps/Header.tsx`
2. Copy code patterns from `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx`
3. Extract existing toolbar buttons (print, help, settings, disclaimer, reset)
4. Add PostMessage logic
5. Test in embedded iframe
6. Deploy

### For Retire Abroad AI
1. Identify toolbar buttons to expose (if any)
2. Follow same integration pattern
3. Test and deploy

### Enhancements (Future)
- Button groups/sections with separators
- Dynamic button updates based on app state
- Keyboard shortcuts for buttons
- Mobile responsive menu (collapse to dropdown)
- Button permissions based on user tier

## Verification Checklist

- [x] SecondaryToolbar component created
- [x] IFrameWrapper updated with toolbar support
- [x] PostMessage listeners implemented
- [x] Dark mode styling applied
- [x] Build succeeds with no errors
- [x] All 12 pages prerender correctly
- [x] Documentation complete
- [x] Example implementation provided
- [x] Integration guide provided
- [x] Setup guide provided

## Files to Review

1. **Implementation**: `apps/portal/components/SecondaryToolbar.tsx`
2. **Integration**: `apps/portal/components/IFrameWrapper.tsx`
3. **Guides**:
   - `TOOLBAR_INTEGRATION_GUIDE.md` (for embedded app developers)
   - `TOOLBAR_IMPLEMENTATION_EXAMPLE.tsx` (code example)
   - `SECONDARY_TOOLBAR_SETUP.md` (overview)

## Build Status

```
✓ Compiled successfully in 3.3s
✓ Running TypeScript...
✓ Collecting page data...
✓ Generating static pages (12/12)
✓ Finalizing page optimization...
Exit code: 0
```

All systems ready for integration testing with embedded apps!

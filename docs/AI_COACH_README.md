# RetireWise AI Coach

## Overview

The RetireWise AI Coach is an intelligent conversational assistant that helps users navigate their retirement planning by analyzing data across all 12 planning tools and providing personalized, actionable recommendations.

## Features

### ✨ **Hybrid Access Pattern**
- **Header Button**: Prominent "AI Coach" button with sparkle icon in the main navigation
- **Floating Button**: Bottom-right corner button for quick access from any page
- **Keyboard Shortcut**: `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to open the AI Coach
- **Proactive Insights**: Notification badge when the AI has detected opportunities

### 💬 **Conversational Interface**
- Slide-out chat panel from the right side
- Full conversation history
- Quick question shortcuts for common queries
- Context-aware responses based on user data

### 🧠 **AI-Powered Insights**
- Powered by OpenAI GPT-4
- Analyzes data across all retirement planning tools
- Provides specific, actionable recommendations
- Connects insights users might miss themselves

## Setup

### 1. Install Dependencies

```bash
cd apps/portal
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `apps/portal` directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...your-key-here
OPENAI_MODEL=gpt-4o
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run the Development Server

```bash
npm run dev
```

## Usage

### Opening the AI Coach

1. **Header Button**: Click the purple "AI Coach" button in the header
2. **Floating Button**: Click the sparkle button in the bottom-right corner
3. **Keyboard**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)

### Example Interactions

**User**: "I'm worried I won't have enough money to retire"

**AI Coach**: Based on your current savings and retirement goals, let me analyze your situation across multiple areas:

1. **Social Security Optimization**: By waiting until age 70 to claim, you could increase your lifetime benefits by approximately $127,000
2. **Tax Strategy**: Relocating to a tax-friendly state like Florida or Texas could save you around $7,000 per year
3. **Healthcare Planning**: Consider a high-deductible health plan with HSA to reduce costs

Let me help you explore each of these areas in detail...

## Architecture

### Components

- **`AICoach.tsx`**: Main chat interface component
  - Slide-out panel with chat history
  - Message input and quick questions
  - Context display showing analyzed tools
  
- **`FloatingInsight.tsx`**: Floating action button
  - Pulse animation for new insights
  - Notification badge
  - Tooltip on hover

- **`retirementContext.tsx`**: Data provider
  - Aggregates user data from all tools
  - Provides context to AI responses
  - Caches data for performance

### API Route

- **`/api/ai-coach/route.ts`**: OpenAI integration
  - Receives user messages and conversation history
  - Constructs prompts with system context
  - Returns AI responses with analyzed context

### Header Integration

- Updated `Header.tsx` to include AI Coach button
- Props interface allows parent components to control open state
- Responsive design hides button on mobile in favor of floating button

## Customization

### Adjusting AI Behavior

Edit the system prompt in `/api/ai-coach/route.ts`:

```typescript
const systemPrompt = `You are RetireWise AI Coach...`;
```

### Styling

The AI Coach respects the portal's light/dark theme automatically. Colors and styling can be adjusted in the component files.

### Quick Questions

Edit the `quickQuestions` array in `AICoach.tsx`:

```typescript
const quickQuestions = [
  "Am I on track to retire?",
  "How can I optimize my Social Security?",
  // Add more...
];
```

## Future Enhancements

### Phase 2: Deep Tool Integration
- [ ] Fetch actual data from each tool's API/database
- [ ] Display charts and visualizations in chat
- [ ] Allow AI to create scenarios and run simulations

### Phase 3: Proactive Insights
- [ ] Background analysis of user data
- [ ] Automatic detection of optimization opportunities
- [ ] Scheduled insight notifications

### Phase 4: Advanced Features
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Export conversation to PDF
- [ ] Share insights with financial advisors

## Security & Privacy

- All conversations are ephemeral (not stored by default)
- User data is only sent to OpenAI for analysis
- API keys are stored securely in environment variables
- No personal data is logged on the server

## Cost Considerations

Using GPT-4 incurs API costs from OpenAI:
- **GPT-4o**: ~$0.005 per message (recommended)
- **GPT-4-turbo**: ~$0.01 per message
- **GPT-3.5-turbo**: ~$0.001 per message (budget option)

Monitor usage at: https://platform.openai.com/usage

## Troubleshooting

### "OpenAI API key not configured" error
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Restart the development server after adding environment variables

### AI Coach button not appearing
- Check that the `onAICoachOpen` prop is passed to the `Header` component
- Ensure the component is within the authenticated area

### Slow responses
- Check your internet connection
- Consider switching to a faster model (gpt-3.5-turbo)
- Monitor OpenAI API status: https://status.openai.com/

## Contributing

When adding new tools or data sources:
1. Update `retirementContext.tsx` to fetch the new data
2. Update the AI system prompt to include guidance on the new data
3. Add relevant quick questions if applicable

## License

Part of the RetireWise Portal project.

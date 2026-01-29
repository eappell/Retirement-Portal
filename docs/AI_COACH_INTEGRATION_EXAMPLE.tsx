// Example: How to integrate AI Coach into any page in the portal

import { useState } from "react";
import { Header } from "@/components/Header";
import { AICoach } from "@/components/AICoach";
import { FloatingInsight } from "@/components/FloatingInsight";

export default function YourPage() {
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  
  // Optional: Track if there's a proactive insight
  const [hasInsight, setHasInsight] = useState(false);

  return (
    <div>
      {/* Pass the handler to Header */}
      <Header onAICoachOpen={() => setIsAICoachOpen(true)} />

      {/* Your page content */}
      <main>
        {/* Your content here */}
      </main>

      {/* AI Coach Components */}
      <AICoach 
        isOpen={isAICoachOpen} 
        onClose={() => setIsAICoachOpen(false)} 
      />
      
      <FloatingInsight 
        onClick={() => setIsAICoachOpen(true)}
        hasInsight={hasInsight}
      />
    </div>
  );
}

// Example: Using the Retirement Data Context

import { useRetirementData } from "@/lib/retirementContext";

export function MyComponent() {
  const { userData, loading, refreshData } = useRetirementData();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Your Retirement Data</h2>
      <p>Age: {userData?.age}</p>
      <p>Retirement Age: {userData?.retirementAge}</p>
      {/* Use other data fields as needed */}
    </div>
  );
}

// Example: Keyboard shortcut in any component

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsAICoachOpen(true);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

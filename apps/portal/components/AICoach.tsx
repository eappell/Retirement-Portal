"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import type { CrossToolInsight } from "@/lib/types/aggregatedToolData";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  context?: string[];
}

interface AICoachProps {
  isOpen: boolean;
  onClose: () => void;
  initialInsights?: CrossToolInsight[];
}

type TabType = "chat" | "insights";

export function AICoach({ isOpen, onClose, initialInsights = [] }: AICoachProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your RetireWise AI Coach. I analyze data across all your planning tools to find optimization opportunities. Check the Insights tab to see what I've found, or ask me anything!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<CrossToolInsight[]>(initialInsights);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [dataCompleteness, setDataCompleteness] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      inputRef.current?.focus();
    }
  }, [isOpen, activeTab]);

  // Fetch insights when panel opens
  const fetchInsights = useCallback(async () => {
    if (!user || !auth.currentUser) return;

    setIsLoadingInsights(true);
    try {
      const token = await auth.currentUser.getIdToken();

      // Make a simple request to get insights without a message
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "What insights do you have for me?",
          userId: user.uid,
          authToken: token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.insights && data.insights.length > 0) {
          setInsights(data.insights);
        }
        if (typeof data.dataCompleteness === "number") {
          setDataCompleteness(data.dataCompleteness);
        }
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && insights.length === 0) {
      fetchInsights();
    }
  }, [isOpen, insights.length, fetchInsights]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Switch to chat tab when sending a message
    if (activeTab === "insights") {
      setActiveTab("chat");
    }

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;

      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10),
          userId: user?.uid,
          authToken: token,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        context: data.context,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update insights if returned
      if (data.insights && data.insights.length > 0) {
        setInsights(data.insights);
      }
      if (typeof data.dataCompleteness === "number") {
        setDataCompleteness(data.dataCompleteness);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAskAboutInsight = (insight: CrossToolInsight) => {
    const question = `Tell me more about this opportunity: "${insight.title}". What should I do about it?`;
    handleSend(question);
  };

  const quickQuestions = [
    "Am I on track to retire?",
    "How can I optimize my Social Security?",
    "Should I consider relocating?",
    "What's my biggest financial risk?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const bgClass = theme === "dark" ? "bg-slate-800" : "bg-white";
  const borderClass = theme === "dark" ? "border-slate-700" : "border-gray-200";
  const textPrimary = theme === "dark" ? "text-slate-100" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const userMessageBg = theme === "dark" ? "bg-purple-900/50" : "bg-purple-100";
  const assistantMessageBg = theme === "dark" ? "bg-slate-700" : "bg-gray-100";
  const inputBg = theme === "dark" ? "bg-slate-700" : "bg-gray-50";

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-gray-900",
    low: "bg-blue-500 text-white",
  };

  const highPriorityCount = insights.filter(
    (i) => i.priority === "critical" || i.priority === "high"
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity z-[100000]"
        style={{ backgroundColor: "rgba(107, 114, 128, 0.4)" }}
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] ${bgClass} shadow-2xl z-[100001] flex flex-col transition-transform duration-300 ease-out`}
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>RetireWise AI Coach</h2>
              <p className={`text-xs ${textSecondary}`}>
                {dataCompleteness > 0
                  ? `Analyzing ${dataCompleteness}% of your data`
                  : "Your personal retirement advisor"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 ${textPrimary}`}
            aria-label="Close AI Coach"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderClass}`}>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "text-purple-500 border-b-2 border-purple-500"
                : `${textSecondary} hover:text-purple-400`
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "insights"
                ? "text-purple-500 border-b-2 border-purple-500"
                : `${textSecondary} hover:text-purple-400`
            }`}
          >
            <LightBulbIcon className="w-4 h-4" />
            Insights
            {highPriorityCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-40px)] flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {highPriorityCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        {activeTab === "chat" ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user" ? userMessageBg : assistantMessageBg
                    } ${textPrimary}`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.context && message.context.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${borderClass}`}>
                        <p className={`text-xs ${textSecondary} mb-1`}>Analyzed:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.context.map((ctx, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-0.5 rounded ${
                                theme === "dark" ? "bg-slate-600" : "bg-gray-200"
                              }`}
                            >
                              {ctx}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${assistantMessageBg}`}>
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && !isLoading && (
              <div className={`px-4 pb-2 border-t ${borderClass}`}>
                <p className={`text-xs ${textSecondary} mb-2 pt-2`}>Quick questions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q)}
                      className={`text-xs px-3 py-2 rounded-lg border ${borderClass} ${textSecondary} hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className={`p-4 border-t ${borderClass}`}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your retirement..."
                  className={`flex-1 px-4 py-3 rounded-lg ${inputBg} ${textPrimary} border ${borderClass} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
              <p className={`text-xs ${textSecondary} mt-2 text-center`}>
                Press Enter to send • AI responses may take a moment
              </p>
            </div>
          </>
        ) : (
          /* Insights Tab */
          <div className="flex-1 overflow-y-auto p-4">
            {/* Refresh Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-sm font-semibold ${textPrimary}`}>
                Cross-Tool Opportunities
              </h3>
              <button
                onClick={fetchInsights}
                disabled={isLoadingInsights}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${textSecondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${isLoadingInsights ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-purple-500" />
                  <p className={`text-sm ${textSecondary}`}>Analyzing your data...</p>
                </div>
              </div>
            ) : insights.length === 0 ? (
              <div className={`text-center py-12 ${textSecondary}`}>
                <LightBulbIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No insights yet</p>
                <p className="text-xs">Use more planning tools to get personalized recommendations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl border ${borderClass} p-4 ${
                      theme === "dark" ? "bg-slate-700/50" : "bg-gray-50"
                    }`}
                  >
                    {/* Priority and Impact */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          priorityColors[insight.priority]
                        }`}
                      >
                        {insight.priority.toUpperCase()}
                      </span>
                      <span className={`text-xs ${textSecondary}`}>
                        ${formatNumber(insight.potentialImpact)} potential impact
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className={`text-sm font-semibold ${textPrimary} mb-1`}>
                      {insight.title}
                    </h4>

                    {/* Description */}
                    <p className={`text-xs ${textSecondary} mb-3 line-clamp-3`}>
                      {insight.description}
                    </p>

                    {/* Related Tools */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {insight.relatedTools.map((tool) => (
                        <span
                          key={tool}
                          className={`text-xs px-2 py-0.5 rounded ${
                            theme === "dark" ? "bg-slate-600" : "bg-gray-200"
                          } ${textSecondary}`}
                        >
                          {formatToolName(tool)}
                        </span>
                      ))}
                    </div>

                    {/* Ask Button */}
                    <button
                      onClick={() => handleAskAboutInsight(insight)}
                      className="w-full text-xs font-medium py-2 px-3 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                    >
                      Ask AI Coach About This
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return num.toLocaleString();
}

function formatToolName(toolId: string): string {
  const names: Record<string, string> = {
    "income-estimator": "Income",
    "ss-optimizer": "Social Security",
    "tax-analyzer": "Tax",
    "healthcare-cost": "Healthcare",
    "retire-abroad": "Retire Abroad",
    "state-relocator": "State Relocator",
    "longevity-planner": "Longevity",
    "identity-builder": "Identity",
    "volunteer-matcher": "Volunteer",
    "legacy-visualizer": "Legacy",
    "gifting-planner": "Gifting",
    "estate-manager": "Estate",
  };
  return names[toolId] || toolId;
}

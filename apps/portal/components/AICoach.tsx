"use client";

import { useState, useRef, useEffect } from "react";
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

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
}

export function AICoach({ isOpen, onClose }: AICoachProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your RetireWise AI Coach. I can help you understand your retirement plan by analyzing data across all your tools. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.slice(-10), // Last 10 messages for context
          userId: user?.uid,
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
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
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

  return (
    <>
      {/* Backdrop - 60% transparent overlay */}
      <div
        className="fixed inset-0 transition-opacity z-[100000]"
        style={{ backgroundColor: 'rgba(107, 114, 128, 0.4)' }}
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
              <p className={`text-xs ${textSecondary}`}>Your personal retirement advisor</p>
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
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions (shown when chat is empty or first message) */}
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
              onClick={handleSend}
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
      </div>
    </>
  );
}

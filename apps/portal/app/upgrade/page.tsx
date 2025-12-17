"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useUserTier} from "@/lib/useUserTier";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 queries per day",
      "Basic retirement calculations",
      "View ads to support development",
      "Community forum access",
    ],
    cta: "Current Plan",
    ctaDisabled: true,
    tier: "free",
    color: "blue",
  },
  {
    name: "Retirement Imminent",
    price: "$6.99",
    period: "/month",
    description: "For those close to retirement",
    features: [
      "100 queries per day",
      "All basic features",
      "Ad-free experience",
      "Monthly analysis reports",
      "Priority support (email)",
    ],
    cta: "Upgrade Now",
    ctaDisabled: false,
    tier: "paid",
    color: "purple",
    popular: true,
  },
  {
    name: "Retirement Consultant",
    price: "$19.99",
    period: "/month",
    description: "For professional planning",
    features: [
      "Unlimited queries",
      "All features included",
      "Ad-free experience",
      "Weekly analysis reports",
      "Priority 24/7 support (chat & email)",
      "Advanced retirement scenarios",
      "Export to PDF/Excel",
    ],
    cta: "Upgrade Now",
    ctaDisabled: false,
    tier: "paid",
    color: "amber",
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const {user} = useAuth();
  const {tier, loading: tierLoading} = useUserTier();
  const [mounted, setMounted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/auth/login");
    }
  }, [user, mounted, router]);

  if (!mounted || !user || tierLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  const handleSelectPlan = (planTier: string) => {
    if (planTier === tier) {
      // Already on this plan
      return;
    }

    setSelectedPlan(planTier);
    // In a real app, this would redirect to Stripe checkout
    // For now, show a placeholder
    alert(`Redirecting to Stripe checkout for ${planTier} plan...`);
  };

  const isCurrentPlan = (planTier: string) => {
    if (planTier === "free" && tier === "free") return true;
    if (planTier === "paid" && tier === "paid") return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-8">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 no-text-clip">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 dark:text-white">
            Choose the plan that works best for your retirement planning needs
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                isCurrentPlan(plan.tier) ? "ring-2 ring-green-500" : ""
              } ${plan.popular ? "md:scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}

              <div
                className={`p-8 bg-white dark:bg-slate-800 ${
                  plan.color === "blue"
                    ? "bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-700"
                    : plan.color === "purple"
                    ? "bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-700"
                    : "bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-700"
                }`}
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-slate-200 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900 dark:text-slate-100">{plan.price}</span>
                    <span className="text-gray-600 dark:text-slate-200">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700 dark:text-slate-200">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={isCurrentPlan(plan.tier) || plan.ctaDisabled}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan(plan.tier)
                      ? "bg-green-500 text-white cursor-default"
                      : plan.ctaDisabled
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : plan.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : plan.color === "purple"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {isCurrentPlan(plan.tier) ? "✓ Current Plan" : plan.cta}
                </button>

                {isCurrentPlan(plan.tier) && (
                  <p className="text-center text-sm text-green-600 mt-2">You are on this plan</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                immediately.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) through
                Stripe.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">
                Yes! Start with our Free plan with 5 queries per day. No credit card required.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if I cancel my subscription?</h3>
              <p className="text-gray-600">
                You can cancel anytime. Your account reverts to the Free plan, and you'll lose
                access to paid features.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do you offer annual billing?</h3>
              <p className="text-gray-600">
                Coming soon! We'll offer annual billing with 20% discount for annual commitments.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Need help choosing a plan?</h3>
              <p className="text-gray-600">
                Contact our support team at support@retirementportal.com. We're happy to help!
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to upgrade your retirement planning?</h2>
          <p className="mb-6">Start with the Free plan or choose a paid plan today</p>
          <Link
            href="/dashboard"
            className="inline-block bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Globe,
  BadgeCheck,
  CalendarCheck,
  HeartPulse,
  FilePercent,
  Scale,
  Moon,
  Sun,
} from "lucide-react";

type AppCard = {
  name: string;
  tagline: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const APPS: AppCard[] = [
  { name: "Retirement Income Planner", tagline: "Your income, clearly mapped", href: "https://retirement-planner-ai.vercel.app/", Icon: LineChart },
  { name: "Retire Abroad", tagline: "Your life — anywhere", href: "https://retire-abroad-ai.vercel.app/", Icon: Globe },
  { name: "Social Security Optimizer", tagline: "Make the most of what you earned", href: "https://social-security-optimizer.vercel.app/", Icon: BadgeCheck },
  { name: "Activity Budget Planner", tagline: "Budget for the life you want", href: "https://activity-budget-planner.vercel.app/", Icon: CalendarCheck },
  { name: "Healthcare Cost Calculator", tagline: "Plan for care with clarity", href: "https://healthcare-cost-git-main-eappells-projects.vercel.app/", Icon: HeartPulse },
  { name: "Tax Impact Analyzer", tagline: "Understand the impact before it hits", href: "https://tax-impact-analyzer-git-master-eappells-projects.vercel.app/", Icon: FilePercent },
  { name: "Pension vs Lump Sum Analyzer", tagline: "Choose with confidence", href: "https://pension-vs-lumpsum-analyzer.vercel.app/", Icon: Scale },
];

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rp_theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = saved ? saved === "dark" : prefersDark;
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem("rp_theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  return { dark, toggle };
}

export default function PortalHome() {
  const { dark, toggle } = useTheme();
  const apps = useMemo(() => APPS, []);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Replace this placeholder with your nest-egg logo image */}
            <div className="h-10 w-10 rounded-2xl bg-brand-gold/20 grid place-items-center border border-border/40">
              <span className="text-sm font-semibold text-text-primary">🪺</span>
            </div>

            <div>
              <div className="text-lg font-semibold leading-tight">Retirement Portal</div>
              <div className="text-sm text-text-secondary">Plan with Clarity. Live with Confidence.</div>
            </div>
          </div>

          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm font-semibold shadow-card dark:shadow-card-dark"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="icon-md" /> : <Moon className="icon-md" />}
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-surface p-8 shadow-card dark:shadow-card-dark border border-border/40">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight">
              Plan with Clarity. Live with Confidence.
            </h1>
            <p className="mt-3 text-base text-text-secondary">
              A friendly, powerful set of tools to help you plan retirement, explore life abroad, and confidently navigate what comes next.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={apps[0].href}
                className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-navy"
              >
                Get Started
              </a>
              <a
                href="#tools"
                className="inline-flex items-center justify-center rounded-xl border border-brand-gold/70 px-5 py-3 text-sm font-semibold text-text-primary"
              >
                Explore the Tools
              </a>
            </div>
          </div>
        </div>

        {/* Tools grid */}
        <section id="tools" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Your tools, all in one place</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Compare scenarios. Understand tradeoffs. Make confident decisions — without the overwhelm.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map(({ name, tagline, href, Icon }) => (
              <div
                key={name}
                className="rounded-2xl border border-border/50 bg-surface p-5 shadow-card dark:shadow-card-dark"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-gold/15 border border-border/40">
                    <Icon className="icon-lg text-text-primary" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-lg font-semibold leading-snug">{name}</div>
                  <div className="mt-1 text-sm text-text-secondary">{tagline}</div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-semibold text-brand-navy"
                  >
                    Open Tool
                  </a>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Learn more
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pb-10 text-sm text-text-secondary">
          <div className="border-t border-border/50 pt-6">
            Built for trust, growth, optimism, and adventure — including retiring abroad.
          </div>
        </footer>
      </main>
    </div>
  );
}

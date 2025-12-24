"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { useTheme } from "@/lib/theme";
import Image from "next/image";
import logoSmBlack from "../public/images/RetireWise-Logo-sm-black-notag.png";
import logoSmWhite from "../public/images/RetireWise-Logo-sm-white-notag.png";
import { AppSwitcher } from "./AppSwitcher";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  showAppSwitcher?: boolean;
}

export default function Header({ showAppSwitcher = false }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const headerBgClass = theme === "dark" ? "bg-[#1A2A40] shadow" : "bg-white shadow";
  const headerBorderClass = theme === "dark" ? "border-b border-[#1A2A40]" : "border-b border-white";
  const textPrimary = theme === "light" ? "text-gray-900" : "text-slate-100";
  const textSecondary = theme === "light" ? "text-gray-600" : "text-slate-400";
  const linkText = theme === "light" ? "text-gray-700 hover:text-purple-600" : "text-slate-300 hover:text-purple-400";
  const borderColor = theme === "light" ? "border-gray-200" : "border-slate-700";
  const dropdownBg = theme === "light" ? "bg-[#F9F8F6]" : "bg-slate-800";

  const handleLogout = async () => {
    await trackEvent({
      eventType: "logout",
      application: "portal",
    });
    await logout();
    setIsMenuOpen(false);
    router.push("/");
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const getTierBadgeColor = () => {
    switch (tier) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "paid":
        return "bg-purple-100 text-purple-800";
      case "free":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTierLabel = () => {
    if (user?.isAnonymous) return "Guest";
    if (tier === "admin") return "Admin";
    if (tier === "paid") return "Premium";
    return "Free";
  };

  // expose header height so other components can position relative to it
  useEffect(() => {
    const el = document.getElementById('portal-header-content');
    if (!el) return;
    const setHeight = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--portal-header-height', `${h}px`);
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    const t = setTimeout(setHeight, 500);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  return (
    <header className="relative z-50">
      {/* Full-bleed background using fixed positioning so it spans the entire viewport */}
      {/* Use pointer-events-none so it doesn't intercept clicks; shadow for separation */}
      <div className={`fixed top-0 left-0 right-0 z-40 pointer-events-none ${headerBgClass} bg-opacity-100 backdrop-blur-none ${headerBorderClass} shadow-sm h-20`} />
      {/* NOTE: header content itself remains in a constrained container below and will be sticky */}

      <div id="portal-header-content" className="sticky top-0 z-50 bg-transparent max-w-[1400px] mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 -ml-5">
            <Image
              src={theme === "light" ? logoSmBlack : logoSmWhite}
              alt="RetireWise"
              height={65}
              className="w-auto transform origin-left"
            />
          </Link>

          {/* Centered App Switcher - only shown when an app is loaded */}
          <div className="flex-1 flex justify-center">
            {showAppSwitcher && <AppSwitcher />}
          </div>

          {/* Right Side Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {!user?.isAnonymous && !tierLoading && tier !== "paid" && tier !== "admin" && (
              <div className="group relative">
                <Link href="/upgrade" className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 mr-4 transition">
                  Upgrade
                </Link>
                <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  Upgrade to premium
                </div>
              </div>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Tier Badge */}
            {!tierLoading && (
              <span
                className={`hidden sm:inline-block px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeColor()}`}
              >
                {getTierLabel()}
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`hidden sm:inline-flex items-center justify-center p-2 rounded-lg ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-800'} transition-colors group relative cursor-pointer`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 dark:bg-gray-700">
                {theme === "light" ? "Dark mode" : "Light mode"}
              </div>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden inline-flex items-center justify-center p-2 rounded-md ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Desktop User Menu */}
            <div className={`hidden md:flex items-center gap-4 border-l ${borderColor} pl-4`}>
              <div className="text-right group relative">
                <p className={`text-sm font-semibold ${textPrimary} cursor-help`}>
                  {user?.email || "Guest User"}
                </p>
                <p className={`text-xs ${textSecondary}`}>
                  {tierLoading ? "Loading..." : getTierLabel()}
                </p>
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {user?.metadata?.creationTime
                    ? `Member since ${new Date(user.metadata.creationTime).toLocaleDateString()}`
                    : "Account information"}
                </div>
              </div>
              <div 
                className="relative"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                <button className="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-white" style={{backgroundColor: '#0B5394'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}>
                  {user?.email ? user.email[0].toUpperCase() : "G"}
                </button>
                {isProfileMenuOpen && (
                  <div 
                    className={`absolute right-0 top-full w-48 pt-1`}
                    style={{ zIndex: 9999 }}
                  >
                    <div className={`${dropdownBg} rounded-lg shadow-lg border ${theme === 'light' ? 'border-gray-200' : 'border-slate-700'}`}>
                      <button
                        onClick={() => handleNavClick("/profile")}
                        className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-200 hover:bg-slate-700'} rounded-t-lg`}
                      >
                        My Profile
                      </button>
                      {tier === "admin" && (
                        <button
                          onClick={() => handleNavClick("/admin/dashboard")}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-200 hover:bg-slate-700'}`}
                        >
                          Admin Dashboard
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-red-600 hover:bg-red-50 border-t border-gray-200 rounded-b-lg' : 'text-red-400 hover:bg-slate-700 border-t border-slate-700 rounded-b-lg'}`}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
            <button
              onClick={() => handleNavClick("/dashboard")}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Dashboard
            </button>
            {!user?.isAnonymous && tier !== "paid" && tier !== "admin" && (
              <button
                onClick={() => handleNavClick("/upgrade")}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Upgrade
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === "light" ? (
                <>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                  Dark Mode
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 0l-.707.707A1 1 0 005.05 6.464l.707-.707a1 1 0 001.414-1.414zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Light Mode
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

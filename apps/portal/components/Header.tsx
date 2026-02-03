"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { useTheme } from "@/lib/theme";
import Image from "next/image";
import logoSmBlack from "../public/images/RetireWise-Logo-black-notag-240.png";
import logoSmWhite from "../public/images/RetireWise-Logo-white-notag-240.png";
import logo80Black from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logo80White from "../public/images/RetireWise-Logo-80h-white-tag.png";
import nesteggLight from "../public/images/Nestegg-light.png";
import nesteggDark from "../public/images/NesteggOnly-dark.png";
import { AppLauncher } from "./AppLauncher";
import { SunIcon, MoonIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  onAICoachOpen?: () => void;
}

export function Header({ onAICoachOpen }: HeaderProps = {}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAdminSubmenuOpen, setIsAdminSubmenuOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState(false);
  const [hoveredUserInfo, setHoveredUserInfo] = useState(false);
  const [hoveredUpgrade, setHoveredUpgrade] = useState(false);
  const [suppressHoverTooltips, setSuppressHoverTooltips] = useState(false);

  const headerBgClass = theme === "dark" ? "bg-[#1A2A40] shadow" : "bg-white shadow";
  const headerBorderClass = theme === "dark" ? "border-b border-[#1A2A40]" : "border-b border-white";
  const textPrimary = theme === "light" ? "text-gray-900" : "text-slate-100";
  const textSecondary = theme === "light" ? "text-gray-600" : "text-slate-400";
  const linkText = theme === "light" ? "text-gray-700 hover:text-purple-600" : "text-slate-300 hover:text-purple-400";
  const borderColor = theme === "light" ? "border-gray-200" : "border-slate-700";
  const dropdownBg = theme === "light" ? "bg-[#F9F8F6]" : "bg-slate-800";
  const headerBgColor = theme === "dark" ? "#1A2A40" : "#ffffff";

  // Shrinking header behavior: full height -> compact
  const [isScrolled, setIsScrolled] = useState(false);

  // Heights in px used for layout / CSS variable
  const EXPANDED_HEIGHT = 100; // approx full header height
  const COMPACT_HEIGHT = 60; // compact header height when scrolled

  // On scroll, set a compact header state once past a small threshold
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 20) setIsScrolled(true);
      else setIsScrolled(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Also listen for scroll messages from embedded iframes
    const handleMessage = (e: MessageEvent) => {
      try {
        if (e?.data?.type === 'IFRAME_SCROLL') {
          const sc = !!e.data.scrolled;
          setIsScrolled(sc);
        }
      } catch (err) {
        // ignore malformed messages
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Update CSS variable so page content can reserve space for the fixed header
  useEffect(() => {
    const height = isScrolled ? COMPACT_HEIGHT : EXPANDED_HEIGHT;
    try {
      document.documentElement.style.setProperty('--portal-header-height', `${height}px`);
    } catch (e) {
      // ignore
    }
  }, [isScrolled]);

  useEffect(() => {
    console.log('Header mounted');
  }, []);

  // When other menus open (like the app launcher), temporarily suppress header tooltips
  useEffect(() => {
    const handlePortalMenuOpened = () => {
      console.log('Header: portal-menu-opened received, suppressing tooltips');
      setSuppressHoverTooltips(true);
      // Also add a global class so non-React tooltip elements are suppressed
      document.documentElement.classList.add('suppress-tooltips');

      // hide any visible tooltips immediately
      setHoveredTheme(false);
      setHoveredUserInfo(false);
      setHoveredUpgrade(false);

      const openTs = performance.now();
      const onFirstPointerMove = () => {
        const now = performance.now();
        console.log('Header: pointermove after open delta=', now - openTs);
        // only clear suppression if the move happened after a short delay (ignore synthetic moves from the click itself)
        if (now - openTs > 40) {
          setSuppressHoverTooltips(false);
          document.documentElement.classList.remove('suppress-tooltips');
          document.removeEventListener('pointermove', onFirstPointerMove, true);
        }
      };

      // Capture the next pointer move anywhere on the page to re-enable tooltips
      document.addEventListener('pointermove', onFirstPointerMove, true);
    };

    const handlePortalMenuClosed = () => {
      // Ensure the class is removed when menus are explicitly closed
      console.log('Header: portal-menu-closed received, removing suppress class');
      setSuppressHoverTooltips(false);
      document.documentElement.classList.remove('suppress-tooltips');
    };

    window.addEventListener('portal-menu-opened', handlePortalMenuOpened);
    window.addEventListener('portal-menu-closed', handlePortalMenuClosed);
    return () => {
      window.removeEventListener('portal-menu-opened', handlePortalMenuOpened);
      window.removeEventListener('portal-menu-closed', handlePortalMenuClosed);
    };
  }, []);

  // Use the small no-tag logo variants for the header, and change display height when scrolled
  const logoSrc = theme === "light" ? logoSmBlack : logoSmWhite;
  const logoMeta: any = logoSrc;
  // Start at 65px and shrink to 40px when scrolled
  const LOGO_DISPLAY_HEIGHT = isScrolled ? 40 : 65;
  const logoWidthFor65 = (logoMeta?.width && logoMeta?.height) ? Math.round((logoMeta.width / logoMeta.height) * LOGO_DISPLAY_HEIGHT) : undefined;

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

  return (
    <header
      className={`${headerBgClass} fixed top-0 left-0 right-0 bg-opacity-100 backdrop-blur-none ${headerBorderClass} transition-all duration-300`}
      style={{ height: isScrolled ? COMPACT_HEIGHT : EXPANDED_HEIGHT, zIndex: 99999, backgroundColor: headerBgColor }}
    >
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
        <div className="flex items-center">
          {/* App Launcher Grid Icon */}
          <div className="mr-2">
            <AppLauncher />
          </div>

          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <Image
              src={logoSrc}
              alt="RetireWise"
              width={logoWidthFor65}
              height={LOGO_DISPLAY_HEIGHT}
              className={`w-auto object-contain transform origin-left transition-all duration-300 ${isScrolled ? 'h-[40px] min-h-[40px]' : 'h-[65px] min-h-[65px]'}`}
              priority
            />
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Centered Tagline with Nestegg */}
          <div className={`hidden lg:flex items-center gap-3 transition-all duration-300 ${isScrolled ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
            <span className={`text-lg font-medium ${textSecondary}`}>Plan with Clarity.</span>
            <Image
              src={theme === "light" ? nesteggLight : nesteggDark}
              alt="Nestegg"
              width={32}
              height={32}
              className="w-8 h-8 object-contain hidden"
            />
            <span className={`text-lg font-medium ${textSecondary}`}>Live with Confidence.</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Side Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {/* AI Coach Button */}
            {onAICoachOpen && (
              <button
                onClick={onAICoachOpen}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md text-sm font-medium hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all mr-2"
                aria-label="Open AI Coach"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>AI Coach</span>
              </button>
            )}

            {!user?.isAnonymous && !tierLoading && tier !== "paid" && tier !== "admin" && (
              <div
                className="relative"
                onPointerMove={() => { setSuppressHoverTooltips(false); setHoveredUpgrade(true); }}
                onPointerLeave={() => setHoveredUpgrade(false)}
              >
                <Link href="/upgrade" className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 mr-4 transition">
                  Upgrade
                </Link>
                <div
                  role="tooltip"
                  aria-hidden={!hoveredUpgrade || suppressHoverTooltips}
                  className={`absolute top-full left-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded transition-all whitespace-nowrap z-50 ${hoveredUpgrade && !suppressHoverTooltips ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                >
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
                className={`header-tooltip hidden sm:inline-block px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeColor()}`}
              >
                {getTierLabel()}
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`group hidden sm:inline-flex items-center justify-center p-2 rounded-lg ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-800'} transition-colors relative cursor-pointer`}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
              <span
                role="tooltip"
                className="header-tooltip absolute top-full left-1/2 -translate-x-1/2 mt-2"
              >
                {theme === "light" ? "Dark mode" : "Light mode"}
              </span>
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
              <div
                className="text-right relative"
                onPointerMove={() => { setSuppressHoverTooltips(false); setHoveredUserInfo(true); }}
                onPointerLeave={() => setHoveredUserInfo(false)}
              >
                <p className={`text-sm font-semibold ${textPrimary} cursor-help`}>
                  {user?.email || "Guest User"}
                </p>
                <p className={`text-xs ${textSecondary}`}>
                  {tierLoading ? "Loading..." : getTierLabel()}
                </p>
                <div
                  role="tooltip"
                  aria-hidden={!hoveredUserInfo || suppressHoverTooltips}
                  className={`header-tooltip absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded transition-all whitespace-nowrap z-50 ${hoveredUserInfo && !suppressHoverTooltips ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                >
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
                <button className="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-white" style={{backgroundColor: '#0B5394', color: '#ffffff'}} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#094170'; e.currentTarget.style.color = '#ffffff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0B5394'; e.currentTarget.style.color = '#ffffff'; }}>
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
                        <div className="w-full">
                          <button
                            onClick={() => setIsAdminSubmenuOpen((s) => !s)}
                            className={`flex items-center justify-between w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-200 hover:bg-slate-700'}`}
                          >
                            <span>Admin Dashboard</span>
                            <span className="ml-2 text-xs opacity-70">{isAdminSubmenuOpen ? '▾' : '▸'}</span>
                          </button>
                          {isAdminSubmenuOpen && (
                            <div className="pl-4">
                              <button
                                onClick={() => handleNavClick('/admin/dashboard?tab=users')}
                                className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-200 hover:bg-slate-700'}`}
                              >
                                Manage Users
                              </button>
                              <button
                                onClick={() => handleNavClick('/admin/dashboard?tab=apps')}
                                className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-slate-200 hover:bg-slate-700'}`}
                              >
                                Manage Apps
                              </button>
                            </div>
                          )}
                        </div>
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

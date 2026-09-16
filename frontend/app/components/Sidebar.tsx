"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, Settings, Briefcase, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import DevRoleSwitcher from "./DevRoleSwitcher";

export default function Sidebar({ user, initialRole }: { user: any; initialRole: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = initialRole?.toLowerCase() || "candidate";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Reusable nav link with active-state highlighting
  const NavLink = ({
    href,
    icon: Icon,
    children,
  }: {
    href: string;
    icon: any;
    children: React.ReactNode;
  }) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
        {!isCollapsed && <span className="truncate">{children}</span>}
      </Link>
    );
  };

  // Profile link — same active-state logic, explicit <Link href="/profile">
  const isProfileActive = pathname === "/profile";

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <Link
          href={role === "hr" ? "/dashboard" : "/candidate/dashboard"}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <span className="font-bold text-slate-800">TalentGraph AI</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile overlay ───────────────────────────────────────── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 bg-white border-r border-slate-200 shadow-sm flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="p-6 overflow-y-auto">
          {/* Logo & Toggle */}
          <div className={`hidden md:flex items-center justify-between mb-10 ${isCollapsed ? "flex-col gap-4" : ""}`}>
            <Link
              href={role === "hr" ? "/dashboard" : "/candidate/dashboard"}
              className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
                T
              </div>
              {!isCollapsed && (
                <span className="font-bold text-lg text-slate-800 hover:text-indigo-600 transition-colors truncate">
                  TalentGraph AI
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* ── Workspace nav ──────────────────────────────────── */}
          {!isCollapsed && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-8 md:mt-0">
              Workspace
            </div>
          )}
          <nav className="space-y-1">
            {role === "hr" ? (
              <>
                <NavLink href="/dashboard"    icon={LayoutDashboard}>Dashboard</NavLink>
                <NavLink href="/requisitions" icon={Briefcase}>Requisitions</NavLink>
                <NavLink href="/evaluate"     icon={FileText}>Evaluate</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/candidate/dashboard" icon={LayoutDashboard}>
                  Candidate Portal
                </NavLink>
              </>
            )}
          </nav>

          {/* ── Manage nav ─────────────────────────────────────── */}
          {!isCollapsed && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-8 mb-4">
              Manage
            </div>
          )}
          <nav className="space-y-1">
            {/* Profile — works for BOTH hr and candidate roles */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                isProfileActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
              }`}
            >
              <Settings className={`w-5 h-5 shrink-0 ${isProfileActive ? "text-indigo-600" : "text-slate-400"}`} />
              {!isCollapsed && <span className="truncate">Profile</span>}
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0 text-slate-400" />
              {!isCollapsed && <span className="truncate">Log out</span>}
            </button>
          </nav>
        </div>

        {/* ── User footer ────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-8 h-8 shrink-0 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold shadow-sm">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            {!isCollapsed && (
              <div
                className="text-sm font-semibold text-slate-700 truncate"
                title={user?.email}
              >
                {user?.email}
              </div>
            )}
          </div>

          {!isCollapsed && process.env.NODE_ENV === "development" && (
            <div>
              <DevRoleSwitcher currentRole={role || "candidate"} />
            </div>
          )}
          

        </div>
      </aside>
    </>
  );
}

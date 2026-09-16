"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrainCircuit, ShieldCheck, SearchCheck, FileText, Calculator, Code2, Users, ArrowRightLeft } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [mounted, setMounted] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const handleScroll = () => {
      const sections = ['home', 'about', 'how-it-works', 'features'];
      let current = 'home';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el && window.scrollY >= (el.offsetTop - 100)) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [supabase.auth]);

  const handleLogin = async (role: 'hr' | 'candidate') => {
    document.cookie = `user_role=${role}; path=/; SameSite=Lax`;
    document.cookie = `intended_role=${role}; path=/; SameSite=Lax`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        queryParams: { prompt: 'select_account' },
      },
    });
  };

  const agentCards = [
    { num: '1', label: 'Resume Analyzer',    desc: 'Entity extraction & normalization',  Icon: FileText       },
    { num: '2', label: 'Job Fit Agent',       desc: 'Deterministic overlap math',         Icon: Calculator     },
    { num: '3', label: 'Tech Screener',       desc: 'Targeted deficit questioning',        Icon: Code2          },
    { num: '4', label: 'Culture Fit',         desc: 'Behavioral calibration',              Icon: Users          },
    { num: '5', label: 'Chief Orchestrator',  desc: 'Synthesis & Dossier Generation',      Icon: BrainCircuit   },
  ];

  const featureCards = [
    { title: 'Autonomous 5-Agent Pipeline',     desc: 'A robust multi-agent orchestrator that analyzes, screens, and evaluates candidates end-to-end.',              Icon: BrainCircuit  },
    { title: 'Deterministic Competency Math',   desc: 'Advanced algorithmic matching to quantify skill overlap and exact deficit metrics.',                          Icon: Calculator    },
    { title: 'Forensic Digital Verification',   desc: 'Deep cross-referencing to verify claims, validate tenure, and ensure authenticity.',                          Icon: ShieldCheck   },
    { title: 'Enterprise RBAC & PDF Export',    desc: 'Role-based access control ensures candidates never see interview questions. PDF downloads enforce this strictly.',  Icon: SearchCheck   },
    { title: 'Transparent Deficit Feedback',    desc: 'Actionable, clear reporting on exact skill gaps and missing competencies for every candidate.',               Icon: FileText      },
    { title: 'Cross-Requisition Salvaging',     desc: 'Automatically rematches rejected candidates to other open roles within your organization.',                   Icon: ArrowRightLeft},
  ];

  if (!mounted) return null;

  return (
    <div className="bg-white text-slate-900 font-sans min-h-screen selection:bg-blue-100 overflow-x-hidden">

      {/* ── Curved Glassmorphic Arch Background ──────────────────────── */}
      <div className="absolute top-0 left-0 w-full h-[700px] bg-gradient-to-b from-blue-50 to-white rounded-b-[100%] border-b border-blue-100 shadow-[0_10px_50px_rgba(59,130,246,0.05)] -z-10" />

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <BrainCircuit className="w-6 h-6 text-blue-600" />
            <span className="font-black text-xl tracking-tight text-slate-900">TalentGraph</span>
          </div>

          {/* Centered Links */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {[
              { label: 'Home', id: 'home' },
              { label: 'About', id: 'about' },
              { label: 'How it Works', id: 'how-it-works' },
            ].map(({ label, id }) => (
              <a
                key={id}
                href={`#${id}`}
                className={`text-sm font-semibold transition-colors ${activeSection === id ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
              >
                {label}
              </a>
            ))}
          </div>


        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section id="home" className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-8 max-w-[1000px] mx-auto gap-4 relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Autonomous AI Hiring Intelligence
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.08]">
          Transform Your Hiring Pipeline<br />
          <span className="text-blue-600">with Autonomous AI Intelligence.</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl leading-relaxed">
          The world&apos;s first autonomous platform powered by a sophisticated 5-Agent pipeline. Verify truth, match talent, and generate enterprise-grade evaluation dossiers in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-0">
          {session ? (
            <button
              onClick={() => {
                const role = session.user.user_metadata?.role || 'candidate';
                router.push(role === 'hr' ? '/dashboard' : '/candidate/dashboard');
              }}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-all shadow-xl shadow-blue-900/15 hover:-translate-y-0.5"
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button
                id="btn-signin-hr"
                onClick={() => handleLogin('hr')}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-all shadow-xl shadow-blue-900/15 hover:-translate-y-0.5"
              >
                Sign In as HR
              </button>
              <button
                id="btn-signin-candidate"
                onClick={() => handleLogin('candidate')}
                className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full font-bold transition-all shadow-sm hover:-translate-y-0.5"
              >
                Sign In as Candidate
              </button>
            </>
          )}
        </div>

        {/* 5-Agent Pipeline Visual */}
        <div className="w-full mt-6 max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-200/30 via-blue-100/30 to-indigo-100/30 rounded-[2.5rem] blur-3xl -z-10 opacity-70" />
          <div className="bg-white/70 backdrop-blur-3xl border border-white/80 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/8 relative">
            <h3 className="text-lg font-bold text-slate-700 mb-8 flex items-center justify-center gap-3">
              <BrainCircuit className="w-5 h-5 text-blue-600" /> Multi-Agent Orchestration Pipeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {agentCards.map(({ num, label, desc, Icon }, idx) => (
                <div
                  key={num}
                  className="flex flex-col items-center text-center rounded-2xl bg-white p-6 transition-all duration-500 ease-out hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] border hover:border-blue-400 cursor-default animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-black text-blue-500 mb-1">Agent {num}</div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1.5">{label}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6 bg-slate-50">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            About the System
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Built for the Era of<br />Autonomous Talent Intelligence</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Traditional recruiting is broken by human bias and scale limitations. TalentGraph AI leverages a network of specialized autonomous agents to process, evaluate, and verify candidates with absolute precision.
          </p>
        </div>
      </section>
      
      {/* ── How it Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            How It Works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">From Resume to Dossier<br />in Seconds</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Candidates submit their applications. Our pipeline mathematically evaluates skill overlap, forensically verifies credentials against real-world digital footprints, and generates a comprehensive evaluation dossier for HR review — with full RBAC-secured PDF export.
          </p>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-[1200px] mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            Platform Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything You Need to<br />Run Enterprise Hiring at Scale</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            AI-powered, enterprise-grade, and built with security-first RBAC from day one.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureCards.map(({ title, desc, Icon }, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(37,99,235,0.25)] hover:border-blue-500 group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">{title}</h4>
              <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-slate-200 mt-4">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-600" />
            <span className="font-black text-slate-800">TalentGraph</span>
          </div>
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} TalentGraph AI. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
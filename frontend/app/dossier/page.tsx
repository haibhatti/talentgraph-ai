"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRightLeft, Activity, Briefcase, Loader2, Download } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { Suspense } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PRINT DOCUMENT — rendered into the html2pdf target container
// RBAC: Technical Screen Kit & Culture Fit ONLY shown to non-candidates
// ─────────────────────────────────────────────────────────────────────────────
function PrintDocument({ dossier, companyName, overrideJustification, userRole }: {
  dossier: any;
  companyName: string;
  overrideJustification: string;
  userRole: string;
}) {
  const matchedSkills: string[] = dossier.skills_matched || dossier.job_fit?.matched_skills || [];
  const missingSkills: string[] = dossier.critical_skill_deficits || dossier.job_fit?.missing_skills || [];
  const questions: any[] = dossier.technical_interview_pack?.questions || dossier.technical_screen?.questions || [];
  const cultureQuestions: any[] = dossier.behavioral_interview_pack?.questions || dossier.culture_fit?.questions || [];
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const candidateName = dossier.candidate_name || dossier.parsed_resume?.candidate_name || "Unknown Candidate";
  const candidateEmail = dossier.candidate_email || dossier.parsed_resume?.contact_email || "";
  const candidatePhone = dossier.parsed_resume?.phone || dossier.parsed_resume?.contact_phone || "";
  const candidateGithub = dossier.parsed_resume?.github_url || dossier.parsed_resume?.github || "";
  const score = dossier.quantitative_match_score ?? dossier.score ?? 0;
  const verdict = dossier.verdict || dossier.overall_recommendation || "PENDING";
  const confidence = dossier.hire_confidence_score ?? dossier.score ?? 0;

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#1e293b', background: '#fff', padding: '48px' }}>
      {/* Accent top border */}
      <div style={{ width: '100%', height: '6px', backgroundColor: '#4f46e5', marginBottom: '32px' }} />

      {/* Document Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5' }}>TalentGraph AI</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
            {companyName || "Enterprise HR Intelligence"}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Autonomous Candidate Evaluation Platform</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Generated</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginTop: '4px' }}>{generatedDate}</div>
          {userRole === 'hr' && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginTop: '4px', letterSpacing: '1px' }}>CONFIDENTIAL — FOR HR USE ONLY</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px solid #e2e8f0', marginBottom: '32px' }} />

      {/* Candidate Title */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px', color: '#4f46e5', marginBottom: '8px' }}>
          Candidate Evaluation Dossier
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>{candidateName}</h1>
        {candidateEmail && (
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            📧 {candidateEmail}
          </div>
        )}
        {candidatePhone && (
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            📞 {candidatePhone}
          </div>
        )}
        {candidateGithub && (
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            🐙 {candidateGithub}
          </div>
        )}
        {!candidatePhone && !candidateGithub && <div style={{ marginBottom: '16px' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              padding: '6px 16px',
              fontWeight: 700,
              fontSize: '13px',
              border: '2px solid',
              borderColor: verdict.includes("HIRE") && !verdict.includes("RE-EVALUATE") ? '#10b981' : '#ef4444',
              color: verdict.includes("HIRE") && !verdict.includes("RE-EVALUATE") ? '#065f46' : '#991b1b',
              display: 'inline-block',
            }}
          >
            VERDICT: {verdict}
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            <span style={{ fontWeight: 700 }}>Job Fit Score:</span> {Math.round(score)}%
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            <span style={{ fontWeight: 700 }}>Hire Confidence:</span> {Math.round(confidence)}%
          </div>
        </div>
      </div>

      {/* Human Override */}
      {(overrideJustification || dossier.human_override_justification) && (
        <div style={{ marginBottom: '32px', padding: '16px', border: '2px solid #a5b4fc', backgroundColor: '#eef2ff' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#3730a3', marginBottom: '8px' }}>
            ⚠ Human HR Override Applied
          </div>
          <p style={{ fontSize: '13px', color: '#1e293b' }}>
            {overrideJustification || dossier.human_override_justification}
          </p>
        </div>
      )}

      {/* Executive Summary */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
          Executive Summary
        </div>
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
          {dossier.executive_summary || dossier.job_fit?.reasoning || "No summary available."}
        </p>
      </div>

      {/* Skills Table */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
          Skills Analysis
        </div>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#374151', border: '1px solid #e2e8f0' }}>#</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#374151', border: '1px solid #e2e8f0' }}>Skill</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#374151', border: '1px solid #e2e8f0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {matchedSkills.map((skill: string, i: number) => (
              <tr key={`m-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>{skill}</td>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#065f46' }}>✓ Matched</td>
              </tr>
            ))}
            {missingSkills.map((skill: string, i: number) => (
              <tr key={`x-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff8f8' : '#fff1f2' }}>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', color: '#64748b' }}>{matchedSkills.length + i + 1}</td>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>{skill}</td>
                <td style={{ padding: '10px 16px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#991b1b' }}>✗ Missing</td>
              </tr>
            ))}
            {matchedSkills.length === 0 && missingSkills.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                  No skill data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Technical Screen Kit — HR ONLY (RBAC) */}
      {userRole !== 'candidate' && questions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
            Technical Screen Kit — Interview Questions
          </div>
          {questions.map((q: any, i: number) => (
            <div
              key={i}
              style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ color: '#4f46e5', fontWeight: 900, fontSize: '13px', width: '32px', flexShrink: 0 }}>Q{i + 1}</div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', lineHeight: '1.5' }}>{q.question}</p>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <span style={{ fontWeight: 700, color: '#374151' }}>Target Skill: </span>
                    {q.target_skill || (q.expected_answer_concepts || []).join(", ")}
                  </div>
                  {(q.expected_answer_concepts || []).length > 0 && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#374151' }}>Expected Concepts: </span>
                      {(q.expected_answer_concepts || []).join("; ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Culture Fit — HR ONLY (RBAC) */}
      {userRole !== 'candidate' && cultureQuestions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
            Culture Fit & Behavioral Questions
          </div>
          {cultureQuestions.map((q: any, i: number) => (
            <div
              key={i}
              style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}
            >
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', lineHeight: '1.5' }}>{q.question}</p>
              {q.purpose && (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  <span style={{ fontWeight: 700, color: '#374151' }}>Purpose: </span>{q.purpose}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Powered by TalentGraph AI — 5-Agent Autonomous Evaluation Pipeline</div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Page 1 of 1 · CONFIDENTIAL</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DOSSIER CONTENT
// ─────────────────────────────────────────────────────────────────────────────
function DossierContent() {
  const searchParams = useSearchParams();
  const [dossier, setDossier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState("candidate");
  const [companyName, setCompanyName] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const dossierRef = useRef<HTMLDivElement>(null);

  // Human Override — React state (not DOM selectors)
  const [overrideVerdict, setOverrideVerdict] = useState("Strong Hire");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    const fetchDossier = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      setUserRole(session?.user?.user_metadata?.role || "candidate");
      setCompanyName(session?.user?.user_metadata?.company_name || "Enterprise HR");
      setSessionToken(session?.access_token || "");

      const id = searchParams.get("id");
      if (id) {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/v1/evaluations/${id}`, {
            headers: { Authorization: `Bearer ${session?.access_token || ""}` },
          });
          if (res.ok) {
            const data = await res.json();
            setDossier({
              ...data.full_dossier,
              candidate_name: data.candidate_name || data.full_dossier?.candidate_name,
              score: data.score ?? data.full_dossier?.score,
              verdict: data.verdict || data.full_dossier?.verdict,
            });
          } else {
            console.error("Failed to fetch evaluation:", res.status);
          }
        } catch (error) {
          console.error("Error fetching evaluation:", error);
        }
      } else {
        const raw = sessionStorage.getItem("dossierData");
        if (raw) setDossier(JSON.parse(raw));
      }
      setIsLoading(false);
    };
    fetchDossier();
  }, [searchParams]);

  const handleDownloadPDF = async () => {
    if (!dossierRef.current) return;
    setIsDownloading(true);
    try {
      // Dynamically import html2pdf.js (client-side only)
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: "Candidate_Evaluation.pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };
      await html2pdf().set(opt).from(dossierRef.current).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideJustification.trim()) {
      alert("Please provide a justification for the override.");
      return;
    }
    const id = searchParams.get("id");
    if (!id) {
      alert("No evaluation ID found. Please open this dossier from the dashboard.");
      return;
    }
    setIsOverriding(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/evaluations/${id}/override`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ verdict: overrideVerdict, justification: overrideJustification }),
      });
      if (res.ok) {
        const data = await res.json();
        setDossier((prev: any) => ({
          ...prev,
          verdict: data.verdict || overrideVerdict,
          human_override_justification: overrideJustification,
        }));
        setOverrideSuccess(true);
        setTimeout(() => setOverrideSuccess(false), 4000);
      } else {
        alert("Failed to apply override. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error while applying override.");
    } finally {
      setIsOverriding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <p className="text-[#64748b] mb-4">No active session found.</p>
          <Link href="/evaluate" className="text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-full font-bold transition-colors">
            Start New Screening
          </Link>
        </div>
      </div>
    );
  }

  const isHire =
    dossier.verdict &&
    dossier.verdict.toUpperCase().includes("HIRE") &&
    !dossier.verdict.toUpperCase().includes("RE-EVALUATE");

  const candidateName = dossier.candidate_name || dossier.parsed_resume?.candidate_name || "Unknown Candidate";
  const candidateEmail = dossier.candidate_email || dossier.parsed_resume?.contact_email || "";
  const candidatePhone = dossier.parsed_resume?.phone || dossier.parsed_resume?.contact_phone || "";
  const candidateGithub = dossier.parsed_resume?.github_url || dossier.parsed_resume?.github || "";
  const forensicScore = dossier.job_fit?.forensic_confidence_score ?? 50;
  const forensicNote = dossier.job_fit?.forensic_verification_note || "No specific entities extracted for verification.";
  const alternativeMatches: any[] = dossier.alternative_matches || [];
  const matchedSkills: string[] = dossier.skills_matched || dossier.job_fit?.matched_skills || [];
  const missingSkills: string[] = dossier.critical_skill_deficits || dossier.job_fit?.missing_skills || [];
  const score = dossier.quantitative_match_score ?? dossier.score ?? 0;

  return (
    <div className="w-full font-sans text-slate-700">

      {/* ═══ WEB UI ═══════════════════════════════════════════════════════════ */}
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-indigo-500 text-sm font-bold tracking-wider uppercase flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Candidate Evaluation
              </p>
              {alternativeMatches.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-orange-200">
                  <ArrowRightLeft className="w-3 h-3" /> Salvaged for Alternative Role
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-1">{candidateName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
              {candidateEmail && (
                <span className="text-slate-500 text-sm font-medium">📧 {candidateEmail}</span>
              )}
              {candidatePhone && (
                <span className="text-slate-500 text-sm font-medium">📞 {candidatePhone}</span>
              )}
              {candidateGithub && (
                <a href={candidateGithub.startsWith('http') ? candidateGithub : `https://${candidateGithub}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 text-sm font-medium hover:underline">🐙 {candidateGithub}</a>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-1.5 font-bold text-sm rounded-full border ${isHire ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {dossier.verdict || "UNKNOWN"}
              </span>
              <span className="text-slate-500 text-sm font-medium">
                Confidence: {Math.round(dossier.hire_confidence_score ?? score)}%
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              {isDownloading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Download className="w-4 h-4" /> Download PDF</>
              )}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }}
              className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              Copy Link
            </button>
            <Link
              href={userRole === "hr" ? "/dashboard" : "/candidate/dashboard"}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Human Override Panel (HR only) */}
            {userRole === "hr" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> Human Override Panel
                </h4>
                <p className="text-sm text-slate-500 mb-4">
                  Override the AI verdict with human judgment. This action is audited and will appear on the downloaded PDF.
                </p>
                {overrideSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-semibold">
                    ✓ Override applied successfully. The verdict has been updated.
                  </div>
                )}
                {dossier.human_override_justification && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                    <span className="font-bold">Current Override:</span> {dossier.human_override_justification}
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <select
                    value={overrideVerdict}
                    onChange={(e) => setOverrideVerdict(e.target.value)}
                    className="p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-800 font-medium w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="STRONG HIRE">STRONG HIRE</option>
                    <option value="HIRE">HIRE</option>
                    <option value="LEAN HIRE">LEAN HIRE</option>
                    <option value="HOLD">HOLD</option>
                    <option value="RE-EVALUATE">RE-EVALUATE</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                  <textarea
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    rows={3}
                    placeholder="Provide your HR override justification here… (required, appears on PDF)"
                    className="p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-800 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleOverride}
                    disabled={isOverriding}
                    className="w-full px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    {isOverriding ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
                    ) : (
                      "Apply Override"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Alternative Matches */}
            {alternativeMatches.length > 0 && (
              <section className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-6 rounded-2xl shadow-sm">
                <h3 className="flex items-center gap-2 text-orange-800 font-bold text-lg mb-4">
                  <Activity className="w-5 h-5" /> Cross-Requisition Salvage Successful
                </h3>
                <p className="text-orange-700 leading-relaxed mb-4">
                  This candidate scored below the threshold for the original role, but the Orchestrator found strong matches in other active requisitions:
                </p>
                <div className="space-y-3">
                  {alternativeMatches.map((match: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{match.job_title}</div>
                          <div className="text-xs text-slate-500">Requisition #{match.job_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600">{match.match_score}% Match</div>
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">Route Candidate</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Executive Summary */}
            <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4">
                Orchestrator Synthesis
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {dossier.executive_summary || dossier.job_fit?.reasoning || "No synthesis available."}
              </p>
            </section>

            {/* Technical Screen — HR/Hiring Manager ONLY (RBAC) */}
            {userRole !== "candidate" && (
              <section>
                <h3 className="text-slate-800 font-bold text-lg mb-4">Technical Screen Kit</h3>
                <div className="space-y-4">
                  {(dossier.technical_interview_pack?.questions || dossier.technical_screen?.questions || []).map((q: any, i: number) => (
                    <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
                      <div className="text-indigo-300 font-bold text-xl flex-shrink-0">Q{i + 1}</div>
                      <div>
                        <p className="text-slate-700 font-medium mb-3 leading-relaxed">{q.question}</p>
                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-500 border border-slate-100">
                          <span className="font-bold text-slate-700">Target Skill:</span>{" "}
                          {q.target_skill || (q.expected_answer_concepts || []).join(", ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Culture Fit — HR/Hiring Manager ONLY (RBAC) */}
            {userRole !== "candidate" && (
              <section>
                <h3 className="text-slate-800 font-bold text-lg mb-4">Culture Fit & Behavioral</h3>
                <div className="space-y-4">
                  {(dossier.behavioral_interview_pack?.questions || dossier.culture_fit?.questions || []).map((q: any, i: number) => (
                    <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                      <p className="text-slate-700 font-medium mb-3 leading-relaxed">{q.question}</p>
                      <p className="text-sm text-slate-500">
                        <span className="font-bold text-slate-700">Purpose:</span> {q.purpose}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column — Sidebar */}
          <div className="space-y-6">
            {/* Score */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Job Fit Score</p>
              <div className="text-6xl font-light text-slate-800 mb-4">{Math.round(score)}%</div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
            </div>

            {/* Forensic Verification — HR ONLY */}
            {userRole !== "candidate" && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Forensic Verification</span>
                  <ShieldCheck className={`w-4 h-4 ${forensicScore >= 70 ? "text-emerald-500" : "text-orange-500"}`} />
                </p>
                <div className="flex items-end gap-2 mb-3">
                  <div className={`text-4xl font-light ${forensicScore >= 70 ? "text-emerald-600" : "text-orange-600"}`}>{forensicScore}%</div>
                  <div className="text-xs text-slate-400 mb-1">Confidence Score</div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
                  <div className={`h-full transition-all duration-1000 ${forensicScore >= 70 ? "bg-emerald-400" : "bg-orange-400"}`} style={{ width: `${forensicScore}%` }} />
                </div>
                <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-100">{forensicNote}</p>
              </div>
            )}

            {/* Skills */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4">Skills Analysis</h4>
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Matched Skills</p>
                <div className="flex flex-wrap gap-2">
                  {matchedSkills.length > 0 ? matchedSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">{skill}</span>
                  )) : <span className="text-slate-400 text-sm italic">None identified</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.length > 0 ? missingSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-full">{skill}</span>
                  )) : <span className="text-slate-400 text-sm italic">None identified</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HIDDEN PDF RENDER TARGET ══════════════════════════════════════════
           This div is invisible in the browser but html2pdf targets it for PDF generation.
           The RBAC guard is enforced inside PrintDocument (userRole prop).
      ════════════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px' }}>
        <div ref={dossierRef}>
          <PrintDocument
            dossier={dossier}
            companyName={companyName}
            overrideJustification={overrideJustification || dossier.human_override_justification || ""}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}

export default function Dossier() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <DossierContent />
    </Suspense>
  );
}
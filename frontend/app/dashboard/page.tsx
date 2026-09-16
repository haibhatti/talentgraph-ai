"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Activity, CheckCircle2, Briefcase, BarChart3 } from "lucide-react";

// ─── Exact mirror of the GET /api/v1/evaluations response shape ────────────────
interface EvaluationRecord {
  id: number;
  candidateName: string;
  job_requisition_id: number | null;
  score: number;
  verdict: string;
  timestamp: string;
  fullData: any;
}

/**
 * Bulletproof mapper from raw backend JSON to EvaluationRecord.
 */
function mapEvaluation(e: any): EvaluationRecord {
  return {
    id: e.id,
    candidateName:
      e.candidate_name ||
      e.full_dossier?.candidate_name ||
      e.full_dossier?.parsed_resume?.candidate_name ||
      "Unknown",
    job_requisition_id: e.job_requisition_id ?? null,
    score:
      typeof e.score === "number"
        ? e.score
        : e.full_dossier?.score ??
          e.full_dossier?.quantitative_match_score ??
          0,
    verdict:
      e.verdict ||
      e.full_dossier?.verdict ||
      e.full_dossier?.overall_recommendation ||
      "PENDING",
    timestamp: e.created_at || new Date().toISOString(),
    fullData: e.full_dossier || null,
  };
}

export default function DashboardOverview() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserName(session.user.user_metadata?.full_name || "");
        }

        const authHeader: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};

        const [evalRes, reqRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/v1/evaluations", { headers: authHeader }),
          fetch("http://127.0.0.1:8000/api/v1/requisitions"),
        ]);

        if (evalRes.ok) {
          const json = await evalRes.json();
          const rawArray: any[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
            ? json.data
            : [];
          setEvaluations(rawArray.map(mapEvaluation));
        } else {
          console.warn("Evaluations fetch returned status:", evalRes.status);
        }

        if (reqRes.ok) {
          const reqResData = await reqRes.json();
          setRequisitions(Array.isArray(reqResData) ? reqResData : []);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fixed metric calculations ─────────────────────────────────────────────
  // Card 1: Total Evaluations — simple total count
  const totalEvaluations = evaluations.length;

  // Card 2: Qualified for Hire — any verdict that includes "HIRE" (covers STRONG HIRE, HIRE, LEAN HIRE)
  const qualifiedForHire = evaluations.filter(
    (e) => (e.verdict || "").toUpperCase().includes("HIRE")
  ).length;

  // Card 3: Average Match Score — overall pipeline quality indicator
  const averageMatchScore = Math.round(
    evaluations.reduce((acc, e) => acc + (e.score || 0), 0) / (evaluations.length || 1)
  );

  const getVerdictStyle = (verdict: string) => {
    const v = (verdict || "").toUpperCase();
    if (v.includes("STRONG HIRE"))
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (v.includes("HIRE") && !v.includes("RE-EVALUATE"))
      return "bg-blue-50 text-blue-700 border border-blue-200";
    if (v.includes("LEAN HIRE"))
      return "bg-sky-50 text-sky-700 border border-sky-200";
    return "bg-red-50 text-red-700 border border-red-200";
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good morning, {userName || "HR Director"}
          </h1>
          <p className="text-sm text-slate-500">
            TalentGraph AI has processed {totalEvaluations} resumes. Here&apos;s
            today at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          All systems normal
        </div>
      </div>

      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Total Evaluations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-shadow">
            <div className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              Total Evaluations
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">
              {totalEvaluations}
            </div>
            <div className="text-sm text-slate-500 mb-6">
              {totalEvaluations > 0 ? "Resumes processed by AI pipeline" : "No evaluations yet"}
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
              <span>Pipeline Utilization</span>
              <span>{Math.min(Math.round((totalEvaluations / 20) * 100), 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(Math.round((totalEvaluations / 20) * 100), 100)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Qualified for Hire */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-shadow">
            <div className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              Qualified for Hire
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">
              {qualifiedForHire}
            </div>
            <div className="text-sm text-slate-500 mb-6">
              {totalEvaluations > 0
                ? `${Math.round((qualifiedForHire / totalEvaluations) * 100)}% hire rate across all evaluations`
                : "No evaluations yet"}
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
              <span>Hire Rate</span>
              <span>
                {totalEvaluations > 0
                  ? Math.round((qualifiedForHire / totalEvaluations) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width:
                    totalEvaluations > 0
                      ? `${Math.round((qualifiedForHire / totalEvaluations) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          {/* Card 3: Average Match Score */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-shadow">
            <div className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              Average Match Score
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">
              {averageMatchScore}%
            </div>
            <div className="text-sm text-slate-500 mb-6">
              {totalEvaluations > 0 ? "Overall pipeline quality" : "No evaluations yet"}
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
              <span>Pipeline Quality</span>
              <span>{averageMatchScore}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(averageMatchScore, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent Evaluations Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">
              Recent Candidate Evaluations
            </h3>
            <button
              className="text-sm font-bold bg-slate-50 text-slate-700 px-5 py-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"
              onClick={() => router.push("/evaluate")}
            >
              + New Evaluation
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-sm">Loading evaluations…</p>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                <Briefcase className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-3">
                No Evaluations Yet
              </h4>
              <p className="text-slate-500 max-w-sm mb-8">
                Your candidate database is empty. Start by evaluating a
                candidate for an open requisition.
              </p>
              <button
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold transition-all shadow-md shadow-indigo-900/10 hover:shadow-indigo-900/20"
                onClick={() => router.push("/evaluate")}
              >
                Start New Evaluation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 md:px-8 py-5">Candidate</th>
                    <th className="hidden md:table-cell px-8 py-5">Role Target</th>
                    <th className="hidden sm:table-cell px-8 py-5">Match Score</th>
                    <th className="px-4 md:px-8 py-5 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluations.slice(0, 8).map((ev) => {
                    const req = requisitions.find(
                      (r) => r.id === ev.job_requisition_id
                    );
                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (ev.fullData) {
                            sessionStorage.setItem(
                              "dossierData",
                              JSON.stringify(ev.fullData)
                            );
                          }
                          router.push(`/dossier?id=${ev.id}`);
                        }}
                      >
                        <td className="px-4 md:px-8 py-6">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {ev.candidateName}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {new Date(ev.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-8 py-6 text-slate-600 font-medium">
                          {req?.title || ev.fullData?.job_title || ev.fullData?.role || "Direct Evaluation"}
                        </td>
                        <td className="hidden sm:table-cell px-8 py-6">
                          <div className="flex items-center gap-4">
                            <span className="font-black text-slate-800">
                              {Math.round(ev.score)}%
                            </span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full hidden sm:block">
                              <div
                                className="h-2 rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(ev.score, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-8 py-6 text-right">
                          <span
                            className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${getVerdictStyle(ev.verdict)}`}
                          >
                            {ev.verdict}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
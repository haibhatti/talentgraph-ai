"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, UserCircle, Briefcase, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { apiClient } from "@/lib/apiClient";

interface Application {
  id: number;
  job_requisition_id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
  evaluation_id: number | null;
  created_at: string;
}

interface Requisition {
  id: number;
  title: string;
}

export default function RequisitionApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
  
  // Stepper state
  const [showStepper, setShowStepper] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [evalError, setEvalError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      
      const reqRes = await apiClient("/api/v1/requisitions", {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (reqRes.ok) {
        const reqs = await reqRes.json();
        const found = reqs.find((r: any) => r.id === Number(id));
        if (found) setRequisition(found);
      }

      const res = await apiClient(`/api/v1/requisitions/${id}/applications`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        setApplications(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEvaluate = async (appId: number) => {
    setEvaluatingId(appId);
    setEvalError(null);

    // Guard: ensure a valid session exists before hitting the backend.
    // An empty/anonymous Bearer causes the DB ownership filter to return
    // no rows and FastAPI responds with 404, not 401.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setEvalError("Your session has expired. Please sign in again.");
      setEvaluatingId(null);
      router.push("/auth/signin");
      return;
    }

    setShowStepper(true);
    setCurrentStep(1);

    // Fake progress for UX
    const interval = setInterval(() => {
      setCurrentStep(prev => prev < 5 ? prev + 1 : prev);
    }, 2000);

    try {
      // appId is already typed as number; cast explicitly to guarantee
      // the URL template produces a valid integer path segment, never "undefined".
      const numericId = Number(appId);
      const res = await apiClient(`/api/v1/applications/${numericId}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.evaluation_id) {
        clearInterval(interval);
        setCurrentStep(5);
        sessionStorage.setItem("dossierData", JSON.stringify(data.dossier));
        router.push(`/dossier?id=${data.evaluation_id}`);
      } else {
        clearInterval(interval);
        setEvalError(data.detail || "Evaluation failed.");
        setShowStepper(false);
      }
    } catch (error) {
      clearInterval(interval);
      console.error(error);
      setEvalError("Error triggering evaluation.");
      setShowStepper(false);
    } finally {
      setEvaluatingId(null);
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      <button 
        onClick={() => router.push('/requisitions')}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Requisitions
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Applicants Pipeline</h1>
          <p className="text-sm text-slate-500">
            {requisition ? `Reviewing candidates for: ${requisition.title}` : 'Loading...'}
          </p>
        </div>
      </div>

      {evalError && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm flex items-center gap-3">
          <span className="font-semibold">{evalError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center h-64 items-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <UserCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Applicants Yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Candidates who apply to this requisition will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-6">Candidate</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800">
                        {app.candidate_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {app.candidate_email}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        app.status === 'Pending' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {app.status === 'Pending' ? (
                        <button 
                          onClick={() => handleEvaluate(app.id)}
                          disabled={evaluatingId === app.id}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-end gap-2 ml-auto"
                        >
                          {evaluatingId === app.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                          ) : (
                            'Run 1-Click Evaluation'
                          )}
                        </button>
                      ) : (
                        <button 
                          onClick={() => router.push(`/dossier?id=${app.evaluation_id}`)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors"
                        >
                          View Dossier
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluation Stepper Modal */}
      {showStepper && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-8 text-center flex flex-col items-center">
            <h2 className="text-xl font-bold text-slate-800 mb-6">AI Multi-Agent Evaluation in Progress</h2>
            <div className="space-y-4 w-full text-left">
              {["Resume Analyzer", "Job Fit Agent", "Technical Screener", "Culture Fit Agent", "Chief Orchestrator"].map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                return (
                  <div key={step} className={`flex items-center gap-4 p-3 rounded-lg border ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'} transition-all`}>
                    <div className="shrink-0">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : isActive ? (
                        <div className="text-indigo-600">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">
                          {stepNum}
                        </div>
                      )}
                    </div>
                    <span className={`font-medium ${isActive ? 'text-indigo-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-slate-500 mt-6 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Please wait while our AI agents analyze this candidate...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

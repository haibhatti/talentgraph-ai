"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Briefcase, FileText } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { apiClient } from "@/lib/apiClient";

interface CandidateApplication {
  id: number;
  job_requisition_id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
  evaluation_id: number | null;
  created_at: string;
}

export default function ApplicationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [application, setApplication] = useState<CandidateApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplication = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        // Retry up to 3 times with exponential back-off (150 ms, 300 ms).
        // This absorbs the propagation window between the backend's HTTP 201
        // response and the record becoming visible through the Supabase
        // Session Pooler, preventing the false-positive "Application not found"
        // error state that fires immediately after a successful submission.
        const MAX_ATTEMPTS = 3;
        const BACKOFF_MS = [0, 150, 300];
        let lastStatus = 0;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (BACKOFF_MS[attempt] > 0) {
            await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
          }

          const res = await apiClient(`/api/v1/applications/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
            cache: "no-store",
          });

          lastStatus = res.status;

          if (res.ok) {
            const data = await res.json();
            setApplication(data);
            return; // success — exit the retry loop
          }

          // 404 may be transient on the first attempt after creation.
          // 401/403 are permanent auth failures — break immediately.
          if (res.status === 401 || res.status === 403) {
            setError("You don't have permission to view this application.");
            return;
          }

          // On the last attempt, surface the error to the user.
          if (attempt === MAX_ATTEMPTS - 1) {
            setError(
              lastStatus === 404
                ? "Application not found or you don't have access."
                : "An error occurred while fetching the application."
            );
          }
        }
      } catch (err) {
        console.error("[ApplicationDetailsPage] fetch error:", err);
        setError("Network error fetching application.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchApplication();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
        <button 
          onClick={() => router.push('/candidate/dashboard')}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
          {error || "Application not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      <button 
        onClick={() => router.push('/candidate/dashboard')}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Application Details</h1>
            <p className="text-slate-500">Submitted on {new Date(application.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Status</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${application.status === 'Evaluated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {application.status}
            </span>
          </div>

          <div>
            <span className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Candidate Name</span>
            <div className="text-slate-800 font-medium">{application.candidate_name}</div>
          </div>

          <div>
            <span className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Candidate Email</span>
            <div className="text-slate-800 font-medium">{application.candidate_email}</div>
          </div>
        </div>

        {application.status === 'Evaluated' && application.evaluation_id && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => router.push(`/dossier?id=${application.evaluation_id}`)}
              className="py-2.5 px-6 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> View AI Feedback Dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

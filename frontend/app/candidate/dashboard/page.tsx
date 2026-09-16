"use client";

import { useEffect, useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Upload, FileUp, ClipboardList, UploadCloud, FileText } from "lucide-react";
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

interface CandidateEvaluation {
  id: number;
  candidate_name: string;
  score: number;
  verdict: string;
  full_dossier: any;
}

interface JobRequisition {
  id: number;
  title: string;
  description: string;
  required_skills?: string[];
  nice_to_have_skills?: string[];
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<JobRequisition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState<string>("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [resumeText, setResumeText] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const refreshApplications = async (token: string, email: string) => {
    try {
      const res = await apiClient(`/api/v1/applications/candidate${email ? `?email=${encodeURIComponent(email)}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openApplyDialog = (req: JobRequisition) => {
    setSelectedReq(req);
    setShowModal(true);
    setActiveTab('upload');
    setResumeText("");
    setCandidateName("");
    setCandidateEmail("");
    setSelectedFile(null);
    setSubmitError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert("Please upload a PDF resume.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
      } else {
        alert("Only PDF files are supported.");
      }
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedReq) return;
    
    if (activeTab === 'upload' && !selectedFile) {
      alert("Please select a PDF file to upload.");
      return;
    }
    if (activeTab === 'paste' && !resumeText.trim()) {
      alert("Please paste your resume text.");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      let extractedText = resumeText;

      if (activeTab === 'upload' && selectedFile) {
        const form = new FormData();
        form.append("file", selectedFile);
        const uploadRes = await apiClient("/api/v1/upload-resume", {
          method: "POST",
          body: form,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          const detail = uploadData?.detail ?? "Failed to parse PDF resume";
          throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
        }
        extractedText = uploadData.text;
      }

      const applyRes = await apiClient("/api/v1/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_requisition_id: selectedReq.id,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          resume_text: extractedText,
        }),
      });
      const applyData = await applyRes.json().catch(() => ({}));
      if (!applyRes.ok) {
        if (applyRes.status === 409) {
          setToastMessage("You have already applied for this position.");
          return;
        }
        const detail = applyData?.detail ?? "Failed to submit application";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      setToastMessage(`Application submitted for ${selectedReq.title}`);
      setTimeout(() => setToastMessage(null), 3000);
      await refreshApplications(token, session?.user?.email || "");
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      if (err?.message === "You have already applied for this position.") {
        setSubmitError(err.message);
      } else {
        alert(err?.message || "Error submitting application");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token || "";
        const email = session?.user?.email || "";
        if (session) {
          setUserName(session.user.user_metadata?.full_name || "");
        }
        const [reqRes] = await Promise.all([
          apiClient("/api/v1/requisitions"),
        ]);

        if (reqRes.ok) {
          const data = await reqRes.json();
          setRequisitions(Array.isArray(data) ? data : data?.data || []);
        }
        
        await refreshApplications(token, email);
      } catch (error) {
        console.error("Failed to fetch candidate data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewDossier = (fullData: any) => {
    if (!fullData) return;
    sessionStorage.setItem("dossierData", JSON.stringify(fullData));
    router.push("/dossier");
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8 relative">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {userName || 'Candidate'}</h1>
          <p className="text-sm text-slate-500">Browse open roles and track your AI evaluations.</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Open Roles</h2>
          {isSubmitting && !showModal && (
            <span className="text-sm text-indigo-600 font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting application…
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : requisitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <p className="text-slate-500 text-sm">No open roles available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {requisitions.map((req) => (
              <div
                key={req.id}
                onClick={() => { setSelectedReq(req); setShowJobModal(true); }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-snug">{req.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Open requisition</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{req.description}</p>
                {!!req.required_skills?.length && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {req.required_skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openApplyDialog(req); }}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800">Your Applications</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No Applications Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Please click 'Apply Now' on a requisition above to submit an application. Tracking applicant state from the candidate side requires full authentication which is stubbed here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {applications.map(app => {
              const req = requisitions.find(r => r.id === app.job_requisition_id);
              return (
                <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{req?.title || "Unknown Role"}</h3>
                    <p className="text-sm text-slate-500 mb-3">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${app.status === 'Evaluated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                  {app.status === 'Evaluated' && app.evaluation_id && (
                    <button
                      onClick={() => router.push(`/dossier?id=${app.evaluation_id}`)}
                      className="mt-4 w-full py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> View Feedback
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Application Modal */}
      {showModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Apply for Role</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedReq.title}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              {submitError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-amber-800">{submitError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="John Doe"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="john@example.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex border-b border-slate-200 mb-2">
                <button 
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <FileUp className="w-4 h-4" /> Upload PDF
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'paste' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <ClipboardList className="w-4 h-4" /> Paste Text
                </button>
              </div>

              <div className="min-h-[200px]">
                {activeTab === 'upload' && (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl transition-all relative ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'} ${isSubmitting ? 'pointer-events-none' : ''}`}
                  >
                    {isSubmitting ? (
                      <div className="flex flex-col items-center text-indigo-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-bold">Submitting...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className="text-sm text-slate-600 font-medium">
                          {selectedFile ? `Selected: ${selectedFile.name}` : (isDragging ? 'Drop it here!' : 'Drag & drop a PDF file or click to browse')}
                        </span>
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'paste' && (
                  <textarea 
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y disabled:opacity-50"
                    placeholder="Paste your unstructured resume text here..."
                  ></textarea>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleModalSubmit}
                  disabled={isSubmitting || !candidateName || !candidateEmail || (activeTab === 'upload' && !selectedFile) || (activeTab === 'paste' && !resumeText.trim())}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedReq.title}</h2>
              </div>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Job Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedReq.description}</p>
              </div>
              {!!selectedReq.required_skills?.length && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReq.required_skills.map((skill) => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!!selectedReq.nice_to_have_skills?.length && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Nice to Have</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReq.nice_to_have_skills.map((skill) => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => { setShowJobModal(false); openApplyDialog(selectedReq); }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

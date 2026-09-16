"use client";

import { useState, DragEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UploadCloud, FileText, ClipboardList, Loader2, FileUp } from 'lucide-react';

const AGENT_STEPS = [
  "Resume Analyzer",
  "Job Fit Evaluation",
  "Technical Screener",
  "Culture Fit Assessment",
  "Orchestrator Synthesis"
];

function EvaluateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequisitionId, setJobRequisitionId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  
  useEffect(() => {
    const jobId = searchParams.get('job_id');
    if (jobId) {
      setJobRequisitionId(Number(jobId));
      const fetchJob = async () => {
        try {
          const { createBrowserClient } = await import('@supabase/ssr');
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { session } } = await supabase.auth.getSession();
          
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requisitions`, {
             headers: { "Authorization": `Bearer ${session?.access_token || ''}` }
          });
          if (res.ok) {
            const reqs = await res.json();
            const req = reqs.find((r: any) => r.id === Number(jobId));
            if (req) {
              setJobDescription(`${req.title}\n\n${req.description}\n\nRequired Skills: ${req.required_skills.join(', ')}`);
              setJobTitle(req.title);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchJob();
    }
  }, [searchParams]);
  
  const [activeTab, setActiveTab] = useState<'upload' | 'dragdrop' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload-resume`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        setResumeText(data.text);
      } else {
        alert(data.detail || "Failed to process PDF.");
        setFileName("");
      }
    } catch (error) {
      alert("Error connecting to server for PDF upload.");
      setFileName("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
    if (e.target) e.target.value = '';
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
        handleFileUpload(file);
      } else {
        alert("Only PDF files are supported.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setCurrentStep(0);

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= AGENT_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_requisition_id: jobRequisitionId || 1, // Fallback if no job_id is provided
          job_description: jobDescription
        })
      });

      const data = await res.json();
      clearInterval(interval);
      setCurrentStep(AGENT_STEPS.length);
      
      if (res.ok) {
        sessionStorage.setItem("dossierData", JSON.stringify(data.dossier));
        
        const newRecord = { 
          id: Date.now().toString(), 
          candidateName: data.dossier.candidate_name || "Unknown Candidate", 
          role: "Target Role", 
          score: data.dossier.score, 
          verdict: data.dossier.verdict, 
          timestamp: new Date().toISOString(),
          fullData: data.dossier 
        };
        const existingHistory = JSON.parse(localStorage.getItem("talentgraph_history") || "[]");
        localStorage.setItem("talentgraph_history", JSON.stringify([newRecord, ...existingHistory]));
        
        setTimeout(() => router.push(`/dossier?id=${data.id}`), 1000);
      } else {
        const detail = data?.detail ?? data?.message ?? "Evaluation failed. Please check backend logs.";
        alert(typeof detail === "string" ? detail : JSON.stringify(detail));
        setIsEvaluating(false);
        setCurrentStep(-1);
      }
    } catch (error) {
      clearInterval(interval);
      console.error(error);
      alert("Network error connecting to backend.");
      setIsEvaluating(false);
      setCurrentStep(-1);
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 w-full bg-slate-50 min-h-full">
      <div className="flex-1 p-8 md:p-12 h-[calc(100vh-4rem)] overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-slate-800 text-2xl font-bold mb-6">New Candidate Evaluation</h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* TABS SECTION */}
            <div>
              <label className="block font-bold text-xs text-slate-500 uppercase tracking-wider mb-4">Input Resume Data</label>
              <div className="flex border-b border-slate-200 mb-6">
                <button 
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <FileUp className="w-4 h-4" /> Upload PDF
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('dragdrop')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'dragdrop' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <UploadCloud className="w-4 h-4" /> Drag & Drop
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
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors relative">
                    {isUploading ? (
                      <div className="flex flex-col items-center text-indigo-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-bold">Processing Document...</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-10 h-10 text-slate-400 mb-3" />
                        <span className="text-sm text-slate-600 font-medium">{fileName ? `Selected: ${fileName}` : 'Select a PDF resume from your computer'}</span>
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleFileChange}
                          disabled={isUploading || isEvaluating}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        {!fileName && <div className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-bold text-slate-700 shadow-sm">Browse Files</div>}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'dragdrop' && (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-slate-50'} ${isUploading ? 'pointer-events-none' : ''}`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center text-indigo-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-bold">Processing Document...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className={`w-12 h-12 mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${isDragging ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {fileName ? `Loaded: ${fileName}` : (isDragging ? 'Drop it here!' : 'Drag & drop a PDF file here')}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'paste' && (
                  <textarea 
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y"
                    placeholder="Paste unstructured resume text here..."
                  ></textarea>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-xs text-slate-500 uppercase tracking-wider">Job Requisition / Requirements</label>
                {jobTitle && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-1 rounded-md border border-indigo-100">
                    Locked to Requisition: {jobTitle}
                  </span>
                )}
              </div>
              <textarea 
                required
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                readOnly={!!jobRequisitionId}
                className={`w-full h-40 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y ${jobRequisitionId ? 'bg-slate-50 cursor-not-allowed opacity-80' : 'bg-white'}`}
                placeholder="Paste the job description and requirements here..."
              ></textarea>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={isEvaluating || !resumeText || !jobDescription}
                className={`w-full py-4 font-bold text-[15px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${isEvaluating || !resumeText || !jobDescription ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 shadow-lg hover:-translate-y-0.5'}`}
              >
                {isEvaluating ? (
                  <>
                     <Loader2 className="w-5 h-5 animate-spin" /> Agents Computing...
                  </>
                ) : 'Initialize 5-Agent Screening'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="w-full md:w-[400px] bg-white border-l border-slate-200 p-8 flex flex-col justify-center shadow-[-4px_0_24px_rgba(0,0,0,0.02)] relative z-10">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-slate-800 text-sm font-bold uppercase tracking-widest">Pipeline Execution</h3>
           <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
              {isEvaluating ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active</span> : 'Idle'}
           </div>
        </div>
        
        <div className="space-y-8 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-100 z-0"></div>
          {AGENT_STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = currentStep !== -1 && index < currentStep;
            return (
              <div key={index} className="relative z-10 flex items-center gap-4 group">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-all duration-500 ${isActive ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' : isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${isActive ? 'border-indigo-100 bg-indigo-50/50 shadow-sm' : isCompleted ? 'border-slate-100 bg-white shadow-sm' : 'border-transparent bg-transparent opacity-60'}`}>
                  <p className={`text-sm font-bold ${isActive ? 'text-indigo-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Evaluate() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <EvaluateContent />
    </Suspense>
  );
}
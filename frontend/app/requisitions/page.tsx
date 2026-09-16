"use client";

import { useEffect, useState } from "react";
import { Plus, Briefcase, ChevronRight, Loader2, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

interface Requisition {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  created_at: string;
}

export default function RequisitionsPage() {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reqSkills, setReqSkills] = useState("");
  const [niceSkills, setNiceSkills] = useState("");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReqId, setEditingReqId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReqSkills, setEditReqSkills] = useState("");
  const [editNiceSkills, setEditNiceSkills] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCompanyName(session.user.user_metadata?.company_name || "");
        setUserEmail(session.user.email || "");
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requisitions`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data);
      }
    } catch (error) {
      console.error("Failed to fetch requisitions", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requisitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          title,
          description,
          required_skills: reqSkills.split(",").map(s => s.trim()).filter(Boolean),
          nice_to_have_skills: niceSkills.split(",").map(s => s.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setDescription("");
        setReqSkills("");
        setNiceSkills("");
        fetchRequisitions();
      } else {
        alert("Failed to create requisition");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this requisition?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requisitions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.access_token || ''}`
        }
      });
      if (res.ok) {
        fetchRequisitions();
      } else {
        alert("Failed to delete requisition");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (req: Requisition) => {
    setEditingReqId(req.id);
    setEditTitle(req.title);
    setEditDescription(req.description);
    setEditReqSkills(req.required_skills.join(", "));
    setEditNiceSkills(req.nice_to_have_skills.join(", "));
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReqId) return;
    setIsEditing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requisitions/${editingReqId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          required_skills: editReqSkills.split(",").map(s => s.trim()).filter(Boolean),
          nice_to_have_skills: editNiceSkills.split(",").map(s => s.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchRequisitions();
      } else {
        alert("Failed to update requisition");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Job Requisitions</h1>
          <p className="text-sm text-slate-500">Manage your active job postings and candidate pipelines.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> New Requisition
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : requisitions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No active requisitions</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">Create a new job requisition to start evaluating candidates against specific roles and requirements.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
          >
            Create your first requisition
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {requisitions.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                    Active
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(req); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{req.title}</h3>
                <div className="flex flex-col gap-1 items-start">
                  {companyName && (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      🏢 {companyName}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-400">
                    📧 {userEmail}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{req.description}</p>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Required Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.required_skills.slice(0, 3).map(skill => (
                      <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">{skill}</span>
                    ))}
                    {req.required_skills.length > 3 && (
                      <span className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-md">+{req.required_skills.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <div className="text-xs text-slate-500">
                  Created {new Date(req.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); router.push(`/requisitions/${req.id}`); }} 
                    className="flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    View Applicants <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); router.push(`/evaluate?job_id=${req.id}`); }} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-900/10 hover:shadow-indigo-900/20 hover:-translate-y-0.5"
                  >
                    Evaluate New Candidate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Create New Requisition</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  required 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Senior Machine Learning Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Description</label>
                <textarea 
                  required 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-y"
                  placeholder="Briefly describe the role..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Required Skills (comma separated)</label>
                <input 
                  type="text" 
                  required 
                  value={reqSkills}
                  onChange={e => setReqSkills(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Python, PyTorch, AWS, System Design"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nice-to-have Skills (comma separated)</label>
                <input 
                  type="text" 
                  value={niceSkills}
                  onChange={e => setNiceSkills(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Rust, MLOps, Kubernetes"
                />
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
                  type="submit" 
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Edit Requisition</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  required 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Description</label>
                <textarea 
                  required 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-y"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Required Skills (comma separated)</label>
                <input 
                  type="text" 
                  required 
                  value={editReqSkills}
                  onChange={e => setEditReqSkills(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nice-to-have Skills (comma separated)</label>
                <input 
                  type="text" 
                  value={editNiceSkills}
                  onChange={e => setEditNiceSkills(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isEditing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isEditing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

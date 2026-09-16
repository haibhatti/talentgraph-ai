"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { User, Mail, Calendar, Shield, LogOut, Loader2, Save, CheckCircle2, Camera } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("Candidate");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (fullName: string) => {
    if (!fullName) return "U";
    return fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  };

  // Form state
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session?.user || null);
      
      let currentRole = session?.user?.user_metadata?.role;
      if (!currentRole) {
        currentRole = localStorage.getItem("talentgraph_intended_role") || "candidate";
      }
      setRole(currentRole.toUpperCase());
      
      setName(session?.user?.user_metadata?.full_name || "");
      if (currentRole?.toLowerCase() === 'hr') {
        setCompanyName(session?.user?.user_metadata?.company_name || "");
        setDepartment(session?.user?.user_metadata?.department || "");
      } else {
        setGithubUrl(session?.user?.user_metadata?.github_url || "");
        setLinkedinUrl(session?.user?.user_metadata?.linkedin_url || "");
      }
      
      setAvatarUrl(session?.user?.user_metadata?.avatar_url || "");
      setIsLoading(false);
    };
    fetchUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  /**
   * Avatar file upload handler.
   * Uploads the selected image to Supabase Storage (bucket: "avatars"),
   * retrieves the public URL, and updates the user's metadata.
   */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Build a unique filename: userId/timestamp.ext
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${session.user.id}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Could not retrieve public URL");

      // Update user metadata with the new avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setToastMessage("Avatar updated successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert("Failed to upload avatar: " + (err.message || "Unknown error"));
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let metadataUpdate: any = { full_name: name, role: role.toLowerCase(), avatar_url: avatarUrl };
    if (role === 'HR') {
      metadataUpdate.company_name = companyName;
      metadataUpdate.department = department;
    } else {
      metadataUpdate.github_url = githubUrl;
      metadataUpdate.linkedin_url = linkedinUrl;
    }
    
    const { error } = await supabase.auth.updateUser({
      data: metadataUpdate
    });
    
    setIsSaving(false);
    if (!error) {
      setToastMessage("Profile updated successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      alert("Failed to update profile: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and preferences.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32 relative"></div>
        
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-between items-end">
            {/* Avatar with file upload trigger */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <div className="w-32 h-32 bg-white rounded-full p-2 shadow-md">
                <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 text-4xl font-bold overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : role === 'HR' ? (
                    getInitials(name || user?.email || "")
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
              </div>
              {/* Camera overlay button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-2 right-2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white"
                title="Upload profile photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 mb-2"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{name || user?.email?.split('@')[0] || ""}</h2>
              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  role === 'HR' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  {role} Account
                </span>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Email Address</div>
                    <div className="text-slate-800 font-medium">{user?.email}</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Created</div>
                    <div className="text-slate-800 font-medium">
                      {new Date(user?.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-4">Profile Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                {role === 'HR' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name</label>
                      <input 
                        type="text" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Department</label>
                      <input 
                        type="text" 
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Human Resources"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">GitHub Profile URL</label>
                      <input 
                        type="url" 
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">LinkedIn URL</label>
                      <input 
                        type="url" 
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="https://linkedin.com/in/yourusername"
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

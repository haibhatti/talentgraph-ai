"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DevRoleSwitcher({ currentRole }: { currentRole: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleRole = async () => {
    setLoading(true);
    const newRole = currentRole === 'hr' ? 'candidate' : 'hr';
    try {
      const res = await fetch('/api/dev-switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        document.cookie = `user_role=${newRole}; path=/; SameSite=Lax`;
        document.cookie = `intended_role=${newRole}; path=/; SameSite=Lax`;
        window.location.href = newRole === 'hr' ? '/dashboard' : '/candidate/dashboard';
      } else {
        console.error('Failed to switch role');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleRole}
      disabled={loading}
      className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white font-medium rounded-md px-4 py-2"
    >
      {loading ? "Switching..." : `Dev: Switch to ${currentRole === 'hr' ? 'Candidate' : 'HR'}`}
    </button>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Sidebar from "./components/Sidebar";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TalentGraph AI",
  description: "Enterprise AI Recruitment Pipeline",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  let user = null;
  let role = null;
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user = data?.user;
    role = user?.user_metadata?.role;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-slate-50 text-slate-700 m-0 p-0 font-sans antialiased min-h-screen flex flex-col md:flex-row`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {user ? (
          <Sidebar user={user} initialRole={role} />
        ) : null}
        
        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col h-screen overflow-y-auto w-full ${user ? 'pt-16 md:pt-0' : ''}`}>
          {children}
        </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
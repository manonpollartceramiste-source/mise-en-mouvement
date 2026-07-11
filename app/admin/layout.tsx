import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { Sidebar } from "./_components/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let userEmail = "";
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) {
      userEmail = user.email ?? "";
    }
  }

  if (!userEmail) {
    // Login page ou Supabase non configuré — pas de sidebar
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={userEmail} />
      <div className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}

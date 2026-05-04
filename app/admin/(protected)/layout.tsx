import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children
}: ProtectedAdminLayoutProps) {
  const isAuthed = await getAdminSession();
  if (!isAuthed) {
    redirect("/admin/login");
  }

  return (
    <main className="admin-brand-borders h-screen overflow-hidden md:overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">
        {/* Mobile: scrollable container for the whole view if needed, Desktop: fixed */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <AdminSidebar />

          <section className="min-h-0 flex-1 overflow-y-auto md:h-full md:overflow-hidden">
            <div className="min-h-full md:h-full">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

import AdminSettingsPanel from "@/components/AdminSettingsPanel";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="h-full animate-fade-in">
      <AdminSettingsPanel />
    </div>
  );
}

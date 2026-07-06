import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FeedbackWidget } from "@/modules/feedback";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.1),transparent_30%),#020617] text-white md:flex-row">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Topbar />

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <FeedbackWidget />
      </div>
    </div>
  );
}

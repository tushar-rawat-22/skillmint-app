import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FeedbackWidget } from "@/modules/feedback";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8f4] text-slate-950 md:flex-row">
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

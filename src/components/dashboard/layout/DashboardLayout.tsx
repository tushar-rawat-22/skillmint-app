import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      <Sidebar />

      <div className="flex-1">
        <Topbar />

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  ClipboardCheck,
  HardHat,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import AttendanceTab from "../components/tabs/AttendanceTab";
import CheckOutTab from "../components/tabs/CheckOutTab";
import NewLabourTab from "../components/tabs/NewLabourTab";
import WorksTab from "../components/tabs/WorksTab";
import { AppProvider, useAppContext } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Tab = "labour" | "works" | "attendance" | "checkout";

const TABS: {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "labour", label: "New Labour", icon: Users },
  { id: "works", label: "Works", icon: Briefcase },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "checkout", label: "Check-Out", icon: LogIn },
];

function DashboardInner() {
  const [activeTab, setActiveTab] = useState<Tab>("labour");
  const [myId, setMyId] = useState("");
  const { clear, identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const { theme, toggleTheme, isAdmin, setIsAdmin } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!identity) {
      navigate({ to: "/" });
    }
  }, [identity, navigate]);

  useEffect(() => {
    if (!actor || isFetching) return;
    Promise.all([actor.isCallerAdmin(), actor.getMyId()])
      .then(([admin, id]) => {
        setIsAdmin(admin);
        setMyId(id);
      })
      .catch(() => setIsAdmin(false));
  }, [actor, isFetching, setIsAdmin]);

  function handleLogout() {
    clear();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-background border-b border-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <HardHat
            className="w-5 h-5 text-primary flex-shrink-0"
            strokeWidth={1.5}
          />
          <div className="min-w-0">
            <span className="text-sm font-display font-bold text-foreground">
              Worker Attendance
            </span>
            {myId && (
              <p className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">
                {myId}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            data-ocid="header.toggle"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            data-ocid="header.logout"
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Admin badge */}
      {isAdmin && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1 text-center">
          <span className="text-xs font-semibold text-primary tracking-wide">
            ADMIN MODE
          </span>
        </div>
      )}

      {/* Tab Content */}
      <main
        className="flex-1 overflow-y-auto pb-20"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="page-enter">
          {activeTab === "labour" && <NewLabourTab />}
          {activeTab === "works" && <WorksTab />}
          {activeTab === "attendance" && <AttendanceTab />}
          {activeTab === "checkout" && <CheckOutTab />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 bg-background border-t border-border bottom-nav">
        <div className="grid grid-cols-4 h-16">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                data-ocid={`nav.${tab.id}.tab`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 h-0.5 w-10 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppProvider>
      <DashboardInner />
    </AppProvider>
  );
}

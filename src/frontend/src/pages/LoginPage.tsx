import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export default function LoginPage() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const navigate = useNavigate();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const [showSetup, setShowSetup] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  useEffect(() => {
    if (
      isAuthenticated &&
      !profileLoading &&
      isFetched &&
      userProfile === null
    ) {
      setShowSetup(true);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (profileLoading) return;
    if (userProfile === null) return;
    navigate({ to: "/dashboard" });
  }, [isAuthenticated, profileLoading, userProfile, navigate]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    try {
      await saveProfile.mutateAsync({
        name: profileName.trim(),
        employeeId: employeeId.trim() || undefined,
      });
      setShowSetup(false);
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Background pattern */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/8 to-transparent" />
        <svg
          aria-hidden="true"
          className="absolute top-8 right-8 opacity-10"
          width="200"
          height="200"
          viewBox="0 0 200 200"
        >
          <title>Background grid pattern</title>
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-primary"
              />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif text-foreground">AttendTrack</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Worker Attendance Management System
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList
                className="w-full grid grid-cols-2"
                data-ocid="auth.tab"
              >
                <TabsTrigger
                  value="signin"
                  className="flex items-center gap-1.5"
                  data-ocid="auth.signin.tab"
                >
                  <Lock className="w-3.5 h-3.5" /> Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex items-center gap-1.5"
                  data-ocid="auth.signup.tab"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <CardContent className="space-y-6 pt-4 px-0">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Internet Identity</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cryptographically secure login — no passwords required.
                      </p>
                    </div>
                  </div>
                  <Button
                    data-ocid="login.submit_button"
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    onClick={login}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Signing in...
                      </>
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" /> Sign In
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Two roles: <strong>Admin</strong> and{" "}
                    <strong>Worker</strong>
                  </p>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup">
                <CardContent className="space-y-5 pt-4 px-0">
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold">
                      New workers can create an account in 2 easy steps
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No passwords needed — fast and secure.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-foreground">
                          1
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Authenticate</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click the button below to verify your identity
                          securely.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-foreground">
                          2
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Complete your profile
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enter your name and employee ID when prompted.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    data-ocid="signup.submit_button"
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    onClick={login}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Creating account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Create Account
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="underline text-foreground hover:text-primary transition-colors"
                      onClick={() => setActiveTab("signin")}
                      data-ocid="signup.signin.link"
                    >
                      Switch to Sign In
                    </button>
                  </p>
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>

      <Dialog open={showSetup} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" data-ocid="setup.dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Welcome! Set up your profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="setup-name">Full Name</Label>
              <Input
                id="setup-name"
                data-ocid="login.input"
                placeholder="e.g. Maria Santos"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-empid">Employee ID (optional)</Label>
              <Input
                id="setup-empid"
                placeholder="e.g. EMP-0042"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground"
              onClick={handleSaveProfile}
              disabled={saveProfile.isPending}
              data-ocid="setup.submit_button"
            >
              {saveProfile.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save &amp; Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

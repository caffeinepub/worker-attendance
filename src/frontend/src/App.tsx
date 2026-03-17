import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

const queryClient = new QueryClient();

// ─── Root Layout ──────────────────────────────────────────────
function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <Toaster richColors position="top-center" />
    </div>
  );
}

// ─── Routes ───────────────────────────────────────────────────
const rootRoute = createRootRoute({ component: RootLayout });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const adminRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

const checkinRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkin",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  adminRedirectRoute,
  checkinRedirectRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <RouterProvider router={router} />
      </InternetIdentityProvider>
    </QueryClientProvider>
  );
}

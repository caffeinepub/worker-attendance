import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  );
}

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

const routeTree = rootRoute.addChildren([loginRoute, dashboardRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}

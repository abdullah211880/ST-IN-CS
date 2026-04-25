import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme-context";
import { LanguageProvider } from "@/contexts/language-context";
import Welcome from "@/pages/welcome";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Sessions from "@/pages/sessions";
import SessionQA from "@/pages/session-qa";
import Goals from "@/pages/goals";
import GoalDetail from "@/pages/goal-detail";
import BugFinder from "@/pages/bug-finder";
import PasswordChecker from "@/pages/password-checker";
import ScamChecker from "@/pages/scam-checker";
import GpaCalculator from "@/pages/gpa-calculator";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#22d3ee",
    colorForeground: "#c5cfe0",
    colorMutedForeground: "#7a8aa0",
    colorDanger: "#f87171",
    colorBackground: "#0d1320",
    colorInput: "#141b2d",
    colorInputForeground: "#c5cfe0",
    colorNeutral: "#222e44",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-2xl shadow-2xl",
    card: "!bg-[#0d1320] !shadow-none !border-0 !rounded-none",
    footer: "!bg-[#0a101c] !shadow-none !border-0 !rounded-none !border-t !border-[#222e44]",
    headerTitle: "text-[#c5cfe0] font-bold",
    headerSubtitle: "text-[#7a8aa0]",
    socialButtonsBlockButtonText: "text-[#c5cfe0] font-medium",
    socialButtonsBlockButton: "!border-[#222e44] hover:!border-[#22d3ee] !bg-[#141b2d]",
    formFieldLabel: "text-[#7a8aa0] text-sm",
    formFieldInput: "!bg-[#141b2d] !border-[#222e44] !text-[#c5cfe0] focus:!border-[#22d3ee]",
    formButtonPrimary: "!bg-cyan-600 hover:!bg-cyan-500 !text-white font-semibold",
    footerActionLink: "!text-[#22d3ee] hover:!text-cyan-300",
    footerActionText: "!text-[#7a8aa0]",
    dividerText: "!text-[#7a8aa0]",
    dividerLine: "!bg-[#222e44]",
    identityPreviewEditButton: "!text-[#22d3ee]",
    formFieldSuccessText: "!text-emerald-400",
    alertText: "!text-[#f87171]",
    alert: "!bg-[#1a0808] !border-[#f87171]",
    logoBox: "flex items-center justify-center",
    logoImage: "w-10 h-10",
    otpCodeFieldInput: "!bg-[#141b2d] !border-[#222e44] !text-[#c5cfe0]",
    formFieldRow: "",
    main: "",
    footerAction: "!bg-[#0a101c]",
  },
};

/* ── Invalidate query cache on user change ── */
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

/* ── Sign-in page ── */
function SignInPage() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, hsl(228 35% 6%) 0%, hsl(220 40% 9%) 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(192 100% 50%/0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(260 80% 60%/0.05) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>
      <div className="relative z-10">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

/* ── Sign-up page ── */
function SignUpPage() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, hsl(228 35% 6%) 0%, hsl(220 40% 9%) 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(192 100% 50%/0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(260 80% 60%/0.05) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>
      <div className="relative z-10">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

/* ── Home: public landing OR redirect to overview ── */
function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/overview" />
      </Show>
      <Show when="signed-out">
        <Welcome />
      </Show>
    </>
  );
}

/* ── Protected app shell ── */
function ProtectedApp() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Switch>
            <Route path="/overview" component={Home} />
            <Route path="/documents" component={Documents} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/sessions/:id" component={SessionQA} />
            <Route path="/goals/:id" component={GoalDetail} />
            <Route path="/goals" component={Goals} />
            <Route path="/bug-finder" component={BugFinder} />
            <Route path="/password-checker" component={PasswordChecker} />
            <Route path="/scam-checker" component={ScamChecker} />
            <Route path="/gpa-calculator" component={GpaCalculator} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

/* ── App with Clerk ── */
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access RAG Engine",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start analysing documents with AI",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={ProtectedApp} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;

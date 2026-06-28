import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/themes";

// Use the publishable key directly — no Replit-specific host-based derivation needed on Vercel
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Don't set a base URL - the generated API routes already include /api/
// In development, Vite proxy forwards /api to http://localhost:5000
// In production, routes work directly with the same origin
// setBaseUrl(import.meta.env.VITE_API_URL || null);

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(222, 47%, 11%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "Space Grotesk, sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-md w-[440px] max-w-full overflow-hidden border shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-sm",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive font-medium",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-input bg-background hover:bg-muted text-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    formFieldInput: "flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "justify-center",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 text-destructive border-destructive/20",
    otpCodeFieldInput: "border-input focus:border-ring focus:ring-ring",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

// Render with or without Clerk based on configuration
const appElement = <App />;

if (!clerkPubKey) {
  // Fail fast with a clear message rather than rendering without ClerkProvider,
  // which causes useAuth() crashes throughout the app.
  document.getElementById("root")!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:#f8fafc;">
      <div style="text-align:center;padding:2rem;border:1px solid #334155;border-radius:0.5rem;max-width:480px;">
        <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">⚙️ Configuration Missing</h1>
        <p style="color:#94a3b8;margin-bottom:1rem;">
          <code style="background:#1e293b;padding:0.2em 0.5em;border-radius:0.25em;font-size:0.9em;">VITE_CLERK_PUBLISHABLE_KEY</code>
          is not set.
        </p>
        <p style="color:#64748b;font-size:0.875rem;">
          Add it to your <code style="background:#1e293b;padding:0.1em 0.4em;border-radius:0.25em;">.env</code> file locally,
          or to your Vercel project's Environment Variables.
        </p>
      </div>
    </div>
  `;
} else {
  // Render with Clerk
  createRoot(document.getElementById("root")!).render(
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={basePath || "/"}
      routerPush={(to) => window.location.href = to}
      routerReplace={(to) => window.location.replace(to)}
    >
      {appElement}
    </ClerkProvider>
  );
}
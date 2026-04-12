import { useAuth } from "@/_core/hooks/useAuth";
import { ITHelpDeskChat } from "@/components/ITHelpDeskChat";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <h1 className="headline text-center">IT Support</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="border-b border-border">
          <div className="container py-16 md:py-24 lg:py-32">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div>
                <h1 className="headline mb-6">
                  Intelligent IT Support
                </h1>
                <div className="flex justify-center mb-8">
                  <div className="divider-line"></div>
                </div>
              </div>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Experience next-generation IT help desk support powered by advanced AI reasoning. 
                Submit your issues in natural language and receive intelligent, step-by-step resolutions.
              </p>

              <div className="space-y-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="font-semibold"
                >
                  Sign In to Get Support
                </Button>
                <p className="text-sm text-muted-foreground">
                  Secure authentication powered by Manus
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="subheadline text-center mb-12">How It Works</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="editorial-card">
                <h3 className="font-serif font-semibold text-lg mb-3">1. Submit Your Issue</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your IT problem in natural language. Our system understands context and nuance.
                </p>
              </div>

              <div className="editorial-card">
                <h3 className="font-serif font-semibold text-lg mb-3">2. AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Our reasoning engine decomposes your issue into actionable steps with transparent logic.
                </p>
              </div>

              <div className="editorial-card">
                <h3 className="font-serif font-semibold text-lg mb-3">3. Get Resolution</h3>
                <p className="text-sm text-muted-foreground">
                  Receive step-by-step guidance, with human escalation when needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="border-t border-border bg-muted/30">
          <div className="container py-16 md:py-24">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="subheadline text-center">Comprehensive Support</h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 bg-accent"></div>
                  <div>
                    <h3 className="font-semibold mb-2">Automated Ticket Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Tickets are automatically categorized, prioritized, and tracked with full audit trails.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 bg-accent"></div>
                  <div>
                    <h3 className="font-semibold mb-2">Account & Security Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Handle account creation with identity verification and MFA-protected updates.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 bg-accent"></div>
                  <div>
                    <h3 className="font-semibold mb-2">Security Troubleshooting</h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced hypothesis-based diagnostics for security issues with immediate remediation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 bg-accent"></div>
                  <div>
                    <h3 className="font-semibold mb-2">Transparent Audit Logs</h3>
                    <p className="text-sm text-muted-foreground">
                      Every agent action, reasoning step, and tool call is logged for compliance.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 bg-accent"></div>
                  <div>
                    <h3 className="font-semibold mb-2">Self-Improving Knowledge Base</h3>
                    <p className="text-sm text-muted-foreground">
                      Dynamic knowledge base built from past resolutions, continuously improving accuracy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with User Info */}
      <div className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold">IT Support Portal</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {user?.role === "admin" ? (
        <AdminDashboard />
      ) : (
        <ITHelpDeskChat />
      )}
    </div>
  );
}

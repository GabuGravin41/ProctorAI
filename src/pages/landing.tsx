import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  Lock,
  Brain,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Compass,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Waitlist Form ───────────────────────────────────────────────────────────
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 justify-center max-w-md mx-auto">
        <CheckCircle2 className="h-5 w-5 text-slate-800 shrink-0" />
        <p className="text-sm font-medium text-slate-800">You're on the early access list! Thank you.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="Enter your institutional email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-10 flex-1 bg-white border-slate-200 text-sm focus-visible:ring-slate-900"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-medium shrink-0 rounded-md text-sm transition-colors"
        >
          {status === "loading" ? "Submitting..." : "Request Access"}
        </Button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1 justify-center">
          <AlertCircle className="h-3 w-3" />
          {message}
        </p>
      )}
    </form>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  const [studentCode, setStudentCode] = useState("");
  const [, setLocation] = useLocation();

  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentCode.trim()) {
      setLocation(`/join?code=${encodeURIComponent(studentCode.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased selection:bg-slate-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 px-6 md:px-12 h-16 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="ProctorAI Logo" className="h-7 w-7" />
          <span className="font-display font-semibold text-lg tracking-tight text-slate-900">ProctorAI</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#academic" className="hover:text-slate-900 transition-colors">Academic Portals</a>
          <Link href="/resources" className="hover:text-slate-900 transition-colors">Resources</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-slate-900 text-white px-4 py-1.5 rounded-md hover:bg-slate-800 transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white border-b border-slate-100 py-20 md:py-28">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1 text-xs font-medium text-slate-600 mb-6">
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              Academic Assessment & Proctoring
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-slate-900 mb-6 max-w-3xl mx-auto leading-[1.1]">
              Integrity-first online testing, made simple.
            </h1>

            <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Equip your academic assessments with real-time, browser-side AI proctoring, focus lockouts, and automated grading. Zero installations, zero hassle.
            </p>

            {/* Twin Entry Portals */}
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left mb-16">
              {/* Student Portal */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-1">For Students</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Access your exam instantly. Enter the code shared by your instructor to enter the testing room.
                  </p>
                </div>
                <form onSubmit={handleStudentJoin} className="space-y-2.5">
                  <Input
                    type="text"
                    placeholder="Enter Access Code (e.g. A1B2C3D4)"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="h-10 text-center font-mono tracking-widest text-sm bg-white border-slate-200"
                  />
                  <Button type="submit" className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-all flex items-center justify-center gap-1">
                    Join Exam <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </div>

              {/* Instructor Portal */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-1">For Educators</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Set up classrooms, create customized math or code quizzes, manage rosters, and audit proctoring logs.
                  </p>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/sign-up"
                    className="w-full h-10 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-medium text-sm rounded-md transition-all"
                  >
                    Create Coach Account
                  </Link>
                  <Link
                    href="/student"
                    className="w-full h-10 inline-flex items-center justify-center bg-transparent hover:bg-slate-50 text-slate-600 font-medium text-xs rounded-md transition-all gap-1"
                  >
                    Open Practice Environment <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-4 border-t border-slate-100 text-center">
              <div className="px-4">
                <div className="text-sm font-semibold text-slate-900">Browser-Side AI</div>
                <div className="text-xs text-slate-400 mt-1">Processed locally on the student's hardware.</div>
              </div>
              <div className="px-4 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0">
                <div className="text-sm font-semibold text-slate-900">Privacy-First Design</div>
                <div className="text-xs text-slate-400 mt-1">Only captures short video clips when flags trigger.</div>
              </div>
              <div className="px-4">
                <div className="text-sm font-semibold text-slate-900">Hybrid Assessments</div>
                <div className="text-xs text-slate-400 mt-1">Supports essay, code, and handwritten proof uploads.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="py-20 md:py-24 bg-slate-50/50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Security & Simplicity</p>
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight mb-4">
                Clean and Capable Testing Environment
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No complex local setups, plugins, or configurations required. Everything operates natively inside modern web browsers.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-150">
                  <Shield className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5">Intelligent Proctoring</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Webcam and audio analysis detects face visibility, head rotations, and handheld electronic devices locally without storing long recordings.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-150">
                  <Lock className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5">Focus lockdown</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Monitors and flags tab switches, fullscreen exit attempts, and clipboard actions (copy-paste restrictions) during the assessment.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-150">
                  <Brain className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5">AI-Assisted Builder</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Generate comprehensive math, logic, or science questions. Prompt our model to draft questions, solutions, and rubric constraints in seconds.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-150">
                  <Activity className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5">Proctor Audit Logs</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Review flagged events on an interactive session timeline. Every warning is paired with captured video-audio clips and screenshots for simple confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 md:py-24 bg-white border-y border-slate-100">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Workflow</p>
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">How ProctorAI Operates</h2>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 text-left">
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">01 / DESIGN</div>
                <h3 className="font-semibold text-slate-950 mb-1">Create Exams</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Compose questions or generate them with our integrated AI prompt. Save drafts and finalize exam duration.
                </p>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">02 / LAUNCH</div>
                <h3 className="font-semibold text-slate-950 mb-1">Distribute Codes</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate secure, unique access codes and assign them to student roster groups or cohorts.
                </p>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">03 / MONITOR</div>
                <h3 className="font-semibold text-slate-950 mb-1">Take Assessment</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Students join via browser. Webcam, microphone, and tab monitoring activate automatically.
                </p>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">04 / AUDIT</div>
                <h3 className="font-semibold text-slate-950 mb-1">Review Flags</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Review automatically graded questions and audit timestamped flag events with synchronized clips.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 md:py-24 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Transparent Pricing</p>
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight mb-4">
                Flexible Plans for Schools & Competition Academies
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Start with our free tier or contact us for direct institutional invoicing and bank payment options.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Starter</div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">Free</div>
                  <p className="text-xs text-slate-500 mb-6">Perfect for individual tutors and small contest pilots.</p>
                  
                  <ul className="space-y-3 text-xs text-slate-600 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to <strong>6 active exams</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to 50 students per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Full AI proctoring & focus lock</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Standard Leaderboard CSV export</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/sign-up"
                  className="w-full inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-md text-xs transition-colors text-center"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Institute Plan */}
              <div className="border-2 border-slate-900 rounded-xl p-6 bg-white shadow-md flex flex-col justify-between relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Institute</div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">Institutional Invoice</div>
                  <p className="text-xs text-slate-500 mb-6">Designed for schools, academies, and national contest bodies.</p>

                  <ul className="space-y-3 text-xs text-slate-600 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Unlimited active exams</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to 500 students per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Live Contest Monitor & 10s poll</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Proctoring Audit Report CSV</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Bulk roster & access code generator</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#waitlist"
                  className="w-full inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-md text-xs transition-colors text-center"
                >
                  Request Bank Details & Invoice
                </a>
              </div>

              {/* Organization Plan */}
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization</div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">Custom Tier</div>
                  <p className="text-xs text-slate-500 mb-6">For ministries, universities, and high-volume testing centers.</p>

                  <ul className="space-y-3 text-xs text-slate-600 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Unlimited students & exams</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Multi-coach & collaborator access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Dedicated onboarding & staff training</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Direct bank transfer / wire invoicing</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#waitlist"
                  className="w-full inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-medium py-2.5 rounded-md text-xs transition-colors text-center"
                >
                  Contact for Custom Quote
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Academic Portals / Onboarding Section */}
        <section id="academic" className="py-20 md:py-24 bg-slate-50/50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Get Started</p>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight mb-4">
              Enter the Testing Portal
            </h2>
            <p className="text-sm text-slate-500 mb-12 max-w-lg mx-auto">
              Select your path to access practice Olympiad questions, mock rounds, or to set up custom exams for your class.
            </p>

            <div className="grid md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
              {/* Coach Account */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-slate-700" />
                    <h3 className="font-bold text-slate-900 text-lg">Educator & Coach Workspace</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Set up test structures, configure webcam/focus proctoring thresholds, manage rosters, and review student cheating logs.
                  </p>
                </div>
                <Link href="/sign-up" className="w-full inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-md text-sm transition-colors text-center">
                  Create Coach Account
                </Link>
              </div>

              {/* Student Practice */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="h-5 w-5 text-slate-700" />
                    <h3 className="font-bold text-slate-900 text-lg">Student Practice Area</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Train with practice papers, logic puzzles, past Olympiad questions, and review automated feedback.
                  </p>
                </div>
                <Link href="/student" className="w-full inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-medium py-2 rounded-md text-sm transition-colors text-center">
                  Open Practice Portal
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section id="waitlist" className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-xl mx-auto px-6 text-center">
            <h3 className="text-xl font-bold text-slate-950 mb-2">Request Early Deployment</h3>
            <p className="text-xs text-slate-500 mb-8 max-w-sm mx-auto">
              Interested in deploying ProctorAI for school-wide assessments, private contests, or custom LMS integrations? Get in touch.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-150 bg-slate-50 text-slate-500 text-xs">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="ProctorAI" className="h-5 w-5 opacity-70" />
            <span className="font-semibold text-slate-800">ProctorAI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-800 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-800 transition-colors">How It Works</a>
            <Link href="/sign-in" className="hover:text-slate-800 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-800 transition-colors">Get Started</Link>
          </div>
          <p>© {new Date().getFullYear()} ProctorAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
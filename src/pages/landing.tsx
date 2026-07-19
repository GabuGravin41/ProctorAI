import { useState } from "react";
import { Link } from "wouter";
import {
  ShieldCheck, UserCheck, BarChart3, Clock, AlertTriangle, Sparkles,
  ArrowRight, CheckCircle2, Eye, Monitor, Brain, Lock, Star, ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Waitlist Form ───────────────────────────────────────────────────────────
function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the list!");
        setEmail("");
        setName("");
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
      <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""} bg-green-50 border border-green-200 rounded-xl p-4`}>
        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">You're on the waitlist! 🎉</p>
          <p className="text-sm text-green-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${compact ? "" : "max-w-md"}`}>
      {!compact && (
        <div className="mb-3">
          <Input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 bg-white/90 border-border/50 text-base"
          />
        </div>
      )}
      <div className={`flex gap-2 ${compact ? "" : ""}`}>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 flex-1 bg-white/90 border-border/50 text-base"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
        >
          {status === "loading" ? "Joining..." : "Join Waitlist"}
          {status !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-500">{message}</p>
      )}
    </form>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────
const STATS = [
  { value: "98%", label: "Detection accuracy", suffix: "" },
  { value: "< 30s", label: "Flag detection speed", suffix: "" },
  { value: "∞", label: "Concurrent sessions", suffix: "" },
  { value: "Zero", label: "Video storage needed", suffix: "" },
];

// ── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "AI Question Generation",
    description: "Paste any topic or syllabus text. ProctorAI generates a full bank of multiple-choice, true/false, short-answer, and essay questions in seconds.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: Eye,
    title: "Live Proctoring",
    description: "Camera and microphone monitoring throughout the exam. AI flags face not visible, multiple people, looking away, and phone usage — in real time.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Monitor,
    title: "Tab & Fullscreen Detection",
    description: "Any attempt to leave the exam window is instantly detected and reported. Students see live flag counts, creating a powerful deterrent.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: ShieldCheck,
    title: "Secure Access Codes",
    description: "Each student gets a unique access code — generated at publish time. No sign-up required for students. Codes are revoked when the exam is archived.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: BarChart3,
    title: "Detailed Flag Review",
    description: "Every flagged incident is timestamped and queued for review. Instructors confirm or dismiss each flag with optional review notes.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Auto-grading for all objective question types. Students get scored results the moment they submit. Instructors see class-wide analytics.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

// ── How It Works ──────────────────────────────────────────────────────────────
const STEPS = [
  { step: "01", title: "Create Your Exam", description: "Add questions manually or let AI generate a complete question bank from any topic." },
  { step: "02", title: "Publish & Share Codes", description: "Enter student emails, publish the exam, and share the auto-generated access codes." },
  { step: "03", title: "Students Take It", description: "Students join with their code. Camera, mic, and tab monitoring starts automatically." },
  { step: "04", title: "Review & Grade", description: "Receive instant scores and a complete log of flagged incidents for review." },
];

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "We were running exams on Google Forms with zero proctoring. ProctorAI is the closest thing to an in-person exam we've had online.",
    name: "Dr. Amara K.",
    role: "Lecturer, Computer Science",
    initials: "AK",
    color: "bg-indigo-600",
  },
  {
    quote: "The AI question generator saved us hours of question-paper preparation. The flagging system actually caught several cases.",
    name: "Prof. James O.",
    role: "Head of Examinations",
    initials: "JO",
    color: "bg-blue-600",
  },
  {
    quote: "Students know they're being monitored. The live flag counter alone reduces cheating attempts significantly.",
    name: "Ms. Fatima R.",
    role: "Online Instructor",
    initials: "FR",
    color: "bg-purple-600",
  },
];

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 px-6 h-16 flex items-center justify-between border-b bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="ProctorAI" className="h-8 w-8" />
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">ProctorAI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
          <Link href="/student" className="hover:text-slate-900 transition-colors">Practice Exams</Link>
          <a href="#waitlist" className="hover:text-slate-900 transition-colors">Waitlist</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
          {/* Gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-20 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" style={{ animationDelay: "1s" }} />
            <div className="absolute bottom-0 left-1/3 w-96 h-64 bg-blue-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Exam Proctoring
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6 leading-tight">
              Academic Integrity,
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Automated.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Create exams in minutes, proctor them with AI, and review results with confidence — all without a single invigilator in the room.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-indigo-500/25"
              >
                Start for Free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/student"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-all hover:scale-105"
              >
                Practice Olympiad Exams
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-display font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">Everything you need</p>
              <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">
                The Command Center for Online Exams
              </h2>
              <p className="text-lg text-slate-500 max-w-xl mx-auto">
                From question generation to final grade — ProctorAI handles the full lifecycle of a proctored assessment.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="group p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:border-slate-200 transition-all duration-200">
                    <div className={`h-12 w-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">Simple process</p>
              <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">Up and running in minutes</h2>
              <p className="text-lg text-slate-500">No complex setup. No plugins. No invigilators.</p>
            </div>
            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.step} className="flex gap-6 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-full bg-indigo-600 text-white font-display font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-200">
                    {step.step}
                  </div>
                  <div className="flex-1 pb-6 border-b border-slate-100 last:border-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="flex justify-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
              </div>
              <h2 className="text-4xl font-display font-bold text-slate-900">Trusted by educators</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-600 mb-6 leading-relaxed italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${t.color} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                      <p className="text-slate-400 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding & Practice CTA Section */}
        <section id="get-started" className="py-24 px-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              Get Started Today
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Step Into the Testing Portal
            </h2>
            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
              Choose your role below to access proctored exams, mock rounds, and practice question sets.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-16 text-left">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Educators & Coaches</h3>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    Set up examinations, configure AI-proctoring settings, manage secure student codes, and view real-time cheating logs.
                  </p>
                </div>
                <Link href="/sign-up" className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition-all">
                  Create Coach Account
                </Link>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Students & Contestants</h3>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    Practice with mock selection tests, Bebras logic puzzles, and training papers for the KMO and KIO contests.
                  </p>
                </div>
                <Link href="/student" className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3 px-6 rounded-xl transition-all">
                  Open Practice Portal
                </Link>
              </div>
            </div>

            {/* Waitlist fallback */}
            <div id="waitlist" className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-2">Request Early Beta Access</h3>
              <p className="text-slate-300 text-sm mb-6">
                Are you an institution looking for early deployment support or custom integrations? Join the list.
              </p>
              <WaitlistForm />
              <p className="text-xs text-slate-400 mt-4">
                No spam, ever. Your email is only used to contact you about beta access.
              </p>
            </div>
          </div>
        </section>

        {/* Also show a compact waitlist form in the hero area nav */}
      </main>

      <footer className="py-10 border-t bg-slate-950 text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="ProctorAI" className="h-6 w-6 opacity-80" />
            <span className="font-display font-bold text-slate-200">ProctorAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-200 transition-colors">How It Works</a>
            <Link href="/sign-in" className="hover:text-slate-200 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-200 transition-colors">Get Started</Link>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} ProctorAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
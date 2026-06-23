import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, UserCheck, BarChart3, Clock, AlertTriangle, PlayCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-6 h-16 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="ProctorAI" className="h-8 w-8 text-primary" />
          <span className="font-display font-bold text-xl tracking-tight text-primary">ProctorAI</span>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Sign In
          </Link>
          <Link href="/sign-up" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Get Started
          </Link>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="py-24 px-6 max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-primary mb-6">
            Academic Integrity,<br />Automated.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A precision tool for educators who need certainty that their assessments are fair, and for students who want to prove their merit without doubt.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/sign-up" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
              Start Free Trial
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
              View Demo
            </Button>
          </div>
        </section>

        <section className="py-20 bg-slate-50 border-y">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">The Command Center for Exams</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Automated Proctoring</h3>
                <p className="text-muted-foreground">AI-driven behavior analysis detects anomalies like looking away, multiple faces, and suspicious audio.</p>
              </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <UserCheck className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Identity Verification</h3>
                <p className="text-muted-foreground">Ensure the right student is taking the exam with continuous face monitoring throughout the session.</p>
              </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <BarChart3 className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Detailed Reports</h3>
                <p className="text-muted-foreground">Review flagged moments with video clips and make final determinations on academic integrity.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 text-center text-muted-foreground border-t bg-white">
        <p>© {new Date().getFullYear()} ProctorAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
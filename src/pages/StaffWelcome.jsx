import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

const LOGO_URL = "https://media.base44.com/images/public/69bc142eb9f3db8371a26be3/70a2ee961_logo.png";

const steps = [
  {
    icon: Mail,
    title: "Check your email",
    desc: "After your admin invites you, you'll receive a secure invitation email from CareFlow Ops.",
  },
  {
    icon: ArrowRight,
    title: "Click the link",
    desc: "Open the invitation email and click the link to set up your account and password.",
  },
  {
    icon: Lock,
    title: "Set your password",
    desc: "Choose a secure password, then return here to sign in with your email and new password.",
  },
];

export default function StaffWelcome() {
  const { navigateToLogin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex flex-col">
      {/* Top bar */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="CareFlow Ops" className="h-9 w-auto" />
          <span className="text-lg font-semibold text-slate-800 tracking-tight">
            CareFlow Ops
          </span>
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:inline">
          Staff Portal
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Staff Access
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Welcome to CareFlow Ops
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Your all-in-one platform for client documentation, medication tracking,
            scheduling, and compliance — built for I/DD service providers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-[#0b81b7] hover:bg-[#0a6f9d] text-white px-8 h-12 text-base font-semibold rounded-lg shadow-sm"
              onClick={() => navigateToLogin()}
            >
              Staff Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* First-time login guidance */}
          <div className="mt-14 text-left">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                First time here?
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-300">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-slate-200/60">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} CareFlow Ops. All rights reserved.</span>
          <span>Need help? Contact your agency administrator.</span>
        </div>
      </footer>
    </div>
  );
}
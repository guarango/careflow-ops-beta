import React, { useState, useContext } from "react";
import { PortalContext } from "@/pages/Portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, EyeOff, Heart } from "lucide-react";

const DEMO_USERS = {
  "guardian@demo.com": {
    id: "portal-001", full_name: "Sandra Rivera", email: "guardian@demo.com",
    portal_role: "Guardian", relationship: "Mother", client_id: "demo-client",
    client_name: "Marcus Rivera", access_level: "Full", messaging_enabled: true,
  },
  "client@demo.com": {
    id: "portal-002", full_name: "Marcus Rivera", email: "client@demo.com",
    portal_role: "Client", relationship: "Self", client_id: "demo-client",
    client_name: "Marcus Rivera", access_level: "Full", messaging_enabled: true,
  },
  "cm@demo.com": {
    id: "portal-003", full_name: "Dr. James Okoye", email: "cm@demo.com",
    portal_role: "Case Manager", relationship: "External Case Manager", client_id: "demo-client",
    client_name: "Marcus Rivera", access_level: "Read Only", messaging_enabled: true,
  },
};

export default function PortalLogin() {
  const { handleLogin } = useContext(PortalContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 800));
    const user = DEMO_USERS[email.toLowerCase()];
    if (user && password.length >= 4) {
      handleLogin(user);
    } else {
      setError("Invalid email or password. Try guardian@demo.com / any password.");
    }
    setLoading(false);
  };

  const quickLogin = (role) => {
    const emails = { Guardian: "guardian@demo.com", Client: "client@demo.com", "Case Manager": "cm@demo.com" };
    handleLogin(DEMO_USERS[emails[role]]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-600 shadow-lg mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">CareOps Family Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Secure access to your loved one's care</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className="mt-1" required />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Input type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={loading}>
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-center text-slate-500 mb-3">Demo — Quick Login</p>
              <div className="grid grid-cols-3 gap-2">
                {["Guardian", "Client", "Case Manager"].map(role => (
                  <button key={role} onClick={() => quickLogin(role)}
                    className="text-xs py-2 px-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors">
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <Shield className="w-3 h-3" /> HIPAA-compliant · Encrypted · Secure
        </div>
      </div>
    </div>
  );
}
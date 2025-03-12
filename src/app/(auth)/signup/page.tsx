'use client';
import React, { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { EyeIcon, EyeOffIcon, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "~/components/ui/checkbox";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await response.json();
      let errorMessage = "";
      if (!response.ok) {
        if (data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = "Registration failed.";
        }
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
      toast.success("Registration successful! Please sign in.");
      router.push("/login");
    } catch (error) {
      toast.error("An error occurred.");
    }
    setLoading(false);
  };

  const LoadingOverlay = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-white" />
      <p className="mt-4 text-white">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950">
      {loading && <LoadingOverlay />}
      <Card className="w-full max-w-sm glass-card">
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded bg-white/20 backdrop-blur-sm dark:bg-slate-800/20 
                       text-slate-700 dark:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-800/30 
                       transition-colors"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>
            Enter your email and password to create your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                placeholder="me@example.com"
                required
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={passwordVisible ? "text" : "password"}
                required
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                endIcon={
                  passwordVisible
                    ? (props) => <EyeOffIcon {...props} onClick={() => setPasswordVisible(false)} />
                    : (props) => <EyeIcon {...props} onClick={() => setPasswordVisible(true)} />
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="rememberMe">Remember me</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={loading} type="submit">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign up
            </Button>
          </CardFooter>
        </form>
        <div className="flex justify-center mt-4">
          <Button variant="link" onClick={() => router.push("/login")}>
            Already have an account? Sign in
          </Button>
        </div>
      </Card>
    </div>
  );
}

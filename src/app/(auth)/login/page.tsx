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
import { signIn } from "next-auth/react";
import { Checkbox } from "~/components/ui/checkbox";
import Image from "next/image";

export default function LoginPage() {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    const response = await signIn("standard", {
      redirect: false,
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
    });
    if (response) {
      if (response.error) {
        if (response.error === "CredentialsSignin") {
          toast.error("Your email or password is incorrect. Please try again.");
        } else {
          toast.error("An error occurred.", { description: response.error });
        }
        setLoading(false);
        return;
      } else if (!response.ok) {
        toast.error("Your email or password is incorrect. Please try again.");
        setLoading(false);
        return;
      } else {
        router.push("/");
      }
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
      <div className="flex p-6 items-center justify-center">
          <Image 
          src={"/img/BGM-logo.webp"} 
          alt={"BGM"}
          height={"100"}
          width={"100"}
          >
          </Image>
      </div>
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded bg-white/20 backdrop-blur-sm dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email and password to log in.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
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
              Sign in
            </Button>
          </CardFooter>
        </form>
        <div className="flex justify-center mt-4">
          <Button variant="link" onClick={() => router.push("/signup")}>
            Don't have an account? Sign up
          </Button>
        </div>
        <div className="flex p-6 justify-center">
          <Image 
           src={"/img/waystone.webp"} 
           alt={"waystone"}
           height={"100"}
           width={"100"}
           >
           </Image>
        </div>
      </Card>
    </div>
  );
}

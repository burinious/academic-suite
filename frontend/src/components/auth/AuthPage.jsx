import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(mode, form) {
  const errors = {};

  if (mode === "signup" && !form.name.trim()) {
    errors.name = "Full name is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!emailPattern.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (mode === "signup") {
    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  return errors;
}

function PasswordField({ id, label, value, onChange, error, placeholder, visible, onToggle, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn("pr-12", error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100")}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}

export function AuthPage() {
  const { authProvider, hasUsers, login, register } = useAuth();
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (hasUsers) {
      setMode("login");
    }
  }, [hasUsers]);

  const heroStats = useMemo(
    () => [
      { label: "Reusable presets", value: "Save once" },
      { label: "Delivery speed", value: "Same workflow" },
      { label: "Workspace access", value: "Account required" },
    ],
    [],
  );

  const handleToggleMode = () => {
    setMode((current) => (current === "signup" ? "login" : "signup"));
    setErrors({});
    setSubmitError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm(mode, form);
    setErrors(validationErrors);
    setSubmitError("");

    if (Object.keys(validationErrors).length) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
        });
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
      }
    } catch (runtimeError) {
      setSubmitError(runtimeError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#f8fafc_0%,#eef6ff_40%,#f4f9f8_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.1),transparent_28%)]" />
      <div className="absolute left-10 top-14 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="absolute bottom-12 right-12 h-64 w-64 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex items-center">
            <div className="relative w-full overflow-hidden rounded-[40px] border border-white/70 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
              <img
                src="/auth-hero.svg"
                alt="Academic Data Processing Suite startup artwork"
                className="h-full min-h-[380px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/38 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
                  Academic Data Processing Suite
                </p>
                <h1 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Sort cleaner. Validate faster. Reuse your flow with confidence.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                  A focused startup surface for a premium academic data workspace. Minimal. Sharp. Account-first.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {heroStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/15 bg-white/8 px-4 py-4 backdrop-blur"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-100/80">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md rounded-[34px] border border-white/80 bg-white/82 p-7 shadow-[0_28px_72px_rgba(148,163,184,0.22)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-950 p-3 text-white">
                  {mode === "signup" ? <Sparkles className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                    {mode === "signup" ? "Create Access" : "Welcome Back"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-slate-950">
                    {mode === "signup" ? "Open your workspace" : "Sign in to continue"}
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {mode === "signup"
                  ? `Create an account before entering the suite. Your workspace access is now backed by ${authProvider === "firebase" ? "Firebase Auth" : "the server"}.`
                  : `Use the account you already created to continue into the academic workspace via ${authProvider === "firebase" ? "Firebase" : "the current auth service"}.`}
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                {mode === "signup" ? (
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={handleChange("name")}
                      autoComplete="name"
                      placeholder="Example: Tobi Adeyemi"
                      className={cn(errors.name && "border-rose-300 focus:border-rose-400 focus:ring-rose-100")}
                    />
                    {errors.name ? <p className="mt-2 text-xs font-medium text-rose-700">{errors.name}</p> : null}
                  </div>
                ) : null}

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    autoComplete="email"
                    placeholder="name@example.com"
                    className={cn(errors.email && "border-rose-300 focus:border-rose-400 focus:ring-rose-100")}
                  />
                  {errors.email ? <p className="mt-2 text-xs font-medium text-rose-700">{errors.email}</p> : null}
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Minimum 8 characters"
                  error={errors.password}
                  visible={showPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />

                {mode === "signup" ? (
                  <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    placeholder="Repeat your password"
                    error={errors.confirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((current) => !current)}
                    autoComplete="new-password"
                  />
                ) : null}

                {submitError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <Button className="mt-2 w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Login"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-slate-950 shadow-sm">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {mode === "signup" ? "Already have an account?" : "Need an account first?"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mode === "signup" ? "Slide back in and sign in." : "Create one and step into the suite."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  {mode === "signup" ? "Sign in" : "Create account"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

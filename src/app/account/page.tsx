"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { User as UserIcon, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, LogOut, Package, Calendar, Gift, KeyRound, X } from "lucide-react";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
}

const CUSTOMER_ONLY_MESSAGE = "This account is not registered as a customer.";

export default function AccountPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const checkUser = useCallback(async () => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, role")
          .eq("id", authUser.id)
          .single();

        if (customerProfile?.role !== "customer") {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setError(CUSTOMER_ONLY_MESSAGE);
          return false;
        }

        setUser(authUser);
        setProfile(customerProfile);
      } else {
        setUser(null);
        setProfile(null);
      }

      return true;
    } finally {
      setCheckingAuth(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        setUser(null);
        setProfile(null);
        setError("");
        setSuccess("");
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Authentication service not configured");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send password reset email");
      }

      setSuccess("If an account exists for this email, a password reset link has been sent.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to send password reset email");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Authentication service not configured");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setMode("login");
      setSuccess("Password updated successfully. You can now sign in.");
      window.history.replaceState({}, "", "/account");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!supabase) {
      setError("Authentication service not configured");
      setLoading(false);
      return;
    }

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          setSuccess("Account created! Please check your email to verify your account.");
          setMode("login");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const isCustomer = await checkUser();
          if (isCustomer) {
            router.refresh();
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCheckingAuth(false);
    router.refresh();
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess("");
        }, 2000);
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch {
      setPasswordError("An error occurred while changing password");
    } finally {
      setChangingPassword(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="py-20 bg-stone-50 min-h-[70vh]">
        <div className="mx-auto flex h-64 max-w-4xl items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#FF8C6B]" />
        </div>
      </div>
    );
  }

  // If user is logged in, show dashboard
  if (user) {
    return (
      <div className="py-20 bg-stone-50 min-h-[70vh]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-stone-900">My Account</h1>
            <p className="text-stone-600 mt-1">Welcome back, {profile?.full_name || user.email}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link href="/account/orders">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-[#FF8C6B] mx-auto mb-3" />
                  <h3 className="font-semibold text-stone-900">My Orders</h3>
                  <p className="text-sm text-stone-500 mt-1">View order history</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/account/bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <Calendar className="h-10 w-10 text-[#FF8C6B] mx-auto mb-3" />
                  <h3 className="font-semibold text-stone-900">My Bookings</h3>
                  <p className="text-sm text-stone-500 mt-1">View class bookings</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/account/vouchers">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <Gift className="h-10 w-10 text-[#FF8C6B] mx-auto mb-3" />
                  <h3 className="font-semibold text-stone-900">My Vouchers</h3>
                  <p className="text-sm text-stone-500 mt-1">View gift cards</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <p className="text-stone-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                  <p className="text-stone-900">{profile?.full_name || "Not set"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
                  <p className="text-stone-900">{profile?.phone || "Not set"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Member Since</label>
                  <p className="text-stone-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          {showPasswordChange && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-blue-600" />
                    Change Password
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordError("");
                      setPasswordSuccess("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{passwordError}</p>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">{passwordSuccess}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Current Password
                  </label>
                  <PasswordInput
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      New Password
                    </label>
                    <PasswordInput
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Confirm New Password
                    </label>
                    <PasswordInput
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordError("");
                      setPasswordSuccess("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Login/Register form
  return (
    <div className="py-20 bg-stone-50 min-h-[70vh]">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="text-center">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <UserIcon className="h-7 w-7 text-[#FF8C6B]" />
            </div>
            <CardTitle className="text-2xl">
              {mode === "login"
                ? "Welcome Back"
                : mode === "register"
                  ? "Create Account"
                  : mode === "forgot-password"
                    ? "Reset Password"
                    : "Choose New Password"}
            </CardTitle>
            <p className="text-stone-600 text-sm mt-2">
              {mode === "login"
                ? "Sign in to access your orders and bookings"
                : mode === "register"
                  ? "Join Mamalu Kitchen for exclusive benefits"
                  : mode === "forgot-password"
                    ? "Enter your email to receive a password reset link"
                    : "Enter and confirm your new password"}
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <form
              onSubmit={
                mode === "forgot-password"
                  ? handleForgotPassword
                  : mode === "reset-password"
                    ? handleResetPassword
                    : handleSubmit
              }
              className="space-y-4"
            >
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input 
                      placeholder="John Doe" 
                      className="pl-10" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              {mode !== "reset-password" && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              )}
              {mode !== "forgot-password" && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {mode === "reset-password" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 z-10" />
                  <PasswordInput
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              )}
              {(mode === "register" || mode === "reset-password") && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    {mode === "reset-password" ? "Confirm New Password" : "Confirm Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 z-10" />
                    <PasswordInput
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}
              {mode === "login" && (
                <div className="text-right">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode("forgot-password");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-sm text-[#FF8C6B] hover:text-[#ff7a54]"
                  >
                    Forgot password?
                  </a>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : mode === "register"
                      ? "Create Account"
                      : mode === "forgot-password"
                        ? "Send Reset Link"
                        : "Update Password"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              {(mode === "forgot-password" || mode === "reset-password") ? (
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-sm text-[#FF8C6B] hover:text-[#ff7a54] font-medium"
                >
                  Back to sign in
                </button>
              ) : (
              <p className="text-sm text-stone-600">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-[#FF8C6B] hover:text-[#ff7a54] font-medium"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

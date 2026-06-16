"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "../../../components/auth/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: Record<string, string>) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      if (values.rememberMe) {
        localStorage.setItem("eternalmap_token", data.data.token);
      } else {
        sessionStorage.setItem("eternalmap_token", data.data.token);
      }
      router.push("/dashboard/reports");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">EternalMap</h1>
          <p className="text-slate-500 mt-2">Sign in to your cemetery management account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <AuthForm
          mode="login"
          onSubmit={handleSubmit}
          loading={loading}
        />

        <div className="mt-6 flex items-center justify-between text-sm">
          <label className="flex items-center text-slate-600">
            <input type="checkbox" className="mr-2 rounded border-slate-300" />
            Remember me
          </label>
          <Link href="/auth/forgot-password" className="text-emerald-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-emerald-700 font-medium hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "../../../components/auth/AuthForm";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStepSubmit = async (values: Record<string, string>) => {
    setError("");
    const merged = { ...formData, ...values };
    setFormData(merged);

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: merged.email,
          password: merged.password,
          firstName: merged.firstName,
          lastName: merged.lastName,
          organizationName: merged.organizationName,
          organizationSlug: merged.organizationSlug,
          cemeteryName: merged.cemeteryName,
          cemeteryAddress: merged.cemeteryAddress,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      router.push("/auth/login");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const stepTitles = ["", "Account Info", "Organization", "Cemetery Setup"];
  const stepDescriptions = [
    "",
    "Create your EternalMap admin account",
    "Tell us about your organization",
    "Set up your first cemetery",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">EternalMap</h1>
          <div className="flex justify-center mt-4 mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    s <= step ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && <div className="w-8 h-0.5 bg-slate-200 mx-1" />}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-slate-700">{stepTitles[step]}</p>
          <p className="text-xs text-slate-500">{stepDescriptions[step]}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <AuthForm
          mode="register"
          step={step}
          onSubmit={handleStepSubmit}
          loading={loading}
        />

        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
            type="button"
          >
            ← Back
          </button>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-emerald-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
  step?: number;
  onSubmit: (values: Record<string, string>) => void;
  loading?: boolean;
}

export default function AuthForm({ mode, step = 1, onSubmit, loading }: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (mode === "login") {
      if (!values.email) nextErrors.email = "Email is required";
      if (!values.password) nextErrors.password = "Password is required";
    } else {
      if (step === 1) {
        if (!values.firstName) nextErrors.firstName = "First name is required";
        if (!values.lastName) nextErrors.lastName = "Last name is required";
        if (!values.email) nextErrors.email = "Email is required";
        if (!values.password) nextErrors.password = "Password is required";
        else if (values.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
      }
      if (step === 2) {
        if (!values.organizationName) nextErrors.organizationName = "Organization name is required";
        if (!values.organizationSlug) nextErrors.organizationSlug = "Slug is required";
      }
      if (step === 3) {
        if (!values.cemeteryName) nextErrors.cemeteryName = "Cemetery name is required";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  const inputClass = (name: string) =>
    `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
      errors[name] ? "border-red-300" : "border-slate-200"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "login" && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              className={inputClass("email")}
              placeholder="you@example.com"
              value={values.email || ""}
              onChange={handleChange}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              className={inputClass("password")}
              placeholder="••••••••"
              value={values.password || ""}
              onChange={handleChange}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
        </>
      )}

      {mode === "register" && step === 1 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                name="firstName"
                type="text"
                className={inputClass("firstName")}
                value={values.firstName || ""}
                onChange={handleChange}
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                name="lastName"
                type="text"
                className={inputClass("lastName")}
                value={values.lastName || ""}
                onChange={handleChange}
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              className={inputClass("email")}
              placeholder="you@example.com"
              value={values.email || ""}
              onChange={handleChange}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              className={inputClass("password")}
              placeholder="••••••••"
              value={values.password || ""}
              onChange={handleChange}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
        </>
      )}

      {mode === "register" && step === 2 && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
            <input
              name="organizationName"
              type="text"
              className={inputClass("organizationName")}
              value={values.organizationName || ""}
              onChange={handleChange}
            />
            {errors.organizationName && <p className="text-xs text-red-500 mt-1">{errors.organizationName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Slug</label>
            <input
              name="organizationSlug"
              type="text"
              className={inputClass("organizationSlug")}
              placeholder="greenlawn-memorial"
              value={values.organizationSlug || ""}
              onChange={handleChange}
            />
            {errors.organizationSlug && <p className="text-xs text-red-500 mt-1">{errors.organizationSlug}</p>}
          </div>
        </>
      )}

      {mode === "register" && step === 3 && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cemetery Name</label>
            <input
              name="cemeteryName"
              type="text"
              className={inputClass("cemeteryName")}
              value={values.cemeteryName || ""}
              onChange={handleChange}
            />
            {errors.cemeteryName && <p className="text-xs text-red-500 mt-1">{errors.cemeteryName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cemetery Address</label>
            <input
              name="cemeteryAddress"
              type="text"
              className={inputClass("cemeteryAddress")}
              placeholder="1234 Eternal Way, Springfield, IL"
              value={values.cemeteryAddress || ""}
              onChange={handleChange}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Please wait..." : mode === "register" && step < 3 ? "Continue" : mode === "register" ? "Create Account" : "Sign In"}
      </button>
    </form>
  );
}

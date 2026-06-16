import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe, Zap, Shield, GitBranch, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="flex h-16 items-center justify-between border-b px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
            <Globe className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">GeoVerify</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center lg:px-12">
        <div className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-4 py-1.5 text-sm text-slate-600">
          <Zap className="h-3.5 w-3.5" />
          Now with GeoJSON RFC 7946 validation
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Catch geospatial regressions before they reach production
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          GeoVerify runs your spatial assertions on every commit. Validate coordinates,
          bounding boxes, CRS mappings, and topology with confidence.
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Start Testing Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-slate-50 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-900">
            Built for geospatial engineers
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GitBranch,
                title: "Git-Native CI",
                description:
                  "Trigger test suites on every push, PR, and release. Native GitHub integration with commit-level reporting.",
              },
              {
                icon: Shield,
                title: "Spatial Assertions",
                description:
                  "Built-in assertion types for coordinate precision, CRS checks, topology validation, bounding boxes, and more.",
              },
              {
                icon: Zap,
                title: "Fast Feedback",
                description:
                  "Parallel test execution with intelligent caching. Get results in seconds, not minutes.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <feature.icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-slate-900">
            Trusted by teams shipping spatial data
          </h2>
          <div className="space-y-4 text-left">
            {[
              "Coordinate precision validation within 1cm tolerance",
              "Automatic CRS reprojection checks on ingest",
              "Topology validation for complex polygon datasets",
              "Bounding box drift detection across releases",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-slate-900 px-6 py-24 text-center lg:px-12">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">
          Start verifying your geospatial data today
        </h2>
        <p className="mb-8 text-slate-400">
          Free for open source. Team plans start at $29/mo.
        </p>
        <Link href="/login">
          <Button size="lg" variant="secondary" className="gap-2">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-slate-500 lg:px-12">
        © {new Date().getFullYear()} GeoVerify. All rights reserved.
      </footer>
    </div>
  );
}

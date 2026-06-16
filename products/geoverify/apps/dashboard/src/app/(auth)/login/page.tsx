import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Github } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
            <Globe className="h-4 w-4" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">GeoVerify</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your GeoVerify account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/api/auth/signin/github" method="POST">
              <Button type="submit" variant="outline" className="w-full gap-2">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="#" className="underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="#" className="underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

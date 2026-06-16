"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, ChevronRight } from "lucide-react";

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link href="/projects" className="hover:text-foreground">
        Dashboard
      </Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const href = "/" + segments.slice(0, i + 1).join("/");
        const label = segment.charAt(0).toUpperCase() + segment.slice(1);
        return (
          <div key={href} className="flex items-center">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className={cn("font-medium text-foreground", isLast && "ml-1")}>
                {label}
              </span>
            ) : (
              <Link href={href} className="ml-1 hover:text-foreground">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <Breadcrumb />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://avatars.githubusercontent.com/u/1?v=4" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

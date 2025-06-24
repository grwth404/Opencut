"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@/lib/auth-client";
import { getStars } from "@/lib/fetchGhStars";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [star, setStar] = useState<string>("");

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const data = await getStars();
        setStar(data);
      } catch (err) {
        console.error("Failed to fetch GitHub stars", err);
      }
    };

    fetchStars();
  }, []);

  const leftContent = (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/logo.png" alt="OpenCut Logo" width={24} height={24} />
      <span className="font-medium tracking-tight">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center">
      <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
        <Button
          variant="ghost"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="hidden sm:inline">GitHub</span>
          <span className="text-foreground flex items-center">
            {star}+
            <Star className="w-4 h-4 ml-1" />
          </span>
        </Button>
      </Link>
      <Link href={session ? "/editor" : "/login"}>
        <Button size="sm" className="text-sm ml-4">
          Start editing
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );

  return <HeaderBase leftContent={leftContent} rightContent={rightContent} />;
}

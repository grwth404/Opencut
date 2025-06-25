"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@opencut/auth/client";
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
      <Image src="/logo.svg" alt="OpenCut Logo" width={142} height={32} />
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center">
      <Link href="/contributors">
        <Button variant="text" className="text-sm">
          Contributors
        </Button>
      </Link>
      {process.env.NODE_ENV === "development" ? (
        <Link href="/editor">
          <Button size="sm" className="text-sm ml-4">
            Editor
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
          <Button size="sm" className="text-sm ml-4">
            GitHub {star}+
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </nav>
  );

  return (
    <HeaderBase
      className="bg-[#1D1D1D] border border-white/10 rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}

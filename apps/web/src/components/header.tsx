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

function Logo() {
  return (
    <>
      <div className="hidden sm:block">
        <svg
          width="142"
          height="32"
          viewBox="0 0 142 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 9.37305V22.627L22.627 32H9.37305L0 22.627V9.37305L9.37305 0H22.627L32 9.37305ZM8 8V24H24V8H8Z"
            fill="white"
          />
          <path
            d="M53.048 24.884C48.104 24.884 45.104 21.524 45.104 16.004C45.104 10.484 48.104 7.076 53.048 7.076C58.04 7.076 61.016 10.484 61.016 16.004C61.016 21.524 58.04 24.884 53.048 24.884ZM53.048 22.508C56.36 22.508 58.328 20.108 58.328 16.004C58.328 11.9 56.36 9.452 53.048 9.452C49.784 9.452 47.792 11.9 47.792 16.004C47.792 20.108 49.784 22.508 53.048 22.508ZM62.9433 28.1V11.732H65.3433L65.3913 13.676C66.1353 12.212 67.5513 11.444 69.2553 11.444C72.9993 11.444 74.7273 14.516 74.7273 18.116C74.7273 21.716 72.9753 24.788 69.2553 24.788C67.5993 24.788 66.1593 24.02 65.4873 22.772V28.1H62.9433ZM68.7993 22.58C70.8393 22.58 72.0873 20.924 72.0873 18.116C72.0873 15.308 70.8393 13.652 68.7993 13.652C66.7593 13.652 65.4873 15.164 65.4873 18.116C65.4873 21.068 66.7353 22.58 68.7993 22.58ZM82.2266 24.788C78.5306 24.788 76.1786 22.148 76.1786 18.116C76.1786 14.084 78.5306 11.444 82.1546 11.444C85.6346 11.444 88.0106 13.916 88.0106 18.212V18.86H78.8426C78.9626 21.356 80.2346 22.604 82.2506 22.604C83.7626 22.604 84.7706 21.86 85.1786 20.66L87.8186 20.828C87.1466 23.204 85.0586 24.788 82.2266 24.788ZM85.2986 16.94C85.1546 14.684 83.9066 13.604 82.1546 13.604C80.3546 13.604 79.1306 14.78 78.8426 16.94H85.2986ZM90.1753 24.5V11.732H92.5033L92.5753 13.94C93.2473 12.212 94.7113 11.444 96.4393 11.444C99.2953 11.444 100.759 13.508 100.759 16.292V24.5H98.2153V17.06C98.2153 14.804 97.5193 13.58 95.7433 13.58C93.9433 13.58 92.7193 14.804 92.7193 17.06V24.5H90.1753ZM110.883 24.884C106.275 24.884 103.107 21.548 103.107 16.004C103.107 10.508 106.227 7.076 110.907 7.076C115.131 7.076 117.387 9.332 118.131 13.052L115.395 13.196C114.939 10.868 113.499 9.452 110.907 9.452C107.811 9.452 105.795 11.948 105.795 16.004C105.795 20.084 107.835 22.508 110.883 22.508C113.643 22.508 115.107 20.948 115.515 18.404L118.251 18.548C117.603 22.412 115.083 24.884 110.883 24.884ZM124.677 24.788C122.085 24.788 120.477 22.988 120.477 19.94V11.732H123.021V19.292C123.021 21.62 123.813 22.652 125.445 22.652C127.293 22.652 128.397 21.404 128.397 19.22V11.732H130.941V24.5H128.565L128.541 22.412C127.869 23.972 126.525 24.788 124.677 24.788ZM138.509 24.5C136.085 24.5 134.957 23.444 134.957 21.044V13.82H133.013V11.732H134.957V8.732H137.501V11.732H140.885V13.82H137.501V20.852C137.501 22.052 138.005 22.412 139.061 22.412H140.885V24.5H138.509Z"
            fill="white"
          />
        </svg>
      </div>

      <div className="block sm:hidden">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 9.37305V22.627L22.627 32H9.37305L0 22.627V9.37305L9.37305 0H22.627L32 9.37305ZM8 8V24H24V8H8Z"
            fill="white"
          />
        </svg>
      </div>
    </>
  );
}

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
    <Link href="/">
      <Logo />
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-3">
      <Link href="/contributors">
        <Button variant="text" className="text-sm p-0">
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
    <div className="mx-4 md:mx-0">
      <HeaderBase
        className="bg-[#1D1D1D] border border-white/10 rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-3xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-block"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter">
            The open source
          </h1>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter mt-2">
            CapCut alternative.
          </h1>
        </motion.div>

        <motion.p
          className="mt-12 text-lg sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          A simple but powerful video editor that gets the job done. In your
          browser.
        </motion.p>

        <motion.div
          className="mt-12 flex gap-8 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <form className="flex gap-3 w-full max-w-lg">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-11 text-base flex-1"
              required
            />
            <Button type="submit" size="lg" className="px-6 h-11 text-base">
              <span className="relative z-10">Join waitlist</span>
              <ArrowRight className="relative z-10 ml-0.5 h-4 w-4 inline-block" />
            </Button>
          </form>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-12 left-0 right-0 text-center text-sm text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        Currently in beta • Open source on{" "}
        <Link
          href="https://github.com/mazeincoding/AppCut"
          className="text-foreground underline"
        >
          GitHub
        </Link>
      </motion.div>
    </div>
  );
}

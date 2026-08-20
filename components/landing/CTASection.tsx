"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";

export default function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/40 to-white/5 backdrop-blur-xl p-12 md:p-20 text-center"
        >
          {/* Background decorations */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-8"
            >
              <Sparkles className="w-4 h-4" />
              Start Building Today — It&apos;s Free
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-3xl mx-auto leading-tight">
              Ready to Turn Your Idea
              <br />
              <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
                Into Reality?
              </span>
            </h2>

            <p className="text-lg text-white/70 max-w-xl mx-auto mb-10">
              Join thousands of entrepreneurs who are already building and
              shipping apps without writing a single line of code.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 rounded-full text-base font-semibold bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/10"
              >
                <Link href="/builder">
                  Start Building Free <ChevronRight className="ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 px-8 rounded-full text-base border-2 border-white/20 bg-transparent text-white hover:bg-white hover:text-black transition-all"
              >
                <Link href="/docs">Read the Docs</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap gap-8 justify-center items-center text-sm text-white/40">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                Free forever
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                Own your code 100%
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                Deploy anywhere
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

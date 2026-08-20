"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { useScroll, motion } from "motion/react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how" },
  { name: "Editor", href: "#editor" },
  { name: "Docs", href: "#docs" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();

  // New: control features panel via React state & ref (no DOM hacks)
  const [showFeatures, setShowFeatures] = React.useState(false);
  const featuresRef = React.useRef<HTMLDivElement | null>(null);
  const featuresButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const unsub = scrollYProgress.on("change", (val) => {
      setScrolled(val > 0.05);
    });
    return () => unsub();
  }, [scrollYProgress]);

  // close on escape or click outside
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowFeatures(false);
    }
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        showFeatures &&
        featuresRef.current &&
        !featuresRef.current.contains(target) &&
        featuresButtonRef.current &&
        !featuresButtonRef.current.contains(target)
      ) {
        setShowFeatures(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [showFeatures]);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed top-0 z-40 w-full pt-2 transition-all"
      >
        <div
          className={cn(
            "mx-auto max-w-7xl rounded-3xl px-6 lg:px-12 transition-all duration-300",
            "bg-black/20 backdrop-blur-xl border border-white/10",
            scrolled && "bg-black/40 border-white/20"
          )}
        >
          <motion.div
            className={cn(
              "flex items-center justify-between py-4 lg:py-5 transition-all",
              scrolled && "py-3"
            )}
          >
            {/* LEFT: Logo + Menu */}
            <div className="flex items-center gap-10 flex-none">
              <Link href="/" aria-label="home" className="flex items-center">
                <Logo className="h-7 w-auto" />
              </Link>
              {/* Desktop Menu */}

              <div className="hidden lg:flex items-center gap-10">
                {/* FEATURES DROPDOWN */}
                <div
                  className="relative"
                  onMouseEnter={() => setShowFeatures(true)}
                  onMouseLeave={() => setShowFeatures(false)}
                >
                  <button
                    id="features-menu"
                    ref={featuresButtonRef}
                    aria-haspopup="true"
                    aria-expanded={showFeatures}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition font-medium"
                    onClick={() => setShowFeatures((s) => !s)}
                    onFocus={() => setShowFeatures(true)}
                    onBlur={(e) => {
                      // if blur moves to inside panel, keep open
                      const next = e.relatedTarget as Node | null;
                      if (
                        featuresRef.current &&
                        next &&
                        featuresRef.current.contains(next)
                      ) {
                        return;
                      }
                      setShowFeatures(false);
                    }}
                  >
                    Features
                    <svg
                      className="ml-1 h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M5 7l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Panel (state controlled). Hidden by default */}
                  <motion.div
                    id="features-panel"
                    ref={featuresRef}
                    initial={{ opacity: 0, scale: 0.98, y: -6 }}
                    animate={
                      showFeatures
                        ? { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" }
                        : {
                          opacity: 0,
                          scale: 0.98,
                          y: -6,
                          pointerEvents: "none",
                        }
                    }
                    transition={{ duration: 0.14 }}
                    className="absolute left-0 mt-3 w-[520px] rounded-2xl bg-white/95 text-slate-900 shadow-lg border border-white/10 p-4 transition-all will-change-transform"
                    onMouseEnter={() => setShowFeatures(true)}
                    onMouseLeave={() => setShowFeatures(false)}
                    onBlur={(e) => {
                      const next = e.relatedTarget as Node | null;
                      if (
                        featuresButtonRef.current &&
                        next &&
                        featuresButtonRef.current.contains(next)
                      ) {
                        return;
                      }
                      setShowFeatures(false);
                    }}
                    tabIndex={-1}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href="/market-gap"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">
                          Why Use AvatarFlow?
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Market gap analysis, ROI, and cost savings.
                        </div>
                      </a>

                      <a
                        href="/pricing"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">Pricing That Makes Sense</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Free forever vs $3k/year competitors.
                        </div>
                      </a>

                      <a
                        href="/documentation"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">Complete Documentation</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          150+ guides, videos, and examples.
                        </div>
                      </a>

                      <a
                        href="/tutorial"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">Hand-Holding Tutorial</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          From zero to deployed in 90 minutes.
                        </div>
                      </a>

                      <a
                        href="/templates"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">
                          Ready-Made Templates
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          85+ production-ready app templates.
                        </div>
                      </a>

                      <a
                        href="/code-generation"
                        className="group block rounded-lg p-3 hover:bg-zinc-50"
                      >
                        <div className="font-semibold">Code Generation</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Flowchart to 12k+ lines in &lt; 10 seconds.
                        </div>
                      </a>
                    </div>

                    <div className="mt-3 border-t pt-3 text-right">
                      <Link
                        href="/#features"
                        className="text-sm font-medium text-accent-foreground hover:underline"
                      >
                        View all features →
                      </Link>
                    </div>
                  </motion.div>
                </div>

                {/* THE REST OF NAV ITEMS (keeps look consistent) */}
                <nav>
                  <ul className="flex items-center gap-8 text-sm">
                    <li>
                      <a
                        href="/how"
                        className="text-white/80 hover:text-white transition"
                      >
                        How It Works
                      </a>
                    </li>
                    <li>
                      <a
                        href="/editor"
                        className="text-white/80 hover:text-white transition"
                      >
                        Editor
                      </a>
                    </li>
                    <li>
                      <a
                        href="/docs"
                        className="text-white/80 hover:text-white transition"
                      >
                        Docs
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            {/* RIGHT: Buttons (desktop) */}
            <div className="hidden lg:flex items-center gap-4 flex-none">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="bg-white text-black hover:bg-neutral-200 shadow"
              >
                <Link href="/login">Login</Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-black/80 text-white hover:bg-black shadow-lg"
              >
                <Link href="/flow">Launch Editor</Link>
              </Button>
            </div>

            {/* Mobile Menu Icon */}
            <button
              onClick={() => setMenuState(!menuState)}
              aria-label={menuState ? "Close Menu" : "Open Menu"}
              className="lg:hidden p-2.5"
            >
              {menuState ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </button>
          </motion.div>

          {/* MOBILE DROPDOWN */}
          {menuState && (
            <div className="lg:hidden mt-3 pb-4 border-t border-white/10 pt-4">
              <ul className="flex flex-col gap-4 text-white/90 text-lg">
                {menuItems.map((item, i) => (
                  <li key={i}>
                    <Link href={item.href}>{item.name}</Link>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 mt-4">
                <Button
                  asChild
                  variant="secondary"
                  className="bg-white text-black"
                >
                  <Link href="/login">Login</Link>
                </Button>

                <Button asChild className="bg-black/80 text-white">
                  <Link href="/flow">Launch Editor</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

"use client";

import Link from "next/link";
import {
  DollarSign,
  BookOpen,
  Lightbulb,
  GraduationCap,
  LayoutTemplate,
  GitBranch,
} from "lucide-react";

const features = [
  {
    title: "Why Use AvatarFlow?",
    icon: Lightbulb,
    description:
      "Built for entrepreneurs who think in business logic, not code. Turn flowcharts into apps without learning to code or paying for expensive developers.",
    href: "/market-gap",
  },
  {
    title: "Pricing That Makes Sense",
    icon: DollarSign,
    description:
      "Free forever with open-source models. No monthly subscriptions, no per-generation fees. Compare us to ChatGPT Pro or Cursor AI and save thousands.",
    href: "/pricing",
  },
  {
    title: "Complete Documentation",
    icon: BookOpen,
    description:
      "Step-by-step guides, video tutorials, and examples. Everything you need to go from idea to deployed app.",
    href: "/documentation",
  },
  {
    title: "Hand-Holding Tutorial",
    icon: GraduationCap,
    description:
      "Never built an app before? Our interactive walkthrough guides you through every single step — from your first flowchart to your first deployment.",
    href: "/tutorial",
  },
  {
    title: "Ready-Made Templates",
    icon: LayoutTemplate,
    description:
      "Start with pre-built flowchart templates for e-commerce, SaaS, dashboards, and more. Customize them to match your exact business needs.",
    href: "/templates",
  },
  {
    title: "Flowchart to Production Code",
    icon: GitBranch,
    description:
      "Watch your business logic transform into clean, production-ready code. Frontend, backend, database, and APIs — all generated automatically.",
    href: "/code-generation",
  },
];

export default function Features() {
  return (
    <section className="py-16 md:py-24 bg-transparent">
      <div className="mx-auto max-w-6xl space-y-12 px-6">
        {/* TITLE */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-semibold text-white">
            Built for Entrepreneurs, Not Developers
          </h2>
          <p className="text-white/80 text-lg">
            Everything you need to turn your startup idea into a working app — without writing a single line of code or breaking the bank.
          </p>
        </div>

        {/* GRID */}
        <div className="grid border border-white/20 divide-x divide-y divide-white/20 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3 bg-black/40 backdrop-blur-sm rounded-lg overflow-hidden shadow-sm">
          {features.map((item, i) => {
            const Icon = item.icon;

            return (
              <Link
                key={i}
                href={item.href}
                className="
                                    group p-10 flex flex-col gap-3 
                                    hover:bg-white/10 transition-all
                                    hover:cursor-pointer 
                                    hover:shadow-lg 
                                    duration-200
                                "
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-white/90 group-hover:scale-110 transition" />
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                </div>

                <p className="text-sm text-white/70">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { PenTool, Cpu, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PenTool,
    title: "Draw Your Flowchart",
    description:
      "Map out your business logic using our intuitive drag-and-drop editor. No coding knowledge required — if you can draw a flowchart, you can build an app.",
    details: [
      "Visual node editor with 50+ node types",
      "Drag-and-drop connections between steps",
      "Real-time validation & error highlighting",
    ],
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Generates Your Code",
    description:
      "Our engine reads your flowchart and produces clean, production-grade code — frontend, backend, database schemas, and REST APIs. All in seconds.",
    details: [
      "Next.js + React frontend generation",
      "Express / FastAPI backend scaffolding",
      "PostgreSQL / MongoDB schema creation",
    ],
  },
  {
    number: "03",
    icon: Rocket,
    title: "Deploy & Go Live",
    description:
      "One click to deploy your generated app. Get a live URL, share it with customers, and start collecting feedback — all in under 10 minutes.",
    details: [
      "One-click Vercel / Railway deployment",
      "Custom domain support out of the box",
      "Built-in analytics & monitoring",
    ],
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="relative group"
    >
      {/* Connecting line */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-1/2 -right-8 w-16 h-px bg-gradient-to-r from-white/30 to-transparent" />
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 hover:bg-white/10 transition-all duration-500 hover:border-white/25 hover:shadow-2xl hover:shadow-white/5">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-zinc-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Step number */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors">
            {step.number}
          </span>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-white/90" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
        <p className="text-white/70 leading-relaxed mb-6">{step.description}</p>

        {/* Detail list */}
        <ul className="space-y-2">
          {step.details.map((detail, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
              {detail}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-6">
            Simple 3-Step Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            From Idea to App in Minutes
          </h2>
          <p className="text-lg text-white/70">
            No complex setup. No steep learning curve. Just three simple steps
            between your business idea and a working application.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const stats = [
  { value: "12k+", label: "Lines of Code", suffix: "avg per app" },
  { value: "<10s", label: "Generation Time", suffix: "flowchart to code" },
  { value: "$0", label: "Cost to Start", suffix: "free forever" },
  { value: "85+", label: "Templates", suffix: "ready to use" },
];

const comparisons = [
  {
    competitor: "Hiring a Developer",
    price: "$5,000 – $50,000",
    time: "2 – 6 months",
    maintenance: "Ongoing cost",
    highlight: false,
  },
  {
    competitor: "AvatarFlowX",
    price: "Free",
    time: "Under 10 minutes",
    maintenance: "Self-managed",
    highlight: true,
  },
  {
    competitor: "ChatGPT Pro + Cursor",
    price: "$240+/year",
    time: "Hours of prompting",
    maintenance: "Manual fixes",
    highlight: false,
  },
  {
    competitor: "No-Code Platforms",
    price: "$30 – $300/mo",
    time: "Days to weeks",
    maintenance: "Platform lock-in",
    highlight: false,
  },
];

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent"
    >
      {value}
    </motion.div>
  );
}

export default function StatsAndComparison() {
  const tableRef = useRef<HTMLDivElement>(null);
  const tableInView = useInView(tableRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {stats.map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <AnimatedCounter value={stat.value} />
              <div className="text-lg font-semibold text-white">{stat.label}</div>
              <div className="text-sm text-white/50">{stat.suffix}</div>
            </div>
          ))}
        </div>

        {/* Comparison section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-6">
            Why Choose Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See How We Compare
          </h2>
          <p className="text-lg text-white/70">
            Stop paying thousands for app development. AvatarFlowX gives you
            production-grade code for free.
          </p>
        </div>

        {/* Comparison table */}
        <motion.div
          ref={tableRef}
          initial={{ opacity: 0, y: 40 }}
          animate={tableInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md"
        >
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-white/5 border-b border-white/10 text-sm font-semibold text-white/80">
            <div>Solution</div>
            <div>Cost</div>
            <div>Time to Ship</div>
            <div>Maintenance</div>
          </div>

          {/* Table rows */}
          {comparisons.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 gap-4 px-6 py-5 border-b border-white/5 text-sm transition-colors ${
                row.highlight
                  ? "bg-white/10 border-l-2 border-l-white"
                  : "hover:bg-white/5"
              }`}
            >
              <div className={`font-semibold ${row.highlight ? "text-white" : "text-white/80"}`}>
                {row.competitor}
                {row.highlight && (
                  <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                    You are here
                  </span>
                )}
              </div>
              <div className={row.highlight ? "text-white font-bold" : "text-white/70"}>
                {row.price}
              </div>
              <div className={row.highlight ? "text-white font-bold" : "text-white/70"}>
                {row.time}
              </div>
              <div className={row.highlight ? "text-white font-bold" : "text-white/70"}>
                {row.maintenance}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

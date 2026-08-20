"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import {
  Code2,
  Database,
  Globe,
  Lock,
  Palette,
  Server,
  Shield,
  Zap,
} from "lucide-react";

const techItems = [
  {
    icon: Globe,
    name: "Next.js & React",
    desc: "Modern frontend with SSR, routing, and optimized performance",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Server,
    name: "Express / FastAPI",
    desc: "Robust REST APIs with validation, middleware, and error handling",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Database,
    name: "PostgreSQL / MongoDB",
    desc: "Production-ready schemas with migrations and seed data",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Lock,
    name: "Authentication",
    desc: "JWT-based auth with secure session management built-in",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Palette,
    name: "Tailwind CSS",
    desc: "Beautiful, responsive UI with dark mode and custom themes",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Shield,
    name: "Security First",
    desc: "CORS, rate limiting, input sanitization, and security headers",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Code2,
    name: "TypeScript",
    desc: "Full type safety across frontend and backend for fewer bugs",
    color: "from-white/20 to-white/5",
  },
  {
    icon: Zap,
    name: "Edge Deployment",
    desc: "Optimized for Vercel Edge, Cloudflare Workers, and serverless",
    color: "from-white/20 to-white/5",
  },
];

export default function TechStack() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-6">
            Under the Hood
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Production-Grade Tech Stack
          </h2>
          <p className="text-lg text-white/70">
            Every generated app uses the same modern technologies that top
            startups and enterprises rely on. No toy code — real, scalable
            architecture.
          </p>
        </div>

        {/* Tech grid */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {techItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} border border-white/10 flex items-center justify-center mb-4`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Open source callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-6 py-3">
            <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-sm text-white/70">
              100% open source — inspect, fork, and contribute on GitHub
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

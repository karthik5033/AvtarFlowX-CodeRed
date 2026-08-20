"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "I went from a napkin sketch to a deployed SaaS app in a single afternoon. AvatarFlowX is an absolute game-changer for non-technical founders.",
    name: "Sarah Chen",
    role: "Founder, TaskHive",
    avatar: "SC",
  },
  {
    quote:
      "We used to spend $20k on each MVP. Now our product team builds functional prototypes in hours, not months. The ROI is insane.",
    name: "Marcus Williams",
    role: "Head of Product, NovaTech",
    avatar: "MW",
  },
  {
    quote:
      "The code quality blew me away. It generated a clean Next.js app with proper API routes, auth, and database schema — all from my flowchart.",
    name: "Priya Sharma",
    role: "CTO, DataBridge",
    avatar: "PS",
  },
  {
    quote:
      "I teach a startup bootcamp. My students now launch real products in week one instead of spending the whole semester on boilerplate.",
    name: "James Rodriguez",
    role: "Professor, Stanford GSB",
    avatar: "JR",
  },
  {
    quote:
      "As a designer, I never thought I could ship my own apps. AvatarFlowX made it possible — I just drew what I wanted and it built it.",
    name: "Aiko Tanaka",
    role: "Product Designer, FreeLance",
    avatar: "AT",
  },
  {
    quote:
      "We replaced our entire proof-of-concept pipeline with this. What used to take our dev team 3 weeks now happens in an afternoon meeting.",
    name: "David Kim",
    role: "VP Engineering, ScaleUp Inc",
    avatar: "DK",
  },
];

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof testimonials)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500"
    >
      <Quote className="w-8 h-8 text-white/30 mb-4" />
      <p className="text-white/80 leading-relaxed mb-6 text-[15px]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {testimonial.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">
            {testimonial.name}
          </div>
          <div className="text-xs text-white/50">{testimonial.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-6">
            Loved by Builders
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            What Our Users Say
          </h2>
          <p className="text-lg text-white/70">
            Join thousands of entrepreneurs, designers, and product teams who
            are already shipping apps faster with AvatarFlowX.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

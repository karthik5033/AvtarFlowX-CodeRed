"use client";

import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is AvatarFlowX really free?",
    answer:
      "Yes — 100% free. We use open-source AI models running locally, so there are no API costs to pass on to you. No credit card required, no hidden fees, no usage limits on code generation.",
  },
  {
    question: "Do I need any coding experience?",
    answer:
      "Not at all. If you can draw a flowchart or a process diagram, you can use AvatarFlowX. Our visual editor is designed for business people, not developers. That said, developers love it too — it saves hours of boilerplate work.",
  },
  {
    question: "What kind of apps can I build?",
    answer:
      "Anything from simple landing pages to full-stack SaaS applications. Popular use cases include e-commerce stores, internal dashboards, customer portals, booking systems, CRM tools, and API backends. If you can describe it in a flowchart, we can generate it.",
  },
  {
    question: "What tech stack does the generated code use?",
    answer:
      "We generate modern, production-ready code using Next.js (React) for the frontend, Express or FastAPI for the backend, and PostgreSQL or MongoDB for the database. All code follows industry best practices with proper error handling, auth, and API structure.",
  },
  {
    question: "Can I edit the generated code?",
    answer:
      "Absolutely. You own 100% of the generated code. Export it as a complete project, open it in VS Code, and customize every line. There's zero vendor lock-in — the code is yours to deploy, modify, and scale however you want.",
  },
  {
    question: "How does this compare to tools like Bubble or Webflow?",
    answer:
      "Unlike no-code platforms, AvatarFlowX generates actual source code you own and can deploy anywhere. No monthly platform fees, no performance limitations, no vendor lock-in. You get the speed of no-code with the flexibility of custom development.",
  },
  {
    question: "Can I deploy the generated app anywhere?",
    answer:
      "Yes. We offer one-click deployment to Vercel and Railway, but since you get the full source code, you can deploy to AWS, GCP, Azure, DigitalOcean, or any hosting provider that supports Node.js applications.",
  },
  {
    question: "Is the generated code production-ready?",
    answer:
      "Yes. The code includes proper error handling, input validation, security headers, CORS configuration, database migrations, and follows the same patterns you'd see in a professional codebase. We also generate tests and documentation.",
  },
];

function FAQItem({
  faq,
  index,
}: {
  faq: (typeof faqs)[0];
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="border-b border-white/10 last:border-b-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-lg font-medium text-white/90 group-hover:text-white transition-colors pr-4">
          {faq.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <p className="pb-6 text-white/60 leading-relaxed">{faq.answer}</p>
      </motion.div>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="mx-auto max-w-4xl px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-6">
            Got Questions?
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-white/70">
            Everything you need to know about AvatarFlowX. Can&apos;t find what
            you&apos;re looking for? Reach out to our team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-8">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

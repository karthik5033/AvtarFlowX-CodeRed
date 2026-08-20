import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "@/components/header";
import Features from "@/components/features-4";
import { ChevronRight } from "lucide-react";
import IntegrationsSection from "@/components/integrations-7";
import ScrollSequenceHero from "@/components/ScrollSequenceHero";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsAndComparison from "@/components/landing/StatsAndComparison";
import TechStack from "@/components/landing/TechStack";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function HeroSection() {
  return (
    <>
      <HeroHeader />

      <ScrollSequenceHero>
        {/* Hero */}
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 lg:px-12 min-h-[90vh] flex flex-col justify-center">
          <div className="max-w-3xl text-left">
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold leading-tight text-white">
              Turn Your Business Idea <br />Into a Working App
            </h1>

            <p className="mt-6 max-w-2xl text-xl text-white/95 font-medium">
              No coding. No premium AI costs. Just flowcharts.
            </p>

            <p className="mt-4 max-w-2xl text-lg text-white/90">
              Map your business logic with flowcharts you already understand.
              AvatarFlow converts them into production-ready apps — frontend,
              backend, database, and APIs. All generated automatically.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full text-base bg-white text-black hover:bg-neutral-200 shadow-lg"
              >
                <Link href="/builder">
                  Create Your Flowchart <ChevronRight className="ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full text-base border-2 border-white bg-transparent text-white hover:bg-white hover:text-slate-900 transition-colors"
              >
                <Link href="/how">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <Features />

        {/* How It Works — 3 Steps */}
        <HowItWorks />

        {/* Stats + Competitor Comparison */}
        <StatsAndComparison />

        {/* Integrations Carousel */}
        <IntegrationsSection />

        {/* Tech Stack */}
        <TechStack />

        {/* Testimonials */}
        <Testimonials />

        {/* FAQ */}
        <FAQ />

        {/* Final CTA */}
        <CTASection />

        {/* Footer */}
        <Footer />
      </ScrollSequenceHero>
    </>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LogoIcon } from '@/components/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Github, Database, Cloud, Terminal, 
  Blocks, Cpu, Server, Lock, Layers, Code2
} from 'lucide-react';

const ORBIT_SIZES = [240, 380, 520];

const INTEGRATIONS = [
  // Inner Orbit
  { Icon: Database, orbitIndex: 0, duration: 25, delay: 0, size: 24 },
  { Icon: Server, orbitIndex: 0, duration: 25, delay: -12.5, size: 24 },
  
  // Middle Orbit
  { Icon: Github, orbitIndex: 1, duration: 35, delay: 0, size: 28 },
  { Icon: Cloud, orbitIndex: 1, duration: 35, delay: -11.6, size: 28 },
  { Icon: Terminal, orbitIndex: 1, duration: 35, delay: -23.3, size: 28 },
  
  // Outer Orbit
  { Icon: Blocks, orbitIndex: 2, duration: 45, delay: 0, size: 32 },
  { Icon: Lock, orbitIndex: 2, duration: 45, delay: -11.25, size: 32 },
  { Icon: Layers, orbitIndex: 2, duration: 45, delay: -22.5, size: 32 },
  { Icon: Code2, orbitIndex: 2, duration: 45, delay: -33.75, size: 32 },
];

export default function IntegrationsSection() {
    return (
        <section className="relative overflow-hidden py-24 md:py-32">
            <div className="mx-auto max-w-5xl px-6 relative z-10">
                
                {/* Text Content */}
                <div className="mx-auto max-w-2xl text-center mb-16 relative z-20">
                    <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                        A universe of integrations
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-white/70">
                        Connect seamlessly with your favorite databases, cloud providers, and deployment platforms to enhance your automated workflow.
                    </p>
                    <div className="mt-8 flex justify-center gap-x-4">
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-full px-8 bg-transparent text-white border-white/20 hover:bg-white hover:text-black transition-all"
                        >
                            <Link href="/docs">View All Integrations</Link>
                        </Button>
                    </div>
                </div>

                {/* Orbit Container */}
                <div className="relative mx-auto mt-20 flex h-[600px] w-full max-w-[600px] items-center justify-center">
                    
                    {/* Center Hub (Logo) */}
                    <div className="relative z-30 flex size-24 items-center justify-center rounded-full border border-white/20 bg-black/60 shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-md">
                        <LogoIcon className="size-12" />
                    </div>

                    {/* Orbits */}
                    {ORBIT_SIZES.map((size, index) => (
                        <div
                            key={size}
                            className="absolute rounded-full border border-white/10"
                            style={{
                                width: size,
                                height: size,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    ))}

                    {/* Orbiting Icons */}
                    {INTEGRATIONS.map((item, i) => {
                        const orbitSize = ORBIT_SIZES[item.orbitIndex];
                        return (
                            <motion.div
                                key={i}
                                className="absolute"
                                style={{
                                    width: orbitSize,
                                    height: orbitSize,
                                    left: '50%',
                                    top: '50%',
                                    marginLeft: -(orbitSize / 2),
                                    marginTop: -(orbitSize / 2),
                                }}
                                animate={{ rotate: 360 }}
                                transition={{
                                    repeat: Infinity,
                                    duration: item.duration,
                                    ease: "linear",
                                    delay: item.delay, // Using negative delay allows it to start at different angles immediately
                                }}
                            >
                                <div
                                    className="absolute left-1/2 flex items-center justify-center rounded-full border border-white/20 bg-black/80 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        top: 0,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    {/* Counter-rotate the icon so it stays upright */}
                                    <motion.div
                                        animate={{ rotate: -360 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: item.duration,
                                            ease: "linear",
                                            delay: item.delay,
                                        }}
                                        className="flex items-center justify-center h-full w-full"
                                    >
                                        <item.Icon className="text-white/80" size={item.size} />
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Background Ambient Glow */}
                    <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 opacity-50 blur-[100px]" />
                </div>
            </div>
        </section>
    );
}

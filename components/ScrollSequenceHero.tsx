"use client";

import React, { useEffect, useRef, useState } from "react";
import { useScroll } from "motion/react";

interface ScrollSequenceHeroProps {
  children: React.ReactNode;
}

export default function ScrollSequenceHero({ children }: ScrollSequenceHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const frameCount = 300; // From ezgif-frame-001 to ezgif-frame-300

  // Track scroll progress within the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Preload all frames on mount
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const paddedIndex = i.toString().padStart(3, "0");
      img.src = `/scroll-frames/ezgif-frame-${paddedIndex}.png`;
      loadedImages.push(img);

      img.onload = () => {
        loadedCount++;
        // Draw the first frame immediately when it loads
        if (i === 1 && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            canvasRef.current.width = img.naturalWidth || 1920;
            canvasRef.current.height = img.naturalHeight || 1080;
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      };
    }
    setImages(loadedImages);
  }, []);

  // Update canvas on scroll
  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      if (images.length === 0 || !canvasRef.current) return;
      
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(latest * frameCount)
      );
      
      const img = images[frameIndex];
      if (img && img.complete) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth || 1920;
            canvas.height = img.naturalHeight || 1080;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    });
  }, [scrollYProgress, images]);

  return (
    <main ref={containerRef} className="relative w-full bg-black min-h-screen">
      <div className="fixed top-0 left-0 h-screen w-full overflow-hidden pointer-events-none z-0">
        {/* Canvas for the scroll sequence */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover opacity-80 dark:opacity-70"
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      </div>

      {/* Page Content passed as children */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </main>
  );
}

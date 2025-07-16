"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "motion/react";

interface HandlebarsProps {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  onRangeChange?: (left: number, right: number) => void;
}

export function Handlebars({
  children,
  minWidth = 50,
  maxWidth = 400,
  onRangeChange,
}: HandlebarsProps) {
  const [leftHandle, setLeftHandle] = useState(0);
  const [rightHandle, setRightHandle] = useState(maxWidth);
  const [contentWidth, setContentWidth] = useState(maxWidth);
  const [isDragging, setIsDragging] = useState(false);

  const leftHandleX = useMotionValue(0);
  const rightHandleX = useMotionValue(maxWidth);

  const visibleWidth = useTransform(
    [leftHandleX, rightHandleX],
    (values: number[]) => values[1] - values[0]
  );

  const contentLeft = useTransform(leftHandleX, (left: number) => -left);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Prevent scroll when dragging on mobile
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    if (isDragging) {
      document.addEventListener("touchmove", preventDefault, {
        passive: false,
      });
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("touchmove", preventDefault);
      document.body.style.overflow = "";
    };
  }, [isDragging]);

  useEffect(() => {
    if (!measureRef.current) return;

    const measureContent = () => {
      if (measureRef.current) {
        const width = measureRef.current.scrollWidth;
        const paddedWidth = width + 32;
        setContentWidth(paddedWidth);
        setRightHandle(paddedWidth);
        rightHandleX.set(paddedWidth);
      }
    };

    measureContent();
    const timer = setTimeout(measureContent, 50);

    return () => clearTimeout(timer);
  }, [children, rightHandleX]);

  useEffect(() => {
    leftHandleX.set(leftHandle);
  }, [leftHandle, leftHandleX]);

  useEffect(() => {
    rightHandleX.set(rightHandle);
  }, [rightHandle, rightHandleX]);

  useEffect(() => {
    onRangeChange?.(leftHandle, rightHandle);
  }, [leftHandle, rightHandle, onRangeChange]);

  const handleLeftDrag = (event: any, info: PanInfo) => {
    const newLeft = Math.max(
      0,
      Math.min(leftHandle + info.offset.x, rightHandle - minWidth)
    );
    setLeftHandle(newLeft);
  };

  const handleRightDrag = (event: any, info: PanInfo) => {
    const newRight = Math.max(
      leftHandle + minWidth,
      Math.min(contentWidth, rightHandle + info.offset.x)
    );
    setRightHandle(newRight);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex justify-center gap-4 leading-[4rem] mt-0 md:mt-2">
      <div
        ref={measureRef}
        className="absolute -left-[9999px] top-0 invisible px-4 whitespace-nowrap font-[inherit]"
      >
        {children}
      </div>

      <div
        ref={containerRef}
        className="relative -rotate-[2.76deg] max-w-[250px] md:max-w-[454px] mt-2"
        style={{ width: contentWidth }}
      >
        <div className="absolute inset-0 w-full h-full rounded-2xl border border-yellow-500 flex justify-between">
          {/* Left Handle */}
          <motion.div
            className="h-full border border-yellow-500 rounded-full bg-accent flex items-center justify-center cursor-ew-resize select-none touch-none
                       w-9 md:w-7 min-h-[44px] md:min-h-0"
            style={{
              position: "absolute",
              x: leftHandleX,
              left: 0,
              zIndex: 10,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: rightHandle - minWidth }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleLeftDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1 }}
            whileTap={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="w-2 h-8 rounded-full bg-yellow-500"></div>
          </motion.div>

          {/* Right Handle */}
          <motion.div
            className="h-full border border-yellow-500 rounded-full bg-accent flex items-center justify-center cursor-ew-resize select-none touch-none
                       w-9 md:w-7 min-h-[44px] md:min-h-0"
            style={{
              position: "absolute",
              x: rightHandleX,
              left: -36, // Adjusted for larger mobile handle
              zIndex: 10,
            }}
            drag="x"
            dragConstraints={{
              left: leftHandle + minWidth,
              right: contentWidth,
            }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleRightDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1 }}
            whileTap={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="w-2 h-8 rounded-full bg-yellow-500"></div>
          </motion.div>
        </div>

        <motion.div
          className="relative overflow-hidden rounded-2xl"
          style={{
            width: visibleWidth,
            x: leftHandleX,
            height: "100%",
          }}
        >
          <motion.div
            className="w-full h-full flex items-center justify-center px-4"
            style={{
              x: contentLeft,
              width: contentWidth,
              whiteSpace: "nowrap",
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

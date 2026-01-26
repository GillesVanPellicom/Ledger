import React, { useEffect, useRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { useSettingsStore } from "../../store/useSettingsStore";

export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "var(--color-bg)",
  gradientBackgroundEnd = "var(--color-bg)",
  color = "18, 113, 255",
  pointerColor = "140, 100, 255",
  size = "40%",
  blendingValue = "hard-light",
  children,
  className,
  containerClassName,
  forceColor,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  color?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  forceColor?: string;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();

  const hexToRgb = (hex: string) => {
    if (hex.startsWith('var')) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  };

  const rgbColor = useMemo(() => {
    const headerColor = forceColor || settings.headerColor || '#8b5cf6'; 
    return hexToRgb(headerColor) || color;
  }, [settings.headerColor, forceColor, color]);

  useEffect(() => {
    const container = interactiveRef.current?.parentElement || document.body;
    
    if (container && container.style) {
      container.style.setProperty("--gradient-background-start", gradientBackgroundStart);
      container.style.setProperty("--gradient-background-end", gradientBackgroundEnd);
      container.style.setProperty("--first-color", rgbColor);
      container.style.setProperty("--second-color", rgbColor);
      container.style.setProperty("--third-color", rgbColor);
      container.style.setProperty("--fourth-color", rgbColor);
      container.style.setProperty("--fifth-color", rgbColor);
      container.style.setProperty("--size", size);
      container.style.setProperty("--blending-value", blendingValue);
    }
  }, [gradientBackgroundStart, gradientBackgroundEnd, rgbColor, size, blendingValue]);

  return (
    <div
      className={cn(
        "h-full w-full absolute top-0 left-0 overflow-hidden",
        containerClassName
      )}
      style={{
        background: `linear-gradient(to bottom, var(--gradient-background-start), var(--gradient-background-end))`,
      }}
      ref={interactiveRef}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("", className)}>{children}</div>
      <div
        className={cn(
          "gradients-container h-full w-full blur-lg",
          "[filter:url(#blurMe)_blur(40px)]"
        )}
      >
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--first-color),_0.8)_0,_rgba(var(--first-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:center_center]`,
            `animate-first`,
            `opacity-100`
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.8)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-400px)]`,
            `animate-second`,
            `opacity-100`
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.8)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(20%+400px)]`,
            `animate-third`,
            `opacity-100`
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.8)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-200px)]`,
            `animate-fourth`,
            `opacity-70`
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.8)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
            `animate-fifth`,
            `opacity-100`
          )}
        ></div>
      </div>
    </div>
  );
};

"use client";

import { useEffect, useState } from "react";
import Aurora from "@/components/reactbits/Aurora";
import ShinyText from "@/components/reactbits/ShinyText";
import SpotlightCard, { type SpotlightCardProps } from "@/components/reactbits/SpotlightCard";

// Theme-aware wrappers around React Bits effects. Aurora and ShinyText resolve colours through a
// canvas, so they need real colour values rather than CSS variables: read them from the root
// element and follow theme changes made in Settings.

type ThemeColors = { accent: string; foreground: string; muted: string; light: boolean };

const FALLBACK: ThemeColors = { accent: "#f59e0b", foreground: "#f7f6f4", muted: "#95929c", light: false };

export function useThemeColors() {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const css = getComputedStyle(root);
      const value = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      setColors({
        accent: value("--accent", FALLBACK.accent),
        foreground: value("--foreground", FALLBACK.foreground),
        muted: value("--muted", FALLBACK.muted),
        light: root.dataset.mode === "light",
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["style", "data-mode", "class"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

// Mix a #rrggbb colour towards white (amount 0..1).
function lighten(hex: string, amount: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// A soft aurora glow in the user's accent colour, for page headers. Decorative only.
export function AccentAurora({ className = "", opacity = 0.55 }: { className?: string; opacity?: number }) {
  const { accent, light } = useThemeColors();
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      <Aurora
        colorStops={[accent, lighten(accent, 0.45), accent]}
        amplitude={1}
        height={0.8}
        brightness={1}
        blend={0.6}
        speed={0.6}
        opacity={light ? opacity * 0.7 : opacity}
        lightMode={light}
        mouseInteraction={false}
      />
    </div>
  );
}

// Heading text with a slow sheen in the accent colour.
export function AccentShinyText({ text, className = "" }: { text: string; className?: string }) {
  const { accent, foreground } = useThemeColors();
  return <ShinyText text={text} color={foreground} shineColor={accent} speed={3} delay={1.5} className={className} />;
}

// SpotlightCard that picks its light or dark palette from the current mode.
export function ThemedSpotlightCard(props: Omit<SpotlightCardProps, "theme">) {
  const { light } = useThemeColors();
  return <SpotlightCard {...props} theme={light ? "light" : "dark"} />;
}

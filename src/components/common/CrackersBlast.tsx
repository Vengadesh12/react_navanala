import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Celebration,
  RocketLaunch,
  AutoAwesome,
  Close,
  VolumeUp,
  VolumeOff,
  Refresh,
} from "@mui/icons-material";

export interface CrackersBlastProps {
  isOpen: boolean;
  onClose: () => void;
  autoCloseDuration?: number; // duration in seconds before auto closing (0 = don't auto close)
  showControls?: boolean;
}

// Particle for exploded firework streaks
interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  coreColor: string;
  trail: { x: number; y: number }[];
  maxTrailLength: number;
  gravity: number;
  friction: number;
  flicker: boolean;
  twinklePhase: number;
  isSpike?: boolean;
}

// Rocket shooting up from bottom
interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
  type: "gold_palm" | "purple_magenta" | "ruby_orange" | "sunburst" | "electric_blue";
  size: number;
  speed: number;
  sparkColor: string;
}

// Central flash on explosion
interface FlashCore {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  decay: number;
}

// Floating ambient background stars
interface AmbientStar {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export const CrackersBlast: React.FC<CrackersBlastProps> = ({
  isOpen,
  onClose,
  autoCloseDuration = 12,
  showControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [remainingTime, setRemainingTime] = useState<number>(autoCloseDuration);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const particlesRef = useRef<FireworkParticle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const flashesRef = useRef<FlashCore[]>([]);
  const ambientStarsRef = useRef<AmbientStar[]>([]);
  const lastLaunchRef = useRef<number>(0);

  // Initialize Web Audio synthesizer for crackling whoosh & boom
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Rocket ascent whistle/whoosh sound
  const playLaunchSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled, getAudioContext]);

  // Deep boom and crackle explosion sound
  const playBlastSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(750, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.4);

      // Sub Bass punch
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.3);
      oscGain.gain.setValueAtTime(0.22, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Safe fail
    }
  }, [soundEnabled, getAudioContext]);

  // Create explosion matching the photo types
  const createExplosion = useCallback(
    (
      x: number,
      y: number,
      type: Rocket["type"] = "gold_palm"
    ) => {
      playBlastSound();

      // 1. Central blinding flash
      let flashColor = "#ffffff";
      let flashRadius = 35;
      if (type === "gold_palm") {
        flashColor = "#ffd700";
        flashRadius = 45;
      } else if (type === "purple_magenta") {
        flashColor = "#d946ef";
        flashRadius = 42;
      } else if (type === "ruby_orange") {
        flashColor = "#ff4500";
        flashRadius = 38;
      } else if (type === "sunburst") {
        flashColor = "#ffffff";
        flashRadius = 55;
      } else if (type === "electric_blue") {
        flashColor = "#00f0ff";
        flashRadius = 36;
      }

      flashesRef.current.push({
        x,
        y,
        radius: 4,
        maxRadius: flashRadius,
        color: flashColor,
        alpha: 1,
        decay: 0.05,
      });

      // 2. Core Sparks Configuration based on image types
      let particleCount = 130;
      let colors: string[] = [];
      let coreColor = "#ffffff";
      let gravity = 0.038;
      let friction = 0.972;
      let maxTrail = 14;

      if (type === "gold_palm") {
        // Golden Chrysanthemum with purple/gold glowing core (Top-Left in image)
        particleCount = 150;
        colors = ["#ffd700", "#ffe066", "#fff3b0", "#ffcc00", "#ffffff", "#e0aaff"];
        coreColor = "#e0aaff";
        gravity = 0.032;
        friction = 0.975;
        maxTrail = 16;
      } else if (type === "purple_magenta") {
        // Purple & Magenta Peony with cascading tendrils (Center-Right in image)
        particleCount = 160;
        colors = ["#d946ef", "#c026d3", "#a855f7", "#ec4899", "#f43f5e", "#7c3aed", "#ffffff"];
        coreColor = "#f0abfc";
        gravity = 0.042;
        friction = 0.968;
        maxTrail = 15;
      } else if (type === "ruby_orange") {
        // Ruby Orange Chrysanthemum with sharp long streaks (Bottom-Left in image)
        particleCount = 140;
        colors = ["#ff4500", "#ff6b6b", "#f97316", "#fb923c", "#ffd700", "#ffffff"];
        coreColor = "#fef08a";
        gravity = 0.035;
        friction = 0.974;
        maxTrail = 16;
      } else if (type === "sunburst") {
        // Bright Golden/White Sunburst with dense radiating rays (Bottom-Center in image)
        particleCount = 170;
        colors = ["#ffffff", "#fffbeb", "#fef08a", "#fde047", "#f59e0b", "#ffedd5"];
        coreColor = "#ffffff";
        gravity = 0.028;
        friction = 0.978;
        maxTrail = 18;
      } else if (type === "electric_blue") {
        // Electric Blue / Cyan Sparkle Burst (Top-Right in image)
        particleCount = 120;
        colors = ["#00f0ff", "#38bdf8", "#60a5fa", "#93c5fd", "#ffffff", "#818cf8"];
        coreColor = "#ffffff";
        gravity = 0.034;
        friction = 0.97;
        maxTrail = 14;
      }

      // Generate radial streak rays in 360 degrees
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Distribute speeds with multi-tier density (inner core + outer rim streaks)
        const tier = Math.random();
        let speed = tier < 0.25 ? Math.random() * 2.5 + 1.2 : tier < 0.7 ? Math.random() * 5 + 3 : Math.random() * 7.5 + 4.5;
        
        // Sunburst has long sharp spikes
        const isSpike = type === "sunburst" && i % 4 === 0;
        if (isSpike) {
          speed *= 1.3;
        }

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = colors[Math.floor(Math.random() * colors.length)];

        particlesRef.current.push({
          x,
          y,
          vx,
          vy,
          alpha: 1,
          decay: Math.random() * 0.009 + 0.006, // Long lasting trails
          size: isSpike ? 2.8 : Math.random() * 2.2 + 1.2,
          color,
          coreColor,
          trail: [{ x, y }],
          maxTrailLength: maxTrail,
          gravity,
          friction,
          flicker: Math.random() > 0.35,
          twinklePhase: Math.random() * Math.PI * 2,
          isSpike,
        });
      }

      // 3. Add glittering background micro-stars around the blast (matching image stardust)
      for (let i = 0; i < 40; i++) {
        const bgAngle = Math.random() * Math.PI * 2;
        const bgDist = Math.random() * 110 + 20;
        ambientStarsRef.current.push({
          x: x + Math.cos(bgAngle) * bgDist,
          y: y + Math.sin(bgAngle) * bgDist,
          size: Math.random() * 2 + 0.8,
          color: type === "electric_blue" || type === "purple_magenta" ? "#38bdf8" : "#fde047",
          alpha: 1,
          twinkleSpeed: Math.random() * 0.06 + 0.03,
          phase: Math.random() * Math.PI * 2,
        });
      }
    },
    [playBlastSound]
  );

  // Launch a sky rocket from bottom of the screen to target height
  const launchRocket = useCallback(
    (
      startX?: number,
      targetY?: number,
      forcedType?: Rocket["type"]
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const types: Rocket["type"][] = [
        "gold_palm",
        "purple_magenta",
        "ruby_orange",
        "sunburst",
        "electric_blue",
      ];

      const chosenType = forcedType || types[Math.floor(Math.random() * types.length)];
      const x = startX !== undefined ? startX : Math.random() * (canvas.width * 0.8) + canvas.width * 0.1;
      const startY = canvas.height;
      const tY =
        targetY !== undefined
          ? targetY
          : Math.random() * (canvas.height * 0.48) + canvas.height * 0.12;

      let color = "#ffd700";
      let sparkColor = "#ffea00";
      if (chosenType === "purple_magenta") {
        color = "#d946ef";
        sparkColor = "#f0abfc";
      } else if (chosenType === "ruby_orange") {
        color = "#ff4500";
        sparkColor = "#f97316";
      } else if (chosenType === "sunburst") {
        color = "#ffffff";
        sparkColor = "#fde047";
      } else if (chosenType === "electric_blue") {
        color = "#00f0ff";
        sparkColor = "#38bdf8";
      }

      const distance = startY - tY;
      const speed = Math.sqrt(2 * 0.2 * distance) * 1.05;
      const vx = (Math.random() - 0.5) * 1.8;

      rocketsRef.current.push({
        x,
        y: startY,
        targetY: tY,
        vx,
        vy: -speed,
        color,
        sparkColor,
        trail: [],
        type: chosenType,
        size: 3.5,
        speed,
      });

      playLaunchSound();
    },
    [playLaunchSound]
  );

  // Grand choreographed show recreating the exact layout of the user's image
  const triggerGrandPhotoShow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Top-Left: Golden Chrysanthemum
    setTimeout(() => {
      launchRocket(canvas.width * 0.22, canvas.height * 0.22, "gold_palm");
    }, 100);

    // 2. Center-Right: Big Purple & Magenta Willow
    setTimeout(() => {
      launchRocket(canvas.width * 0.72, canvas.height * 0.32, "purple_magenta");
    }, 350);

    // 3. Bottom-Left: Ruby Orange Chrysanthemum
    setTimeout(() => {
      launchRocket(canvas.width * 0.18, canvas.height * 0.68, "ruby_orange");
    }, 650);

    // 4. Bottom-Center: Radiant Sunburst
    setTimeout(() => {
      launchRocket(canvas.width * 0.52, canvas.height * 0.72, "sunburst");
    }, 900);

    // 5. Top-Right: Electric Blue Starburst
    setTimeout(() => {
      launchRocket(canvas.width * 0.92, canvas.height * 0.18, "electric_blue");
    }, 1150);

    // 6. Additional follow-up barrages
    setTimeout(() => {
      launchRocket(canvas.width * 0.38, canvas.height * 0.42, "purple_magenta");
      launchRocket(canvas.width * 0.82, canvas.height * 0.55, "gold_palm");
    }, 2200);
  }, [launchRocket]);

  // Click on screen to launch rockets straight to cursor position and burst
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Direct rocket to click location
    launchRocket(clickX, clickY);

    // If double clicked or rapid click, instant explosion right away
    if (Math.random() > 0.5) {
      const types: Rocket["type"][] = ["gold_palm", "purple_magenta", "ruby_orange", "sunburst", "electric_blue"];
      createExplosion(clickX, clickY, types[Math.floor(Math.random() * types.length)]);
    }
  };

  // Main 60+ FPS Canvas Animation Loop
  useEffect(() => {
    if (!isOpen) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Trigger initial grand photo show upon mount
    triggerGrandPhotoShow();

    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Dark translucent fade for luminous streak trail preservation (like long exposure photo)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Switch to 'lighter' blending mode for radiant, glowing firework lights
      ctx.globalCompositeOperation = "lighter";

      // 1. Continuous Auto-Rocket Spawner
      if (time - lastLaunchRef.current > 750) {
        lastLaunchRef.current = time;
        if (Math.random() > 0.25) {
          launchRocket();
        }
      }

      // 2. Render & Update Background Ambient Micro-Stars
      for (let i = ambientStarsRef.current.length - 1; i >= 0; i--) {
        const star = ambientStarsRef.current[i];
        star.phase += star.twinkleSpeed;
        star.alpha -= 0.006;

        if (star.alpha <= 0) {
          ambientStarsRef.current.splice(i, 1);
          continue;
        }

        const twinkle = Math.sin(star.phase) * 0.4 + 0.6;
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Render & Update Central Flashes
      for (let i = flashesRef.current.length - 1; i >= 0; i--) {
        const flash = flashesRef.current[i];
        flash.radius += (flash.maxRadius - flash.radius) * 0.22;
        flash.alpha -= flash.decay;

        if (flash.alpha <= 0) {
          flashesRef.current.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(
          flash.x,
          flash.y,
          0,
          flash.x,
          flash.y,
          flash.radius
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, flash.color);
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.globalAlpha = flash.alpha;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Update & Render Ascending Sky Rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const rocket = rocketsRef.current[i];

        rocket.trail.push({ x: rocket.x, y: rocket.y, alpha: 1 });
        if (rocket.trail.length > 10) rocket.trail.shift();

        // Draw ascending glowing tracer streak
        ctx.beginPath();
        for (let j = 0; j < rocket.trail.length; j++) {
          const pt = rocket.trail[j];
          const progress = j / rocket.trail.length;
          ctx.strokeStyle = rocket.sparkColor;
          ctx.lineWidth = rocket.size * progress;
          ctx.globalAlpha = progress * 0.85;
          if (j === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Draw glowing rocket projectile head
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, rocket.size, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 1;
        ctx.shadowColor = rocket.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rocket Physics: Ascent decelerating towards apex
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
        rocket.vy += 0.18;

        // Apex detonation
        if (rocket.vy >= -1 || rocket.y <= rocket.targetY) {
          createExplosion(rocket.x, rocket.y, rocket.type);
          rocketsRef.current.splice(i, 1);
        }
      }

      // 5. Update & Render Radiant Firework Particles & Streaks (Matching Photo!)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrailLength) p.trail.shift();

        p.twinklePhase += 0.15;
        const twinkle = p.flicker ? Math.sin(p.twinklePhase) * 0.35 + 0.65 : 1;

        // Draw radiant streak trail (long exposure light line)
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          ctx.globalAlpha = p.alpha * twinkle * 0.9;
          ctx.stroke();
        }

        // Draw intense glowing spark head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = p.coreColor;
        ctx.globalAlpha = p.alpha * twinkle;
        ctx.fill();

        // 4-Pointed Star Glare for spikes / bright sparks
        if (p.isSpike && p.alpha > 0.6) {
          const glareSize = p.size * 3.5;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - glareSize, p.y);
          ctx.lineTo(p.x + glareSize, p.y);
          ctx.moveTo(p.x, p.y - glareSize);
          ctx.lineTo(p.x, p.y + glareSize);
          ctx.stroke();
        }

        // Particle Physics
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > canvas.height + 30) {
          particlesRef.current.splice(i, 1);
        }
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isOpen, createExplosion, launchRocket, triggerGrandPhotoShow]);

  // Countdown timer before auto-closing
  useEffect(() => {
    if (!isOpen || autoCloseDuration <= 0) return;
    setRemainingTime(autoCloseDuration);

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoCloseDuration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Fullscreen Night-Sky Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
      />

      {/* Floating Top Header Banner / Badge */}
      {showControls && (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 w-full animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2.5 rounded-full bg-slate-950/80 border border-white/20 backdrop-blur-md px-4 py-2 text-white shadow-2xl">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
            </span>
            <span className="text-xs font-bold bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent">
              🎆 Fireworks Live Celebration · Click anywhere to blast rockets!
            </span>
          </div>

          {/* Quick Controls Pill */}
          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/80 border border-white/20 backdrop-blur-md p-1.5 text-white shadow-2xl">
            <button
              type="button"
              onClick={triggerGrandPhotoShow}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              title="Launch All Sky Fireworks"
            >
              <RocketLaunch sx={{ fontSize: 15 }} className="animate-bounce" />
              <span>Launch All</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? "Mute audio" : "Unmute audio"}
            >
              {soundEnabled ? (
                <VolumeUp sx={{ fontSize: 16, color: "#4ade80" }} />
              ) : (
                <VolumeOff sx={{ fontSize: 16, color: "#94a3b8" }} />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-1.5 text-slate-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
              title="Close fireworks"
            >
              <Close sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Quick-Launcher Chips */}
      {showControls && (
        <div className="relative z-10 self-center flex flex-wrap items-center justify-center gap-2 pointer-events-auto animate-fade-in mb-2">
          {[
            { label: "Golden Palm", type: "gold_palm" as const, color: "from-amber-500 to-yellow-600" },
            { label: "Purple Peony", type: "purple_magenta" as const, color: "from-purple-600 to-pink-600" },
            { label: "Ruby Orange", type: "ruby_orange" as const, color: "from-red-500 to-orange-600" },
            { label: "Star Sunburst", type: "sunburst" as const, color: "from-yellow-400 to-amber-500 text-slate-900" },
            { label: "Electric Blue", type: "electric_blue" as const, color: "from-cyan-500 to-blue-600" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => launchRocket(undefined, undefined, item.type)}
              className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${item.color} px-3 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md`}
            >
              <AutoAwesome sx={{ fontSize: 14 }} />
              <span>{item.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900/90 border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <span>Dismiss ({remainingTime}s)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CrackersBlast;

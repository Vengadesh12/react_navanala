import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  RocketLaunch,
  AutoAwesome,
  Close,
  VolumeUp,
  VolumeOff,
  Whatshot,
} from "@mui/icons-material";

export type CrackerType = "mathapu" | "sanguchakaram" | "7shot" | "rocket";

export interface CrackersBlastHandle {
  blastCracker: (type: CrackerType, x?: number, y?: number) => void;
  blastAll: () => void;
}

export interface CrackersBlastProps {
  isOpen: boolean;
  onClose: () => void;
  autoCloseDuration?: number; // duration in seconds before auto closing (0 = don't auto close)
  showControls?: boolean;
  initialCracker?: CrackerType | null;
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
  type: "gold_palm" | "purple_magenta" | "ruby_orange" | "sunburst" | "electric_blue" | "emerald_green";
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

// Mathapu (Flowerpot / Anar Fountain) Instance
interface MathapuInstance {
  id: string;
  x: number;
  y: number;
  startTime: number;
  duration: number; // in ms
  maxHeight: number;
  potWidth: number;
  potHeight: number;
  colors: string[];
}

// Sanguchakaram (Ground Chakar / Spinner) Instance
interface ChakarInstance {
  id: string;
  x: number;
  y: number;
  startTime: number;
  duration: number; // in ms
  angle: number;
  angularVelocity: number;
  radius: number;
  colors: string[];
}

// 7-Shot Launcher Instance
interface SevenShotInstance {
  id: string;
  x: number;
  y: number;
  shotsFired: number;
  maxShots: number;
  nextShotTime: number;
  shotInterval: number;
  colorThemes: Rocket["type"][];
}

export const CRACKER_DEFINITIONS: {
  id: CrackerType;
  name: string;
  tamilName: string;
  tagline: string;
  badge: string;
  image: string;
  gradient: string;
  borderGlow: string;
}[] = [
  {
    id: "mathapu",
    name: "Mathapu",
    tamilName: "மத்தாப்பு",
    tagline: "Golden Flowerpot Fountain",
    badge: "Flowerpot",
    image: "/crackers/mathapu.jpg",
    gradient: "from-amber-500 via-orange-500 to-yellow-400",
    borderGlow: "hover:border-amber-400 shadow-amber-500/30",
  },
  {
    id: "sanguchakaram",
    name: "Sanguchakaram",
    tamilName: "சங்கு சக்கரம்",
    tagline: "Whirling Ground Fire Wheel",
    badge: "Ground Chakar",
    image: "/crackers/sanguchakaram.jpg",
    gradient: "from-emerald-500 via-teal-500 to-lime-400",
    borderGlow: "hover:border-emerald-400 shadow-emerald-500/30",
  },
  {
    id: "7shot",
    name: "7-Shot",
    tamilName: "7 ஷாட்ஸ்",
    tagline: "7 Multi-Color Aerial Bursts",
    badge: "Aerial Repeaters",
    image: "/crackers/7shot.jpg",
    gradient: "from-purple-500 via-pink-500 to-rose-400",
    borderGlow: "hover:border-pink-400 shadow-pink-500/30",
  },
  {
    id: "rocket",
    name: "Sky Rocket",
    tamilName: "ராக்கெட்",
    tagline: "High-Altitude Sonic Blast",
    badge: "Sky Rocket",
    image: "/crackers/rocket.jpg",
    gradient: "from-cyan-500 via-blue-600 to-indigo-500",
    borderGlow: "hover:border-cyan-400 shadow-cyan-500/30",
  },
];

export const CrackersBlast = forwardRef<CrackersBlastHandle, CrackersBlastProps>(
  (
    {
      isOpen,
      onClose,
      autoCloseDuration = 60,
      showControls = true,
      initialCracker = null,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameId = useRef<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [remainingTime, setRemainingTime] = useState<number>(autoCloseDuration);
    const [selectedCracker, setSelectedCracker] = useState<CrackerType>("mathapu");
    const [activeBlastInfo, setActiveBlastInfo] = useState<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Particle and cracker entity refs
    const particlesRef = useRef<FireworkParticle[]>([]);
    const rocketsRef = useRef<Rocket[]>([]);
    const flashesRef = useRef<FlashCore[]>([]);
    const ambientStarsRef = useRef<AmbientStar[]>([]);
    const mathapusRef = useRef<MathapuInstance[]>([]);
    const chakarsRef = useRef<ChakarInstance[]>([]);
    const sevenShotsRef = useRef<SevenShotInstance[]>([]);

    // Initialize Web Audio synthesizer for crackling whoosh, boom & fizz
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
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.45);

        gain.gain.setValueAtTime(0.045, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } catch {
        // Safe fail
      }
    }, [soundEnabled, getAudioContext]);

    // Deep boom and crackle explosion sound
    const playBlastSound = useCallback(
      (intensity = 1) => {
        if (!soundEnabled) return;
        try {
          const ctx = getAudioContext();
          if (!ctx) return;

          const bufferSize = Math.floor(ctx.sampleRate * 0.42);
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800 * intensity, ctx.currentTime);
          filter.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.38);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.24 * intensity, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start();
          noise.stop(ctx.currentTime + 0.42);

          // Sub Bass punch
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(110 * intensity, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.35);
          oscGain.gain.setValueAtTime(0.26 * intensity, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch {
          // Safe fail
        }
      },
      [soundEnabled, getAudioContext]
    );

    // Mathapu continuous roaring fountain sizzle sound
    const playFountainSound = useCallback(() => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const duration = 3.5;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          const env = Math.min(1, t * 2) * Math.max(0, 1 - (t - 1.5) / 2);
          data[i] = (Math.random() * 2 - 1) * env * (0.8 + 0.2 * Math.sin(t * 40));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + duration);
      } catch {
        // Safe fail
      }
    }, [soundEnabled, getAudioContext]);

    // Sanguchakaram high-pitched spinning buzz/whirr sound
    const playSpinSound = useCallback(() => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const duration = 4.2;
        const osc = ctx.createOscillator();
        const tremolo = ctx.createOscillator();
        const tremoloGain = ctx.createGain();
        const mainGain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(680, ctx.currentTime + 1.2);
        osc.frequency.setValueAtTime(680, ctx.currentTime + 2.8);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + duration);

        tremolo.type = "sine";
        tremolo.frequency.setValueAtTime(24, ctx.currentTime);

        tremoloGain.gain.setValueAtTime(0.04, ctx.currentTime);
        tremolo.connect(mainGain.gain);

        mainGain.gain.setValueAtTime(0.08, ctx.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 1.2);
        mainGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(mainGain);
        mainGain.connect(ctx.destination);

        osc.start();
        tremolo.start();
        osc.stop(ctx.currentTime + duration);
        tremolo.stop(ctx.currentTime + duration);
      } catch {
        // Safe fail
      }
    }, [soundEnabled, getAudioContext]);

    // 7-Shot Mortar Tube Launch Thump sound
    const playThumpSound = useCallback(() => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(170, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch {
        // Safe fail
      }
    }, [soundEnabled, getAudioContext]);

    // Create standard explosion
    const createExplosion = useCallback(
      (
        x: number,
        y: number,
        type: Rocket["type"] = "gold_palm",
        sparkMultiplier = 1
      ) => {
        playBlastSound(type === "sunburst" ? 1.2 : 1);

        let flashColor = "#ffd700";
        let flashRadius = 45;
        if (type === "purple_magenta") {
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
        } else if (type === "emerald_green") {
          flashColor = "#22c55e";
          flashRadius = 40;
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

        let particleCount = Math.floor(140 * sparkMultiplier);
        let colors: string[] = [];
        let coreColor = "#ffffff";
        let gravity = 0.038;
        let friction = 0.972;
        let maxTrail = 14;

        if (type === "gold_palm") {
          colors = ["#ffd700", "#ffe066", "#fff3b0", "#ffcc00", "#ffffff", "#e0aaff"];
          coreColor = "#e0aaff";
          gravity = 0.032;
          friction = 0.975;
          maxTrail = 16;
        } else if (type === "purple_magenta") {
          colors = ["#d946ef", "#c026d3", "#a855f7", "#ec4899", "#f43f5e", "#7c3aed", "#ffffff"];
          coreColor = "#f0abfc";
          gravity = 0.042;
          friction = 0.968;
          maxTrail = 15;
        } else if (type === "ruby_orange") {
          colors = ["#ff4500", "#ff6b6b", "#f97316", "#fb923c", "#ffd700", "#ffffff"];
          coreColor = "#fef08a";
          gravity = 0.035;
          friction = 0.974;
          maxTrail = 16;
        } else if (type === "sunburst") {
          colors = ["#ffffff", "#fffbeb", "#fef08a", "#fde047", "#f59e0b", "#ffedd5"];
          coreColor = "#ffffff";
          gravity = 0.028;
          friction = 0.978;
          maxTrail = 18;
        } else if (type === "electric_blue") {
          colors = ["#00f0ff", "#38bdf8", "#60a5fa", "#93c5fd", "#ffffff", "#818cf8"];
          coreColor = "#ffffff";
          gravity = 0.034;
          friction = 0.97;
          maxTrail = 14;
        } else if (type === "emerald_green") {
          colors = ["#22c55e", "#4ade80", "#86efac", "#10b981", "#ffffff", "#fef08a"];
          coreColor = "#86efac";
          gravity = 0.034;
          friction = 0.972;
          maxTrail = 15;
        }

        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const tier = Math.random();
          let speed =
            tier < 0.25
              ? Math.random() * 2.5 + 1.2
              : tier < 0.7
              ? Math.random() * 5 + 3
              : Math.random() * 7.5 + 4.5;

          const isSpike = type === "sunburst" && i % 4 === 0;
          if (isSpike) speed *= 1.35;

          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          const color = colors[Math.floor(Math.random() * colors.length)];

          particlesRef.current.push({
            x,
            y,
            vx,
            vy,
            alpha: 1,
            decay: Math.random() * 0.009 + 0.006,
            size: isSpike ? 3.0 : Math.random() * 2.2 + 1.2,
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

        // Ambient stardust around blast
        for (let i = 0; i < 35; i++) {
          const bgAngle = Math.random() * Math.PI * 2;
          const bgDist = Math.random() * 100 + 20;
          ambientStarsRef.current.push({
            x: x + Math.cos(bgAngle) * bgDist,
            y: y + Math.sin(bgAngle) * bgDist,
            size: Math.random() * 2 + 0.8,
            color: type === "electric_blue" ? "#38bdf8" : "#fde047",
            alpha: 1,
            twinkleSpeed: Math.random() * 0.06 + 0.03,
            phase: Math.random() * Math.PI * 2,
          });
        }
      },
      [playBlastSound]
    );

    // Launch a Sky Rocket
    const launchRocket = useCallback(
      (startX?: number, targetY?: number, forcedType?: Rocket["type"]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const types: Rocket["type"][] = [
          "gold_palm",
          "purple_magenta",
          "ruby_orange",
          "sunburst",
          "electric_blue",
          "emerald_green",
        ];

        const chosenType = forcedType || types[Math.floor(Math.random() * types.length)];
        const x =
          startX !== undefined
            ? startX
            : Math.random() * (canvas.width * 0.7) + canvas.width * 0.15;
        const startY = canvas.height;
        const tY =
          targetY !== undefined
            ? targetY
            : Math.random() * (canvas.height * 0.42) + canvas.height * 0.12;

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
        } else if (chosenType === "emerald_green") {
          color = "#22c55e";
          sparkColor = "#86efac";
        }

        const distance = startY - tY;
        const speed = Math.sqrt(2 * 0.2 * distance) * 1.05;
        const vx = (Math.random() - 0.5) * 1.6;

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

    // BLAST 1: Mathapu (Flowerpot / Anar fountain)
    const blastMathapu = useCallback(
      (customX?: number, customY?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const x = customX !== undefined ? customX : canvas.width * 0.5;
        const y = customY !== undefined ? customY : canvas.height - 45;

        mathapusRef.current.push({
          id: `mathapu_${Date.now()}_${Math.random()}`,
          x,
          y,
          startTime: performance.now(),
          duration: 4800,
          maxHeight: Math.min(canvas.height * 0.72, 480),
          potWidth: 36,
          potHeight: 48,
          colors: [
            "#ffffff",
            "#fffbeb",
            "#fef08a",
            "#fde047",
            "#ffd700",
            "#f59e0b",
            "#fb923c",
            "#ff4500",
            "#e0aaff",
          ],
        });

        playFountainSound();
        setActiveBlastInfo("💥 Blasting Mathapu (Golden Flowerpot Fountain)!");
        setTimeout(() => setActiveBlastInfo(null), 3500);
      },
      [playFountainSound]
    );

    // BLAST 2: Sanguchakaram (Ground Chakar / Spinner)
    const blastSanguchakaram = useCallback(
      (customX?: number, customY?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const x = customX !== undefined ? customX : canvas.width * 0.5;
        const y = customY !== undefined ? customY : canvas.height - 55;

        chakarsRef.current.push({
          id: `chakar_${Date.now()}_${Math.random()}`,
          x,
          y,
          startTime: performance.now(),
          duration: 5200,
          angle: 0,
          angularVelocity: 0.35,
          radius: 28,
          colors: [
            "#22c55e",
            "#4ade80",
            "#86efac",
            "#ffd700",
            "#f59e0b",
            "#f43f5e",
            "#fb7185",
            "#06b6d4",
          ],
        });

        playSpinSound();
        setActiveBlastInfo("🌀 Blasting Sanguchakaram (Whirling Fire Wheel)!");
        setTimeout(() => setActiveBlastInfo(null), 3500);
      },
      [playSpinSound]
    );

    // BLAST 3: 7-Shot (Sequential Multi-Color Aerial Bursts)
    const blastSevenShot = useCallback(
      (customX?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const x = customX !== undefined ? customX : canvas.width * 0.5;
        const y = canvas.height;

        sevenShotsRef.current.push({
          id: `7shot_${Date.now()}_${Math.random()}`,
          x,
          y,
          shotsFired: 0,
          maxShots: 7,
          nextShotTime: performance.now() + 150,
          shotInterval: 480,
          colorThemes: [
            "ruby_orange",
            "emerald_green",
            "gold_palm",
            "electric_blue",
            "purple_magenta",
            "sunburst",
            "gold_palm",
          ],
        });

        playThumpSound();
        setActiveBlastInfo("🚀 Blasting 7-Shot (Sequential Aerial Repeaters)!");
        setTimeout(() => setActiveBlastInfo(null), 4000);
      },
      [playThumpSound]
    );

    // Blast a specific cracker by key
    const blastCracker = useCallback(
      (type: CrackerType, x?: number, y?: number) => {
        setSelectedCracker(type);
        if (type === "mathapu") {
          blastMathapu(x, y);
        } else if (type === "sanguchakaram") {
          blastSanguchakaram(x, y);
        } else if (type === "7shot") {
          blastSevenShot(x);
        } else if (type === "rocket") {
          launchRocket(x, y);
          setActiveBlastInfo("🚀 Blasting Sky Rocket (High Altitude Blast)!");
          setTimeout(() => setActiveBlastInfo(null), 3500);
        }
      },
      [blastMathapu, blastSanguchakaram, blastSevenShot, launchRocket]
    );

    // BLAST ALL: Combo show blasting everything together
    const blastAll = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 1. Mathapu on the left
      blastMathapu(canvas.width * 0.28, canvas.height - 45);

      // 2. Sanguchakaram on the right
      blastSanguchakaram(canvas.width * 0.72, canvas.height - 55);

      // 3. 7-Shot in the center
      blastSevenShot(canvas.width * 0.5);

      // 4. Two high rockets
      setTimeout(() => {
        launchRocket(canvas.width * 0.35, canvas.height * 0.22, "sunburst");
        launchRocket(canvas.width * 0.65, canvas.height * 0.26, "purple_magenta");
      }, 800);

      setActiveBlastInfo("🎆 Grand Diwali Fireworks Combo Blasting!");
      setTimeout(() => setActiveBlastInfo(null), 4000);
    }, [blastMathapu, blastSanguchakaram, blastSevenShot, launchRocket]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        blastCracker,
        blastAll,
      }),
      [blastCracker, blastAll]
    );

    // Initial cracker trigger if specified by parent
    useEffect(() => {
      if (isOpen && initialCracker) {
        blastCracker(initialCracker);
      }
    }, [isOpen, initialCracker, blastCracker]);

    // Click canvas to place and blast selected cracker
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (selectedCracker === "mathapu") {
        blastMathapu(clickX, clickY);
      } else if (selectedCracker === "sanguchakaram") {
        blastSanguchakaram(clickX, clickY);
      } else if (selectedCracker === "7shot") {
        blastSevenShot(clickX);
      } else {
        launchRocket(clickX, clickY);
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

      // Seed ambient background stars
      ambientStarsRef.current = [];
      for (let i = 0; i < 70; i++) {
        ambientStarsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * (window.innerHeight * 0.75),
          size: Math.random() * 1.8 + 0.6,
          color: Math.random() > 0.4 ? "#fef08a" : "#38bdf8",
          alpha: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.04 + 0.02,
          phase: Math.random() * Math.PI * 2,
        });
      }

      const loop = (currentTime: number) => {
        // 1. Dark translucent trail fade (long-exposure night atmosphere)
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.20)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Switch to 'lighter' blending mode for glowing firework particles
        ctx.globalCompositeOperation = "lighter";

        // 2. Render & Update Background Ambient Stars
        for (let i = ambientStarsRef.current.length - 1; i >= 0; i--) {
          const star = ambientStarsRef.current[i];
          star.phase += star.twinkleSpeed;
          const twinkle = Math.sin(star.phase) * 0.4 + 0.6;
          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.alpha * twinkle * 0.7;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3. Render & Update Central Flashes
        for (let i = flashesRef.current.length - 1; i >= 0; i--) {
          const flash = flashesRef.current[i];
          flash.radius += (flash.maxRadius - flash.radius) * 0.25;
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
          grad.addColorStop(0.35, flash.color);
          grad.addColorStop(1, "transparent");

          ctx.fillStyle = grad;
          ctx.globalAlpha = flash.alpha;
          ctx.beginPath();
          ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Update & Render MATHAPU (Flowerpot Fountain) Instances
        for (let m = mathapusRef.current.length - 1; m >= 0; m--) {
          const mathapu = mathapusRef.current[m];
          const age = currentTime - mathapu.startTime;
          const progress = Math.min(1, age / mathapu.duration);

          if (progress >= 1) {
            mathapusRef.current.splice(m, 1);
            continue;
          }

          // Flowerpot height & power curve: starts medium, surges to full height, tapers to embers
          let power = 1;
          if (progress < 0.25) {
            power = progress / 0.25;
          } else if (progress > 0.8) {
            power = (1 - progress) / 0.2;
          } else {
            // Climax pulsating fountain
            power = 0.85 + Math.sin(age * 0.015) * 0.15;
          }

          const currentFountainHeight = mathapu.maxHeight * power;

          // Draw Ground Reflection & Earthen Pot Base
          ctx.save();
          ctx.globalCompositeOperation = "source-over";

          // Glowing ground light
          const groundGlow = ctx.createRadialGradient(
            mathapu.x,
            mathapu.y,
            5,
            mathapu.x,
            mathapu.y,
            110 * power
          );
          groundGlow.addColorStop(0, "rgba(255, 215, 0, 0.65)");
          groundGlow.addColorStop(0.4, "rgba(249, 115, 22, 0.35)");
          groundGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = groundGlow;
          ctx.beginPath();
          ctx.ellipse(mathapu.x, mathapu.y + 8, 90 * power, 22 * power, 0, 0, Math.PI * 2);
          ctx.fill();

          // Conical earthen flower pot
          const halfW = mathapu.potWidth / 2;
          const topW = halfW * 0.45;
          ctx.fillStyle = "#8d2b0b"; // terracotta
          ctx.beginPath();
          ctx.moveTo(mathapu.x - halfW, mathapu.y);
          ctx.lineTo(mathapu.x - topW, mathapu.y - mathapu.potHeight);
          ctx.lineTo(mathapu.x + topW, mathapu.y - mathapu.potHeight);
          ctx.lineTo(mathapu.x + halfW, mathapu.y);
          ctx.closePath();
          ctx.fill();

          // Golden decorative band on pot
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Blazing nozzle at top of flowerpot
          ctx.globalCompositeOperation = "lighter";
          const nozzleGrad = ctx.createRadialGradient(
            mathapu.x,
            mathapu.y - mathapu.potHeight,
            2,
            mathapu.x,
            mathapu.y - mathapu.potHeight,
            16
          );
          nozzleGrad.addColorStop(0, "#ffffff");
          nozzleGrad.addColorStop(0.5, "#ffd700");
          nozzleGrad.addColorStop(1, "transparent");
          ctx.fillStyle = nozzleGrad;
          ctx.beginPath();
          ctx.arc(mathapu.x, mathapu.y - mathapu.potHeight, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Spawn fountain sparks (20-30 sparks per frame during active fountain)
          const sparkCount = Math.floor((18 + Math.random() * 12) * power);
          const originY = mathapu.y - mathapu.potHeight;

          for (let i = 0; i < sparkCount; i++) {
            // Cone spread: slightly widening upwards
            const spread = (Math.random() - 0.5) * 0.42;
            const launchAngle = -Math.PI / 2 + spread;
            const initialSpeed = Math.sqrt(2 * 0.42 * currentFountainHeight) * (0.85 + Math.random() * 0.35);

            const vx = Math.cos(launchAngle) * initialSpeed * 0.65;
            const vy = Math.sin(launchAngle) * initialSpeed;

            const color = mathapu.colors[Math.floor(Math.random() * mathapu.colors.length)];
            const isSpike = Math.random() > 0.8;

            particlesRef.current.push({
              x: mathapu.x + (Math.random() - 0.5) * 6,
              y: originY,
              vx,
              vy,
              alpha: 1,
              decay: Math.random() * 0.018 + 0.012,
              size: isSpike ? 2.6 : Math.random() * 2.0 + 1.0,
              color,
              coreColor: "#ffffff",
              trail: [{ x: mathapu.x, y: originY }],
              maxTrailLength: isSpike ? 10 : 7,
              gravity: 0.38,
              friction: 0.982,
              flicker: Math.random() > 0.25,
              twinklePhase: Math.random() * Math.PI * 2,
              isSpike,
            });
          }
        }

        // 5. Update & Render SANGUCHAKARAM (Ground Spinner) Instances
        for (let c = chakarsRef.current.length - 1; c >= 0; c--) {
          const chakar = chakarsRef.current[c];
          const age = currentTime - chakar.startTime;
          const progress = Math.min(1, age / chakar.duration);

          if (progress >= 1) {
            // Detonation pop at end of spin
            createExplosion(chakar.x, chakar.y - 15, "emerald_green", 0.6);
            chakarsRef.current.splice(c, 1);
            continue;
          }

          // Spin speed curve: accelerates, spins vigorously, slows down
          let spinSpeedFactor = 1;
          if (progress < 0.2) spinSpeedFactor = 0.5 + (progress / 0.2) * 0.5;
          else if (progress > 0.85) spinSpeedFactor = (1 - progress) / 0.15;
          else spinSpeedFactor = 1.0 + Math.sin(age * 0.02) * 0.1;

          chakar.angle += chakar.angularVelocity * spinSpeedFactor;

          // Draw glowing rotating wheel on ground with perspective
          ctx.save();
          ctx.globalCompositeOperation = "source-over";

          // Ground burning glow
          const chakarGlow = ctx.createRadialGradient(
            chakar.x,
            chakar.y,
            4,
            chakar.x,
            chakar.y,
            120 * spinSpeedFactor
          );
          chakarGlow.addColorStop(0, "rgba(74, 222, 128, 0.7)");
          chakarGlow.addColorStop(0.35, "rgba(250, 204, 21, 0.4)");
          chakarGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = chakarGlow;
          ctx.beginPath();
          ctx.ellipse(chakar.x, chakar.y, 110 * spinSpeedFactor, 36 * spinSpeedFactor, 0, 0, Math.PI * 2);
          ctx.fill();

          // Center spinner disc
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.ellipse(chakar.x, chakar.y, chakar.radius, chakar.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#4ade80";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Center fiery eye
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(chakar.x, chakar.y, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Emit tangential high-velocity spinning sparks from 4 nozzles along perimeter
          const nozzleCount = 4;
          const sparkCountPerNozzle = Math.floor(4 * spinSpeedFactor);

          for (let n = 0; n < nozzleCount; n++) {
            const nozzleAngle = chakar.angle + (n * Math.PI * 2) / nozzleCount;
            // Elliptical ground perspective
            const nozzleX = chakar.x + Math.cos(nozzleAngle) * chakar.radius;
            const nozzleY = chakar.y + Math.sin(nozzleAngle) * (chakar.radius * 0.45);

            for (let s = 0; s < sparkCountPerNozzle; s++) {
              const tangentAngle = nozzleAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
              const speed = (Math.random() * 7 + 7) * spinSpeedFactor;

              const vx = Math.cos(tangentAngle) * speed;
              const vy = Math.sin(tangentAngle) * speed * 0.52; // flattened perspective
              const color = chakar.colors[Math.floor(Math.random() * chakar.colors.length)];

              particlesRef.current.push({
                x: nozzleX,
                y: nozzleY,
                vx,
                vy,
                alpha: 1,
                decay: Math.random() * 0.024 + 0.016,
                size: Math.random() * 2.2 + 1.2,
                color,
                coreColor: "#ffffff",
                trail: [{ x: nozzleX, y: nozzleY }],
                maxTrailLength: 8,
                gravity: 0.08,
                friction: 0.94,
                flicker: true,
                twinklePhase: Math.random() * Math.PI * 2,
                isSpike: Math.random() > 0.7,
              });
            }
          }
        }

        // 6. Update & Render 7-SHOT Launchers
        for (let s = sevenShotsRef.current.length - 1; s >= 0; s--) {
          const sevenShot = sevenShotsRef.current[s];

          // Check if time for next sequential shot
          if (currentTime >= sevenShot.nextShotTime && sevenShot.shotsFired < sevenShot.maxShots) {
            const shotIndex = sevenShot.shotsFired;
            const theme = sevenShot.colorThemes[shotIndex % sevenShot.colorThemes.length];

            // Launch rocket from tube
            const targetY = canvas.height * (0.16 + (shotIndex % 3) * 0.12);
            launchRocket(sevenShot.x, targetY, theme);
            playThumpSound();

            // Tube base muzzle flash
            flashesRef.current.push({
              x: sevenShot.x,
              y: canvas.height - 15,
              radius: 5,
              maxRadius: 28,
              color: "#ffedd5",
              alpha: 0.9,
              decay: 0.12,
            });

            sevenShot.shotsFired += 1;
            sevenShot.nextShotTime = currentTime + sevenShot.shotInterval;

            setActiveBlastInfo(`✨ 7-Shot: Burst ${sevenShot.shotsFired}/7 launched!`);
          }

          if (sevenShot.shotsFired >= sevenShot.maxShots && currentTime > sevenShot.nextShotTime + 1000) {
            sevenShotsRef.current.splice(s, 1);
          }
        }

        // 7. Update & Render Ascending Sky Rockets
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

          // Rocket physics
          rocket.x += rocket.vx;
          rocket.y += rocket.vy;
          rocket.vy += 0.18;

          // Apex detonation
          if (rocket.vy >= -1 || rocket.y <= rocket.targetY) {
            createExplosion(rocket.x, rocket.y, rocket.type);
            rocketsRef.current.splice(i, 1);
          }
        }

        // 8. Update & Render Firework Particles & Streaks
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];

          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > p.maxTrailLength) p.trail.shift();

          p.twinklePhase += 0.15;
          const twinkle = p.flicker ? Math.sin(p.twinklePhase) * 0.35 + 0.65 : 1;

          // Draw radiant streak trail
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

          // Draw glowing spark head
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = p.coreColor;
          ctx.globalAlpha = p.alpha * twinkle;
          ctx.fill();

          // 4-Pointed Star Glare for spikes
          if (p.isSpike && p.alpha > 0.6) {
            const glareSize = p.size * 3.2;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x - glareSize, p.y);
            ctx.lineTo(p.x + glareSize, p.y);
            ctx.moveTo(p.x, p.y - glareSize);
            ctx.lineTo(p.x + glareSize, p.y);
            ctx.stroke();
          }

          // Particle Physics
          p.vx *= p.friction;
          p.vy *= p.friction;
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          if (p.alpha <= 0 || p.y > canvas.height + 35) {
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
    }, [
      isOpen,
      createExplosion,
      launchRocket,
      playThumpSound,
    ]);

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
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-3 sm:p-5 overflow-hidden">
        {/* Fullscreen Night-Sky Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
        />

        {/* Floating Top Header Banner / Badge */}
        {showControls && (
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 w-full animate-fade-in pointer-events-auto">
            <div className="flex items-center gap-2.5 rounded-full bg-slate-950/85 border border-white/20 backdrop-blur-md px-4 py-2 text-white shadow-2xl">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
                🪔 Diwali Crackers Blast · Click any cracker below to light & blast!
              </span>
            </div>

            {/* Quick Controls Pill */}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-950/85 border border-white/20 backdrop-blur-md p-1.5 text-white shadow-2xl">
              <button
                type="button"
                onClick={blastAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                title="Grand combo: Blast Mathapu, Sanguchakaram, 7-Shot & Rockets together!"
              >
                <Whatshot sx={{ fontSize: 16 }} className="animate-pulse text-yellow-300" />
                <span>Blast All Combo</span>
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

        {/* Live Active Blast Toast */}
        {activeBlastInfo && (
          <div className="relative z-10 self-center pointer-events-none animate-bounce">
            <div className="rounded-full bg-slate-950/90 border border-amber-400/60 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-extrabold text-amber-300 shadow-xl shadow-amber-500/20">
              {activeBlastInfo}
            </div>
          </div>
        )}

        {/* Interactive Cracker Selection Dock Below with Real Images */}
        {showControls && (
          <div className="relative z-10 self-center w-full max-w-4xl flex flex-col items-center gap-2.5 pointer-events-auto animate-fade-in mb-1">
            {/* Cards Shelf */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 p-3 rounded-2xl bg-slate-950/90 border border-white/20 backdrop-blur-xl shadow-2xl">
              {CRACKER_DEFINITIONS.map((cracker) => {
                const isSelected = selectedCracker === cracker.id;
                return (
                  <div
                    key={cracker.id}
                    onClick={() => blastCracker(cracker.id)}
                    className={`group relative flex flex-col items-center text-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      isSelected
                        ? "bg-white/15 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/25 scale-[1.02]"
                        : "bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Cracker Image */}
                    <div className="relative w-full aspect-square max-h-24 sm:max-h-28 rounded-lg overflow-hidden mb-2 bg-slate-900 ring-1 ring-white/20 shadow-inner">
                      <img
                        src={cracker.image}
                        alt={cracker.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="eager"
                      />
                      <span className="absolute top-1 right-1 rounded-md bg-slate-950/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/40">
                        {cracker.badge}
                      </span>
                    </div>

                    {/* Cracker Titles */}
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                        {cracker.name}
                      </span>
                      <span className="text-[10px] font-medium text-amber-400/90">
                        {cracker.tamilName}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                      {cracker.tagline}
                    </p>

                    {/* Blast Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        blastCracker(cracker.id);
                      }}
                      className={`w-full mt-2 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-gradient-to-r ${cracker.gradient} text-white font-bold text-[11px] shadow-sm active:scale-95 transition-all cursor-pointer`}
                    >
                      <AutoAwesome sx={{ fontSize: 13 }} />
                      <span>Blast Now</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status & Dismiss Bar */}
            <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Tip: Click on screen to blast selected cracker anywhere</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900/90 border border-white/20 px-2.5 py-1 font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <span>Dismiss ({remainingTime}s)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CrackersBlast.displayName = "CrackersBlast";

export default CrackersBlast;

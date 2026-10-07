"use client";

import { useEffect, useRef } from "react";

export function FlowingWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      t += 0.012; // Velocitat a la que la cinta rodola sobre si mateixa
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Centre focal desplaçat lleugerament a la dreta per equilibrar els textos
      const centerX = width * 0.58;
      const centerY = height * 0.50;

      const lines = 48; // Nombre de fils o "fibres" que componen la cinta
      const R = 110;    // Radi del cercle generatriu principal
      const stripWidth = 100; // Amplada total de la cinta

      ctx.lineWidth = 1.1;

      for (let i = 0; i < lines; i++) {
        const progress = i / (lines - 1);
        // La variable 'v' recorre l'amplada de la cinta de -50 a 50
        const v = (progress - 0.5) * stripWidth;

        // Suavitzat òptic: els fils de les vores són més translúcids que els centrals
        const edgeFade = Math.sin(progress * Math.PI);
        ctx.strokeStyle = `rgba(0, 176, 80, ${(edgeFade * 0.75 + 0.05).toFixed(3)})`;
        ctx.beginPath();

        const points = 220; // Resolució de la corba
        for (let p = 0; p <= points; p++) {
          // Per dibuixar una cinta de Möbius completa calen 2 voltes senceres (4 PI)
          const u = (p / points) * Math.PI * 4;

          // Animem l'angle de torsió perquè la cinta flueixi i es retorci dinàmicament
          const twist = u / 2 + t;

          // 1. Equacions paramètriques 3D de la Cinta de Möbius
          const x3d = (R + v * Math.cos(twist)) * Math.cos(u);
          const y3d = (R + v * Math.cos(twist)) * Math.sin(u);
          const z3d = v * Math.sin(twist);

          // 2. Rotació de Càmera (Pitch & Yaw) per donar perspectiva isomètrica
          const pitch = Math.PI * 0.20; // Inclinació cap endavant
          const y_pitch = y3d * Math.cos(pitch) - z3d * Math.sin(pitch);
          const z_pitch = y3d * Math.sin(pitch) + z3d * Math.cos(pitch);

          const yaw = -Math.PI * 0.15; // Gir lateral perquè es vegi en 3/4
          const x_yaw = x3d * Math.cos(yaw) + z_pitch * Math.sin(yaw);

          // 3. Afegim una oscil·lació flotant global per fer-ho més orgànic
          const wave = Math.sin(u * 2 - t * 2) * 5;

          // Projecció final 2D amb factor d'escala
          const scale = 1.35;
          const x2d = centerX + x_yaw * scale;
          const y2d = centerY + y_pitch * scale + wave;

          if (p === 0) {
            ctx.moveTo(x2d, y2d);
          } else {
            ctx.lineTo(x2d, y2d);
          }
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

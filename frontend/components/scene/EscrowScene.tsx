"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * EscrowScene — a WebGL picture of how Foreman settles work.
 *
 *  • the amber core is the escrow vault holding GEN
 *  • the orbiting octahedra are validators on tilted rings
 *  • every few seconds each validator "fetches the evidence" (a beam to the
 *    core), they reach consensus together and the vault releases a burst of
 *    particles — the payout.
 *
 * Performance notes: the render loop is paused while the tab is hidden or the
 * canvas is offscreen, pixel ratio is capped, geometry/material instances are
 * shared, and everything is disposed on unmount. With `reducedMotion` it
 * renders a single still frame.
 */
const VALIDATORS = 7;
const PARTICLES = 140;
const CYCLE = 7; // seconds per adjudication loop

export default function EscrowScene({
  reducedMotion = false,
  onReady,
}: {
  reducedMotion?: boolean;
  onReady?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.6, 7.2);

    const AMBER = new THREE.Color("#d89b4a");
    const ORANGE = new THREE.Color("#e8793a");
    const BLUE = new THREE.Color("#3a4bd8");
    const INK = new THREE.Color("#3b2f1c");

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const root = new THREE.Group();
    scene.add(root);

    // --- vault core ---------------------------------------------------------
    const coreGeo = track(new THREE.IcosahedronGeometry(0.62, 1));
    const coreMat = track(new THREE.MeshBasicMaterial({ color: AMBER }));
    const core = new THREE.Mesh(coreGeo, coreMat);
    root.add(core);

    const shellGeo = track(new THREE.IcosahedronGeometry(1.0, 1));
    const shellMat = track(
      new THREE.MeshBasicMaterial({ color: INK, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    const shell = new THREE.Mesh(shellGeo, shellMat);
    root.add(shell);

    const haloGeo = track(new THREE.SphereGeometry(0.95, 24, 24));
    const haloMat = track(
      new THREE.MeshBasicMaterial({
        color: ORANGE,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const halo = new THREE.Mesh(haloGeo, haloMat);
    root.add(halo);

    // --- orbit rings + validators --------------------------------------------
    const ringGeo = track(new THREE.RingGeometry(2.38, 2.4, 128));
    const ringMat = track(
      new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    );
    const tilts = [0.35, -0.55, 1.05];
    const rings = tilts.map((t, i) => {
      const r = new THREE.Mesh(ringGeo, ringMat);
      r.rotation.x = Math.PI / 2 + t;
      r.rotation.y = i * 0.9;
      root.add(r);
      return r;
    });

    const nodeGeo = track(new THREE.OctahedronGeometry(0.16, 0));
    type Node = {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      beam: THREE.Line;
      phase: number;
      speed: number;
      tilt: number;
      tiltY: number;
      radius: number;
    };
    const nodes: Node[] = [];
    for (let i = 0; i < VALIDATORS; i++) {
      const mat = track(new THREE.MeshBasicMaterial({ color: INK }));
      const mesh = new THREE.Mesh(nodeGeo, mat);
      root.add(mesh);
      const beamGeo = track(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      );
      const beamMat = track(
        new THREE.LineBasicMaterial({
          color: BLUE,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const beam = new THREE.Line(beamGeo, beamMat);
      root.add(beam);
      nodes.push({
        mesh,
        mat,
        beam,
        phase: (i / VALIDATORS) * Math.PI * 2,
        speed: 0.28 + (i % 3) * 0.05,
        tilt: tilts[i % tilts.length],
        tiltY: (i % tilts.length) * 0.9,
        radius: 2.39,
      });
    }

    // --- payout particles ------------------------------------------------------
    const pPos = new Float32Array(PARTICLES * 3);
    const pVel = new Float32Array(PARTICLES * 3);
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = track(
      new THREE.PointsMaterial({
        color: AMBER,
        size: 0.055,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const points = new THREE.Points(pGeo, pMat);
    root.add(points);

    // --- ambient dust ----------------------------------------------------------
    const DUST = 220;
    const dPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const r = 3 + Math.random() * 4;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      dPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
      dPos[i * 3 + 2] = r * Math.cos(ph) - 1;
    }
    const dGeo = track(new THREE.BufferGeometry());
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dMat = track(
      new THREE.PointsMaterial({ color: INK, size: 0.025, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    // --- sizing ------------------------------------------------------------------
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 9.5 : 7.2;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // --- pointer parallax -----------------------------------------------------------
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // --- animation -------------------------------------------------------------------
    const tmp = new THREE.Vector3();
    const AX = new THREE.Vector3(1, 0, 0);
    const AY = new THREE.Vector3(0, 1, 0);
    const burst = () => {
      for (let i = 0; i < PARTICLES; i++) {
        pPos[i * 3] = pPos[i * 3 + 1] = pPos[i * 3 + 2] = 0;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const sp = 0.8 + Math.random() * 1.6;
        pVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
        pVel[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp;
        pVel[i * 3 + 2] = Math.cos(ph) * sp;
      }
    };
    let burstAt = -1;

    const frame = (t: number, dt: number) => {
      const cyc = (t % CYCLE) / CYCLE; // 0..1
      // windows: 0-.3 orbit, .3-.7 fetch beams, ~.74 consensus flash, .76+ payout
      const fetch =
        THREE.MathUtils.smoothstep(cyc, 0.3, 0.45) * (1 - THREE.MathUtils.smoothstep(cyc, 0.68, 0.74));
      const flash = Math.max(0, 1 - Math.abs(cyc - 0.74) / 0.05);

      shell.rotation.y += dt * 0.18;
      shell.rotation.x += dt * 0.07;
      core.rotation.y -= dt * 0.35;
      core.scale.setScalar(1 + flash * 0.35 + Math.sin(t * 2) * 0.02);
      halo.scale.setScalar(1 + flash * 0.6);
      haloMat.opacity = 0.1 + flash * 0.35;
      coreMat.color.copy(AMBER).lerp(ORANGE, flash);

      nodes.forEach((n, i) => {
        const a = n.phase + t * n.speed;
        tmp.set(Math.cos(a) * n.radius, 0, Math.sin(a) * n.radius);
        tmp.applyAxisAngle(AX, n.tilt);
        tmp.applyAxisAngle(AY, n.tiltY);
        n.mesh.position.copy(tmp);
        n.mesh.rotation.x += dt * 1.2;
        n.mesh.rotation.y += dt * 0.9;

        // stagger each validator's "fetch" so they light up one by one
        const lit = THREE.MathUtils.clamp(fetch * 1.6 - i * 0.09, 0, 1);
        n.mat.color.copy(INK).lerp(BLUE, lit).lerp(AMBER, flash);
        n.mesh.scale.setScalar(1 + lit * 0.5 + flash * 0.4);

        const pos = n.beam.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, tmp.x, tmp.y, tmp.z);
        pos.setXYZ(1, 0, 0, 0);
        pos.needsUpdate = true;
        (n.beam.material as THREE.LineBasicMaterial).opacity = lit * 0.65 * (1 - flash);
      });

      if (cyc > 0.76 && burstAt < 0) {
        burst();
        burstAt = t;
      }
      if (cyc < 0.1) burstAt = -1;
      if (burstAt >= 0) {
        const age = t - burstAt;
        pMat.opacity = Math.max(0, 1 - age / 1.6);
        for (let i = 0; i < PARTICLES * 3; i++) pPos[i] += pVel[i] * dt;
        (pGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      } else {
        pMat.opacity = 0;
      }

      rings.forEach((r, i) => (r.rotation.z += dt * 0.03 * (i + 1)));
      dust.rotation.y += dt * 0.012;

      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      root.rotation.y = current.x * 0.35 + Math.sin(t * 0.25) * 0.1;
      root.rotation.x = current.y * 0.18;

      renderer.render(scene, camera);
    };

    let raf = 0;
    let running = false;
    let last = performance.now();
    let clock = 0;
    let onScreen = true;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      frame(clock, dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => {
      if (onScreen && document.visibilityState === "visible") start();
      else stop();
    };

    const io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    if (reducedMotion) {
      clock = CYCLE * 0.5;
      frame(clock, 0);
    } else {
      sync();
    }
    onReady?.();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reducedMotion, onReady]);

  if (failed) return null;
  return <div ref={host} className="w-full h-full" aria-hidden="true" />;
}

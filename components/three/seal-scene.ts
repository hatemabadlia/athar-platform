/**
 * ATHAR 3D seal: the khatam (two rounded squares, one turned 45°) with a check mark, built procedurally
 * with three.js — no model files to download.
 *
 * mode "intro": the two squares fly in and lock into the khatam, then the check mark draws itself.
 * mode "hero":  the seal turns slowly while small "posts" orbit it; green ones (verified) are absorbed by the
 *               seal, red ones (recycled / duplicate) bounce off and fade — the product idea in one image.
 */
import * as THREE from "three";

export type SealMode = "intro" | "hero";
export interface SealScene { dispose: () => void }

const EMERALD = new THREE.Color("#059669");
const MINT = new THREE.Color("#34d399");
const RED = new THREE.Color("#f43f5e");

function roundedSquare(size: number, r: number) {
  const s = size / 2, sh = new THREE.Shape();
  sh.moveTo(-s + r, -s); sh.lineTo(s - r, -s); sh.quadraticCurveTo(s, -s, s, -s + r);
  sh.lineTo(s, s - r); sh.quadraticCurveTo(s, s, s - r, s); sh.lineTo(-s + r, s);
  sh.quadraticCurveTo(-s, s, -s, s - r); sh.lineTo(-s, -s + r); sh.quadraticCurveTo(-s, -s, -s + r, -s);
  return sh;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function createSealScene(canvas: HTMLCanvasElement, mode: SealMode, opts: { reducedMotion?: boolean } = {}): SealScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, mode === "intro" ? 9 : 10);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.PointLight(0x34d399, 30, 20); rim.position.set(-4, -2, 3); scene.add(rim);

  // --- the seal
  const seal = new THREE.Group(); scene.add(seal);
  const geo = new THREE.ExtrudeGeometry(roundedSquare(2.2, 0.38), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 4, curveSegments: 10 });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({ color: EMERALD, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.2, emissive: new THREE.Color("#022c22"), emissiveIntensity: 0.4 });
  const sqA = new THREE.Mesh(geo, mat); const sqB = new THREE.Mesh(geo, mat);
  seal.add(sqA, sqB);

  const checkPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.62, 0.02, 0), new THREE.Vector3(-0.18, -0.42, 0), new THREE.Vector3(0.66, 0.5, 0)], false, "catmullrom", 0.05);
  const checkGeo = new THREE.TubeGeometry(checkPath, 64, 0.11, 12, false);
  const checkMat = new THREE.MeshStandardMaterial({ color: 0xecfdf5, emissive: 0xd1fae5, emissiveIntensity: 0.35, roughness: 0.3 });
  const check = new THREE.Mesh(checkGeo, checkMat); check.position.z = 0.34; seal.add(check);
  const checkTotal = checkGeo.index ? checkGeo.index.count : 0;

  // --- orbiting "posts" (hero only)
  const N = mode === "hero" ? 34 : 0;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.6 }), Math.max(N, 1));
  dots.visible = N > 0; scene.add(dots);
  type P = { a: number; r: number; y: number; speed: number; good: boolean; bounced: boolean; life: number };
  const ps: P[] = [];
  const spawn = (p?: P): P => Object.assign(p ?? ({} as P), {
    a: Math.random() * Math.PI * 2, r: 3.4 + Math.random() * 1.2, y: (Math.random() - 0.5) * 2.2,
    speed: 0.25 + Math.random() * 0.35, good: Math.random() < 0.68, bounced: false, life: 1,
  });
  for (let i = 0; i < N; i++) { const p = spawn(); p.r -= Math.random() * 1.6; ps.push(p); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  // --- interaction & sizing
  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
  window.addEventListener("pointermove", onMove, { passive: true });
  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(canvas);

  const clock = new THREE.Clock();
  let raf = 0, pulse = 0, last = 0;

  const frame = () => {
    const t = clock.getElapsedTime(), dt = Math.min(Math.max(t - last, 0), 0.05); last = t;
    if (mode === "intro") {
      // 0–1.1 s: squares fly in and turn; 1.0–1.9 s: check draws; then a slow settle
      const k = ease(t / 1.1);
      sqA.position.set(-3 * (1 - k), 1.4 * (1 - k), -2 * (1 - k)); sqA.rotation.z = -0.6 * (1 - k);
      sqB.position.set(3 * (1 - k), -1.4 * (1 - k), -2 * (1 - k)); sqB.rotation.z = Math.PI / 4 + 0.9 * (1 - k);
      const s = 0.4 + 0.6 * k; sqA.scale.setScalar(s); sqB.scale.setScalar(s);
      const c = ease((t - 1.0) / 0.9);
      checkGeo.setDrawRange(0, Math.floor((checkTotal * c) / 3) * 3); check.visible = c > 0.01;
      seal.rotation.y = 0.5 * (1 - ease(t / 1.6)) + Math.sin(t * 0.8) * 0.12;
      seal.rotation.x = Math.sin(t * 0.6) * 0.08;
      seal.scale.setScalar(1 + 0.06 * Math.sin(Math.min(t, 2.2) * Math.PI / 2.2));
    } else {
      sqB.rotation.z = Math.PI / 4;
      seal.rotation.y += (pointer.x * 0.45 + Math.sin(t * 0.35) * 0.35 - seal.rotation.y) * 0.04;
      seal.rotation.x += (pointer.y * 0.25 + Math.sin(t * 0.5) * 0.08 - seal.rotation.x) * 0.04;
      pulse = Math.max(0, pulse - dt * 1.8);
      mat.emissiveIntensity = 0.4 + pulse * 1.2;
      for (let i = 0; i < N; i++) {
        const p = ps[i];
        p.a += p.speed * dt;
        if (p.good) {
          // verified: drawn into the seal, which glows briefly
          p.r -= dt * 0.55; p.y *= 1 - dt * 0.6;
          if (p.r < 1.15) { pulse = Math.min(1, pulse + 0.35); spawn(p); }
        } else if (!p.bounced) {
          p.r -= dt * 0.55;
          if (p.r <= 1.9) p.bounced = true; // recycled / duplicate: rejected at the edge
        } else {
          p.r += dt * 1.4; p.life -= dt * 0.9;
          if (p.life <= 0) spawn(p);
        }
        pos.set(Math.cos(p.a) * p.r, p.y, Math.sin(p.a) * p.r * 0.55);
        scl.setScalar(p.bounced ? Math.max(0.05, p.life) : 1); m4.compose(pos, q, scl); dots.setMatrixAt(i, m4);
        dots.setColorAt(i, tmpColor.copy(p.good ? MINT : RED));
      }
      dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };

  const loop = () => { raf = requestAnimationFrame(loop); if (visible && !document.hidden) frame(); };
  if (opts.reducedMotion) {
    // a single still frame: assembled seal, full check, no particles
    sqA.position.set(0, 0, 0); sqB.rotation.z = Math.PI / 4; checkGeo.setDrawRange(0, Infinity);
    seal.rotation.set(0.05, -0.25, 0); dots.visible = false; renderer.render(scene, camera);
  } else loop();

  return {
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", onMove);
      geo.dispose(); checkGeo.dispose(); mat.dispose(); checkMat.dispose(); dots.geometry.dispose(); (dots.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}

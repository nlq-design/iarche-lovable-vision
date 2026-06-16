const PARTICLES = [
  { w: 10, top: "14%", left: "12%", delay: "0s" },
  { w: 6, top: "30%", left: "78%", delay: "1.2s" },
  { w: 14, top: "62%", left: "8%", delay: "2.1s" },
  { w: 7, top: "74%", left: "64%", delay: "0.6s" },
  { w: 9, top: "20%", left: "48%", delay: "3s" },
];

/** Champ de particules flottantes pour les heros sombres (charte v4.0). */
export default function Particles() {
  return (
    <div className="ds-particles motion-reduce:hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ds-particle"
          style={{ width: p.w, height: p.w, top: p.top, left: p.left, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}

/** Ilustração decorativa: uma estante com lombadas de livros. */
export function BookSpines({ className }: { className?: string }) {
  const spines = [
    { h: 118, c: "#1B7F79", w: 22 }, { h: 146, c: "#F0B429", w: 18 }, { h: 100, c: "#C4553D", w: 26 },
    { h: 132, c: "#E9EEF2", w: 16 }, { h: 156, c: "#5F4A8B", w: 24 }, { h: 110, c: "#F0B429", w: 20 },
    { h: 140, c: "#1B7F79", w: 18 }, { h: 122, c: "#43703A", w: 24 }, { h: 150, c: "#E9EEF2", w: 20 },
    { h: 104, c: "#C4553D", w: 18 }, { h: 136, c: "#F0B429", w: 26 }, { h: 118, c: "#5F4A8B", w: 18 },
  ];
  let x = 4;
  return (
    <svg viewBox="0 0 280 170" className={className} role="img" aria-label="Estante com livros" preserveAspectRatio="xMidYMax meet">
      {spines.map((s, i) => {
        const el = (
          <g key={i}>
            <rect x={x} y={166 - s.h} width={s.w} height={s.h} rx={2} fill={s.c} />
            <rect x={x + 3} y={166 - s.h + 12} width={s.w - 6} height={3} rx={1} fill="#000" opacity=".18" />
            <rect x={x + 3} y={166 - s.h + 20} width={s.w - 6} height={3} rx={1} fill="#000" opacity=".18" />
          </g>
        );
        x += s.w + 3;
        return el;
      })}
      <rect x={0} y={166} width={280} height={4} rx={2} fill="#000" opacity=".25" />
    </svg>
  );
}

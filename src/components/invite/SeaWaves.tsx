/**
 * Mar animado do hero (D-08) — plano de água com horizonte reto sobre o
 * disco solar e três faixas de onda em paralaxe, tudo desenhado em SVG/CSS
 * puro. O movimento vive nas classes `.wave-band`/`.wave-band--mid`/
 * `.wave-band--back` e nos `@keyframes` de `src/index.css`.
 *
 * Cada faixa de onda desenha o mesmo traçado duas vezes lado a lado dentro
 * do próprio `viewBox` (0-400 e 400-800): a animação translada de 0% a
 * -50%, então a metade do ladrilho duplicado é visualmente idêntica ao
 * início e o loop nunca mostra costura.
 *
 * Componente puro de renderização — sem estado, sem efeitos, decorativo e
 * escondido de tecnologia assistiva.
 */
export function SeaWaves() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {/* plano do mar — a aresta superior é a linha reta do horizonte e
          cobre fisicamente a porção inferior do disco solar */}
      <div className="absolute inset-x-0 bottom-0 top-[72%] bg-horizon-sea sm:top-[69%]" />
      <div className="absolute inset-x-0 top-[72%] h-[3px] -translate-y-1/2 bg-horizon-plum sm:top-[69%]" />

      {/* faixa de trás — mais distante, menos opaca, a mais devagar */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band wave-band--back absolute inset-x-0 bottom-[44px] h-[clamp(220px,30vh,320px)] w-[200%] opacity-40"
      >
        <path
          d="M0,30 C50,15 100,15 150,30 C200,45 250,45 300,30 C350,15 400,15 400,30 C450,45 500,45 550,30 C600,15 650,15 700,30 C750,45 800,45 800,30 L800,120 L0,120 Z"
          fill="var(--color-plum)"
        />
      </svg>

      {/* faixa do meio — profundidade intermediária */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band wave-band--mid absolute inset-x-0 bottom-[22px] h-[clamp(210px,28vh,300px)] w-[200%] opacity-65"
      >
        <path
          d="M0,45 C50,10 100,10 150,45 C200,80 250,80 300,45 C350,10 400,10 400,45 C450,80 500,80 550,45 C600,10 650,10 700,45 C750,80 800,80 800,45 L800,120 L0,120 Z"
          fill="var(--color-sea)"
        />
      </svg>

      {/* faixa da frente — mais próxima, mais opaca, a mais rápida */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band absolute inset-x-0 bottom-0 h-[clamp(200px,26vh,280px)] w-[200%] opacity-95"
      >
        <path
          d="M0,60 C50,35 100,35 150,60 C200,85 250,85 300,60 C350,35 400,35 400,60 C450,85 500,85 550,60 C600,35 650,35 700,60 C750,85 800,85 800,60 L800,120 L0,120 Z"
          fill="var(--color-sea)"
        />
      </svg>

    </div>
  )
}

export default SeaWaves

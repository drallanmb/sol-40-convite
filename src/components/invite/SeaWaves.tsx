/**
 * Mar animado do hero (D-08) — três faixas de onda em paralaxe mais um
 * caminho de luz dourada cintilante, tudo desenhado em SVG/CSS puro (sem
 * vídeo, sem biblioteca de animação, per CONTEXT.md). O movimento inteiro
 * vive nas classes `.wave-band`/`.wave-band--mid`/`.wave-band--back`/
 * `.golden-light` e nos `@keyframes` correspondentes em `src/index.css` —
 * este componente só aplica os nomes de classe.
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
      {/* faixa de trás — mais distante, menos opaca, a mais devagar */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band wave-band--back absolute inset-x-0 bottom-[28px] h-[140px] w-[200%] opacity-35"
      >
        <path
          d="M0,30 C50,15 100,15 150,30 C200,45 250,45 300,30 C350,15 400,15 400,30 C450,45 500,45 550,30 C600,15 650,15 700,30 C750,45 800,45 800,30 L800,120 L0,120 Z"
          fill="#35192a"
        />
      </svg>

      {/* faixa do meio — profundidade intermediária */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band wave-band--mid absolute inset-x-0 bottom-[14px] h-[140px] w-[200%] opacity-60"
      >
        <path
          d="M0,45 C50,10 100,10 150,45 C200,80 250,80 300,45 C350,10 400,10 400,45 C450,80 500,80 550,45 C600,10 650,10 700,45 C750,80 800,80 800,45 L800,120 L0,120 Z"
          fill="#1f4650"
        />
      </svg>

      {/* faixa da frente — mais próxima, mais opaca, a mais rápida */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="wave-band absolute inset-x-0 bottom-0 h-[140px] w-[200%] opacity-90"
      >
        <path
          d="M0,60 C50,35 100,35 150,60 C200,85 250,85 300,60 C350,35 400,35 400,60 C450,85 500,85 550,60 C600,35 650,35 700,60 C750,85 800,85 800,60 L800,120 L0,120 Z"
          fill="#1f4650"
        />
      </svg>

      {/* caminho de luz dourada — do sol até a base, trapézio suave (blur
          amacia as bordas em vez de um polígono de corte vivo), cintilando
          sobre as ondas */}
      <div
        className="golden-light absolute left-1/2 top-[54%] bottom-0 w-[46%] -translate-x-1/2"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,181,93,0.55), rgba(255,181,93,0) 82%)',
          clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)',
          filter: 'blur(22px)',
        }}
      />
    </div>
  )
}

export default SeaWaves

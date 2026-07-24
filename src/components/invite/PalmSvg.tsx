export type PalmSvgProps = {
  side: 'left' | 'right'
}

/**
 * Silhueta de palmeira redesenhada em SVG real (D-07) — substitui as seis
 * barras rotacionadas idênticas do CSS antigo (`.palm i:nth-child(n)` em
 * `globals.css`) por um tronco com curva em S e seis frondes com formato de
 * folha de verdade (nervura central visível, curvatura e comprimento
 * variados). Mesmo footprint do antigo: viewBox 360x600, `bottom:-130px`,
 * `left:-82px`/`right:-82px` espelhado.
 *
 * Os dois lados não são espelhos pixel-a-pixel um do outro: além do
 * `scale-x-[-1]` aplicado ao lado direito, a copa (ponto de origem das
 * frondes) e a curvatura de duas frondes divergem entre `left` e `right`,
 * então uma leitura atenta do hero não vê a mesma árvore duas vezes.
 *
 * Componente puro de renderização — sem estado, sem efeitos.
 */
export function PalmSvg({ side }: PalmSvgProps) {
  const positionClasses =
    side === 'left'
      ? 'left-[-64px] sm:left-[-72px] md:left-[-82px]'
      : 'right-[-64px] sm:right-[-72px] md:right-[-82px] scale-x-[-1]'

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 600"
      className={`pointer-events-none absolute bottom-[-82px] z-[2] h-[380px] w-[228px] drop-shadow-[0_12px_30px_rgba(18,15,22,0.2)] sm:bottom-[-108px] sm:h-[500px] sm:w-[300px] md:bottom-[-130px] md:h-[600px] md:w-[360px] ${positionClasses}`}
    >
      {side === 'left' ? (
        <>
          {/* tronco — curva em S, do solo até a copa */}
          <path
            d="M150 595 Q125 400 145 250 Q160 150 165 75"
            stroke="#291c25"
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
          />

          {/* fronde 1 — esquerda baixa, a mais caída */}
          <g>
            <path
              d="M165 75 C 90 95 20 130 -40 160 C 10 145 70 120 130 100 C 145 92 155 84 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 60 118 -40 160"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 2 — esquerda alta */}
          <g>
            <path
              d="M165 75 C 100 55 30 40 -10 40 C 30 55 90 65 140 68 C 150 70 158 72 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 70 48 -10 40"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 3 — topo, levemente à esquerda do centro */}
          <g>
            <path
              d="M165 75 C 145 30 115 -10 90 -30 C 105 15 125 45 148 62 C 155 67 160 71 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 120 15 90 -30"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 4 — topo direita */}
          <g>
            <path
              d="M165 75 C 190 30 215 -5 230 -10 C 218 25 202 50 182 65 C 175 69 170 72 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 205 20 230 -10"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 5 — direita alta */}
          <g>
            <path
              d="M165 75 C 210 55 265 55 300 90 C 260 78 220 75 185 78 C 178 79 171 77 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 235 65 300 90"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 6 — direita baixa, a mais longa e caída */}
          <g>
            <path
              d="M165 75 C 205 100 245 145 270 200 C 235 170 200 140 175 110 C 170 100 167 87 165 75 Z"
              fill="#291c25"
            />
            <path
              d="M165 75 Q 220 130 270 200"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : (
        <>
          {/* tronco — curva em S com inclinação diferente do lado esquerdo */}
          <path
            d="M150 595 Q170 400 150 250 Q145 150 160 78"
            stroke="#291c25"
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
          />

          {/* fronde 1 — esquerda baixa, a mais caída */}
          <g>
            <path
              d="M160 78 C 85 98 15 133 -35 165 C 15 148 65 123 125 103 C 140 95 150 87 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 55 121 -35 165"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 2 — esquerda alta, com mais caimento que a equivalente do lado esquerdo */}
          <g>
            <path
              d="M160 78 C 95 62 25 50 -20 55 C 25 65 85 72 135 74 C 145 76 153 77 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 65 55 -20 55"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 3 — topo, levemente à esquerda do centro */}
          <g>
            <path
              d="M160 78 C 140 35 112 -5 85 -25 C 100 18 120 47 143 64 C 150 69 156 73 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 115 18 85 -25"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 4 — topo direita */}
          <g>
            <path
              d="M160 78 C 185 33 210 0 225 -5 C 213 28 197 52 178 67 C 172 71 166 74 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 200 24 225 -5"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 5 — direita alta, curvatura e comprimento diferentes da equivalente do lado esquerdo */}
          <g>
            <path
              d="M160 78 C 208 58 268 62 310 105 C 265 90 220 84 182 82 C 174 81 167 79 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 240 72 310 105"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* fronde 6 — direita baixa, a mais longa e caída */}
          <g>
            <path
              d="M160 78 C 200 103 240 148 265 205 C 232 174 198 145 173 115 C 168 104 164 91 160 78 Z"
              fill="#291c25"
            />
            <path
              d="M160 78 Q 213 133 265 205"
              stroke="#4a3241"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </>
      )}
    </svg>
  )
}

export default PalmSvg

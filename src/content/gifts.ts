import type { NavLink } from './event'
import type { WineCategory } from '../../convex/wineModel'

export const GIFTS_COPY = {
  page: {
    kicker: 'SUGESTÕES DE PRESENTE',
    headingLead: 'Um carinho para abrir ',
    headingEmphasis: 'sem pressa.',
    support:
      'Explore as 38 garrafas escolhidas pela Sol, compare as faixas de valor e veja quais ainda estão disponíveis.',
    operationalNote:
      'Escolha um rótulo e fale com a Vanessa pelo WhatsApp para combinar pagamento e entrega. O clique não reserva o vinho; o status muda depois que a compra for confirmada pelos donos.',
  },
  shortcutsLabel: 'Escolha por faixa de valor',
  available: 'Disponível',
  gifted: 'Já escolhido com carinho',
  productCode: (code: string) => `Cód. Mistral ${code}`,
  primaryCta: 'Presentear pelo WhatsApp',
  externalLinkSuffix: 'Abre o WhatsApp em uma nova aba.',
  selected: 'Rótulo selecionado',
  loading: 'Carregando a carta de vinhos…',
  empty: {
    heading: 'A carta ainda está sendo preparada.',
    body: 'Os rótulos vão aparecer aqui em breve. Tente novamente daqui a pouco.',
    band: 'Nenhum rótulo desta faixa está disponível no catálogo agora.',
  },
  error:
    'Não foi possível carregar a carta agora. Confira sua conexão e tente novamente.',
  partial:
    'Alguns rótulos não puderam ser exibidos agora. Os demais continuam disponíveis abaixo.',
  retry: 'Tentar novamente',
  image: {
    development: 'Imagem em preparação',
    failure: 'Foto temporariamente indisponível',
  },
} as const

export type GiftBand = {
  category: WineCategory
  id: string
  eyebrow: string
  heading: string
}

export const GIFT_BANDS: readonly GiftBand[] = [
  {
    category: 'ate-200',
    id: 'faixa-ate-200',
    eyebrow: 'PARA COMEÇAR',
    heading: 'Abaixo de R$ 200',
  },
  {
    category: '200-350',
    id: 'faixa-200-350',
    eyebrow: 'ESCOLHAS ESPECIAIS',
    heading: 'De R$ 200 a R$ 350',
  },
  {
    category: '350-500',
    id: 'faixa-350-500',
    eyebrow: 'GRANDES RÓTULOS',
    heading: 'De R$ 350 a R$ 500',
  },
] as const

export const GIFTS_NAV_LINKS: NavLink[] = [
  { label: 'Convite', href: '/' },
  { label: 'Confirmar presença', href: '/confirmar' },
  { label: 'Programação', href: '/#programacao' },
  { label: 'Local', href: '/#aracaju' },
]

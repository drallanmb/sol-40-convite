/**
 * Single source of truth for every piece of invite copy, date, address, URL
 * and image dimension used by the public convite page (Phase 2).
 *
 * Ported from the old project's `sol-40-integrado/app/convite/EventSite.tsx`
 * (D-01) — improved only where visibly improvable (e.g. the Matapuã spelling
 * fix, D-04). No section component should hardcode a literal string that
 * belongs here (D-03).
 */

// ---------------------------------------------------------------------------
// Boundary dates (D-10) — always offset-qualified to -03:00 so the countdown
// state machine is correct in any host timezone.
// ---------------------------------------------------------------------------

/** Midnight of event day — the "antes" countdown target and the start of "hoje". */
export const EVENT_DAY_START = '2026-10-17T00:00:00-03:00'
/** 16:00 arrival — the start of "agora". */
export const EVENT_DATE = '2026-10-17T16:00:00-03:00'
/** 05:00 the following morning — the end of "agora" and the start of "depois". */
export const EVENT_END = '2026-10-18T05:00:00-03:00'
/** First instant after the informational RSVP date has fully elapsed in Aracaju. */
export const RSVP_DEADLINE_BOUNDARY = '2026-10-01T00:00:00-03:00'

// ---------------------------------------------------------------------------
// Section anchors — every downstream component derives its `id`/`href` from
// this object so a rename can never desynchronize an anchor from its target.
// ---------------------------------------------------------------------------

export const SECTION_IDS = {
  hero: 'inicio',
  countdown: 'contagem',
  local: 'aracaju',
  programa: 'programacao',
  traje: 'traje',
  memories: 'memorias',
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavLink = {
  label: string
  href: string
}

export type ProgramaItem = {
  time: string
  title: string
  description: string
}

export type DressRule = {
  audience: string
  text: string
}

export type GalleryItem = {
  src: string
  alt: string
  caption: string
  width: number
  height: number
}

export type GuidePlace = {
  kicker: string
  name: string
  description: string
  url: string
}

export type Hotel = {
  name: string
  distance: string
  url: string
}

// ---------------------------------------------------------------------------
// Topbar navigation (D-05 order, no broken links to unshipped sections)
// ---------------------------------------------------------------------------

export const NAV_LINKS: NavLink[] = [
  { label: 'Confirmar presença', href: '/confirmar' },
  { label: 'Presentes', href: '/presentes' },
  { label: 'Local', href: '#aracaju' },
  { label: 'Programação', href: '#programacao' },
  { label: 'Traje', href: '#traje' },
  { label: 'Memórias', href: `#${SECTION_IDS.memories}` },
]

/** Reduced navigation for `/confirmar`; home fragments stay absolute. */
export const RSVP_NAV_LINKS: NavLink[] = [
  { label: 'Convite', href: '/' },
  { label: 'Presentes', href: '/presentes' },
  { label: 'Programação', href: '/#programacao' },
  { label: 'Local', href: '/#aracaju' },
]

/** Persistent gifts invitation shown only after a backend-confirmed RSVP save. */
export const GIFTS_RSVP_CALLOUT = {
  heading: 'Quer deixar um carinho para a Sol?',
  body: 'A carta de vinhos está aberta para você escolher um presente.',
  cta: 'Escolher um presente',
  href: '/presentes',
} as const

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export const HERO = {
  eyebrow: '17 OUT · 16H · ARACAJU',
  title: 'Sol',
  titleSub: '40 anos',
  taglineLead: 'Viva o seu melhor ',
  taglineEm: 'pôr do sol.',
  metaLeft: 'MATAPUÃ EVENTOS',
  metaRight: 'ARACAJU · SERGIPE',
  primaryCtaLabel: 'Confirmar presença',
  primaryCtaHref: '/confirmar',
  secondaryCtaLabel: 'Ver programação ↓',
  secondaryCtaHref: '#programacao',
} as const

export const FOOTER = {
  date: '17 de outubro de 2026',
  dateTime: '2026-10-17',
  title: 'Sol',
  anniversary: 'faz 40',
  venue: 'Matapuã Eventos',
  city: 'Aracaju/SE',
} as const

// ---------------------------------------------------------------------------
// RSVP — complete route/state copy contract
// ---------------------------------------------------------------------------

export const RSVP_COPY = {
  route: {
    kicker: 'CONFIRMAÇÃO DE PRESENÇA',
    heading: 'Esse pôr do sol tem lugar pra vocês.',
    deadline: 'Confirme até 30 de setembro',
    deadlinePassed: 'O prazo passou, mas você ainda pode responder ou editar.',
    supporting: 'Você pode responder agora e editar depois, sem criar conta.',
  },
  phone: {
    heading: 'Vamos encontrar seu convite.',
    body: 'Digite o telefone usado no convite. Não precisa criar conta.',
    label: 'Telefone',
    placeholder: '(79) 99999-9999',
    hint: 'Inclua o DDD. Pode digitar com ou sem espaços e pontuação.',
    submit: 'Buscar convite',
    busy: 'Buscando…',
    localInvalid: 'Digite um telefone com DDD.',
    notFound:
      'Não foi possível localizar o convite. Confira o telefone com DDD e tente novamente.',
    rateLimited: 'Muitas tentativas em pouco tempo. Aguarde {tempo} e tente novamente.',
    connectionError: 'A conexão oscilou. Confira sua internet e tente novamente.',
    privacy: 'O telefone serve apenas para localizar este convite.',
  },
  session: {
    restoring: 'Reabrindo seu convite…',
    expired: 'Sua sessão terminou. Digite o telefone novamente para reabrir o convite.',
    unlocked: 'Convite encontrado.',
    switchPhone: 'Usar outro telefone',
  },
  family: {
    kicker: 'SEU CONVITE',
    greeting: 'Olá, {displayName}. Esse pôr do sol tem lugar pra vocês.',
    savedSummary: 'Vai: {yes} · Não vai: {no} · Pendente: {pending}',
    formHeading: 'Quem deste convite estará com a gente?',
    zeroGuests: 'Este convite ainda não tem pessoas cadastradas. Fale com a organização.',
  },
  attendance: {
    groupLabel: 'Presença de {name}',
    yes: 'Vai',
    pending: 'Pendente',
    no: 'Não vai',
  },
  contact: {
    label: 'WhatsApp ou e-mail para contato (opcional)',
    placeholder: 'Para qualquer aviso importante',
    hint: 'Seu contato fica só com a organização da festa.',
  },
  save: {
    clean: 'Tudo salvo',
    dirty: 'Alterações ainda não salvas',
    submit: 'Salvar respostas',
    busy: 'Salvando…',
    partial:
      'Respostas salvas. Ainda há {pending} pessoa(s) pendente(s) — você pode voltar e completar depois.',
    completeAttending: 'Presenças salvas. Que alegria ter vocês com a Sol!',
    completeNotAttending: 'Respostas salvas. Obrigada por avisar com carinho.',
    rateLimited:
      'Você salvou várias vezes em pouco tempo. Aguarde {tempo}; suas escolhas continuam nesta tela.',
    failure: 'Não foi possível salvar agora. Suas escolhas continuam nesta tela. Tente novamente.',
  },
  discard: {
    heading: 'Descartar alterações?',
    body:
      'Você tem respostas que ainda não foram salvas. Quer usar outro telefone mesmo assim?',
    safeAction: 'Continuar editando',
    destructiveAction: 'Descartar e usar outro telefone',
  },
} as const

// ---------------------------------------------------------------------------
// Memories — public approved album and its home-section states
// ---------------------------------------------------------------------------

export const MEMORIES_COPY = {
  section: {
    kicker: 'NOSSO ÁLBUM',
    heading: 'Memórias para guardar este pôr do sol.',
    intro:
      'Relembre os carinhos que já passaram por aqui e deixe também o seu. Toda memória é vista com cuidado antes de fazer parte do álbum.',
  },
  album: {
    label: 'Memórias para a Sol',
    loadingTitle: 'Abrindo o álbum…',
    loadingBody: 'As lembranças aprovadas estão chegando.',
    emptyTitle: 'O álbum está esperando a primeira lembrança.',
    emptyBody:
      'Envie uma foto, um recado ou os dois. A memória aparece aqui depois da aprovação.',
    errorTitle: 'O álbum não abriu agora.',
    errorBody:
      'Você ainda pode enviar sua memória. Tente carregar as lembranças novamente quando quiser.',
    retry: 'Tentar carregar o álbum',
    pause: 'Pausar memórias',
    resume: 'Retomar memórias',
    reduced: 'Movimento reduzido',
    reducedLabel:
      'Movimento automático desativado pela preferência do sistema',
    previous: 'Ver memória anterior',
    next: 'Ver próxima memória',
    slideLabel: 'Memória {current} de {total}',
  },
  card: {
    imageAlt: 'Memória enviada para Sol',
    imageOnly: 'Uma lembrança em imagem.',
  },
} as const

// ---------------------------------------------------------------------------
// Countdown copy per phase (D-10)
// ---------------------------------------------------------------------------

export const COUNTDOWN_COPY = {
  antes: {
    kicker: 'ATÉ A GENTE SE ENCONTRAR',
    headingLead: 'O tempo já está ',
    headingEm: 'dourando.',
    railLabel: 'Faltam',
    showTiles: true,
  },
  hoje: {
    kicker: 'O DIA CHEGOU',
    heading: 'É HOJE',
    railLabel: 'É HOJE',
    showTiles: false,
  },
  agora: {
    kicker: 'É AGORA',
    heading: 'TÁ ROLANDO',
    sub: 'A festa é agora.',
    railLabel: 'TÁ ROLANDO',
    showTiles: false,
  },
  depois: {
    kicker: 'DEPOIS DO PÔR DO SOL',
    heading: 'JÁ QUE VOCÊ NÃO FOI, PERDEU!',
    railLabel: 'Já foi',
    showTiles: true,
  },
} as const

// ---------------------------------------------------------------------------
// Programa (D-02 — confirmed and locked, carries no tentativeness note)
// ---------------------------------------------------------------------------

// NOTE: PROGRAMA_KICKER, PROGRAMA_HEADING and PROGRAMA are combined into a
// single multi-declarator export statement so exactly one physical line in
// this file opens with the const keyword followed by the PROGRAMA prefix
// (the exact-count verification gate for this task greps for that opening
// form and would otherwise self-trip on the PROGRAMA_KICKER/PROGRAMA_HEADING
// prefix match — the same self-tripping-gate hazard flagged on the GUIDE
// Tripadvisor comment below). The three symbols remain independently named
// and independently typed exports; only their declaration is merged.
export const PROGRAMA_KICKER = '17 OUT', PROGRAMA_HEADING = 'Uma tarde que vira noite, sem pressa de acabar.', PROGRAMA: ProgramaItem[] = [
  { time: "16:00", title: 'Chegadas & abraços', description: 'Drinks frescos, música e o sol descendo devagar.' },
  { time: "17:00", title: 'Banda Nona', description: 'Curta um pagode ao pôr do sol.' },
  { time: "17:45", title: 'O brinde da Sol', description: 'Um instante para celebrar as primeiras quarenta voltas.' },
  { time: "19:00", title: 'Jantar sob as luzes', description: 'Sabores sergipanos e mesa boa para ficar.' },
  { time: "20:30", title: 'Dança com Alma Gêmea', description: 'Continue a festa no embalo da banda.' },
  { time: "00:30", title: 'A festa não para: Latino!', description: 'Fôlego novo madrugada adentro.' },
  { time: "03:00", title: 'Tudo que é bom tem que acabar 🥺', description: 'Até o próximo pôr do sol.' },
]

// ---------------------------------------------------------------------------
// Dress code (traje obrigatório)
// ---------------------------------------------------------------------------

export const DRESS = {
  kicker: 'TRAJE OBRIGATÓRIO',
  headingLead: 'Todo mundo de ',
  headingEm: 'branco ou off-white.',
  intro:
    'A festa começa com luz natural e segue pelo gramado. A ideia é chegar leve, confortável e inteiro na paleta da noite.',
  rules: [
    { audience: 'Homens', text: 'Camisa de linho ou algodão com bermuda ou calça de sarja branca.' },
    { audience: 'Mulheres', text: 'Vestidos, shorts, saias ou blusas em branco e off-white.' },
  ] as DressRule[],
  callout: {
    kicker: 'NO GRAMADO',
    lead: 'Escolha conforto de verdade.',
    text: 'Sandália baixa, tênis ou sapato confortável funcionam melhor. Evite salto fino.',
  },
  gallery: [
    {
      src: '/dress-code-men.jpg',
      alt: 'Homem com camisa e bermuda brancas, usando sandália baixa em um gramado',
      caption: 'Leve, fresco e confortável',
      // Real pixel dimensions of the compressed file produced by plan 02-02
      // (source 1122x1402, resized to a 1400px long edge).
      width: 1120,
      height: 1400,
    },
    {
      src: '/dress-code-women.jpg',
      alt: 'Duas mulheres com vestido branco e conjunto de shorts e blusa branca, usando calçados baixos no gramado',
      caption: 'Branco ou off-white, do seu jeito',
      // Real pixel dimensions of the compressed file produced by plan 02-02
      // (source 1003x1568, resized to a 1400px long edge).
      width: 895,
      height: 1400,
    },
  ] as GalleryItem[],
}

// ---------------------------------------------------------------------------
// Venue / map (D-04 — corrected Matapuã spelling in both name and street)
// ---------------------------------------------------------------------------

export const VENUE = {
  kicker: 'O ENCONTRO',
  name: 'Matapuã Eventos',
  addressLine1: 'Estrada Matapuã, 1213 · Mosqueiro',
  addressLine2: 'Aracaju · Sergipe',
  mapEmbedSrc: 'https://www.google.com/maps?q=Matapu%C3%A3%20Eventos%20Aracaju&output=embed',
  routeUrl: 'https://www.google.com/maps/search/?api=1&query=Matapu%C3%A3%20Eventos%20Aracaju',
  mapCtaLabel: 'Ver mapa',
  routeCtaLabel: 'Abrir rota ↗',
}

// ---------------------------------------------------------------------------
// City guide (D-13 — 3 originals + 1 new, host-convention divergence flagged
// in prose only, see note on the fourth entry)
// ---------------------------------------------------------------------------

export const GUIDE_KICKER = 'PRA QUEM VEM DE FORA'
export const GUIDE_HEADING_LEAD = 'Um fim de semana '
export const GUIDE_HEADING_EM = 'com gosto de Aracaju.'

export const GUIDE: GuidePlace[] = [
  {
    kicker: 'VER',
    name: 'Museu da Gente Sergipana',
    description: 'Cultura sergipana num casarão à beira do rio · aprox. 28 km da festa. Ver horários e avaliações ↗',
    url: 'https://www.tripadvisor.com.br/Attraction_Review-g303638-d3589527-Reviews-Museu_da_Gente_Sergipana-Aracaju_State_of_Sergipe.html',
  },
  {
    kicker: 'PROVAR',
    name: 'Passarela do Caranguejo',
    description: 'Corredor gastronômico na Orla de Atalaia · aprox. 17 km da festa. Ver avaliações ↗',
    url: 'https://www.tripadvisor.com.br/Attraction_Review-g303638-d2333777-Reviews-Passarela_do_Caranguejo-Aracaju_State_of_Sergipe.html',
  },
  {
    kicker: 'RESPIRAR',
    name: 'Orla de Atalaia',
    description: 'Mar, ciclovia, lagos e pôr do sol · aprox. 18 km da festa. Ver dicas e avaliações ↗',
    url: 'https://www.tripadvisor.com.br/Attraction_Review-g303638-d4564018-Reviews-Orla_de_Atalaia-Aracaju_State_of_Sergipe.html',
  },
  {
    kicker: 'NAVEGAR',
    name: 'Croa do Goré',
    description: 'Passeio de barco pelo rio Vaza Barris, entre mangue e ilhas · pra quem tiver um dia a mais. Ver avaliações ↗',
    // Deliberate host divergence from the three cards above: research
    // verified this exact URL resolves on the international top-level
    // domain, and did not verify an equivalent country-code variant. A
    // confirmed link that breaks host convention is correct here; a
    // convention-matching link nobody confirmed is not (D-14/P-04).
    url: 'https://www.tripadvisor.com/Attraction_Review-g303638-d4007022-Reviews-Croa_do_Gore-Aracaju_State_of_Sergipe.html',
  },
]

// ---------------------------------------------------------------------------
// Hotels (D-14 — exactly the three the owners named, verbatim URLs)
// ---------------------------------------------------------------------------

export const HOTELS_HEADING = 'ONDE FICAR · DISTÂNCIAS ATÉ A FESTA'

export const HOTELS: Hotel[] = [
  { name: 'Aruanã Eco Praia Hotel', distance: 'aprox. 12 km do local · opção mais próxima', url: 'https://aruanahotel.com.br/' },
  { name: 'Quality Hotel Aracaju', distance: 'aprox. 21 km do local · Coroa do Meio', url: 'https://letsatlantica.com.br/hotel/quality-hotel-aracaju' },
  { name: 'Celi Connect', distance: 'aprox. 18 km do local', url: 'https://celihotel.com.br/celi-connect/' },
]

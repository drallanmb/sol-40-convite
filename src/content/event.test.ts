import { describe, expect, it } from 'vitest'
import { buttonClassName } from '../components/ui/Button'
import buttonSource from '../components/ui/Button.tsx?raw'
import fieldSource from '../components/ui/Field.tsx?raw'
import heroSource from '../components/invite/Hero.tsx?raw'
import memoriesSectionSource from '../components/memories/MemoriesSection.tsx?raw'
import shellSource from '../components/layout/Shell.tsx?raw'
import homeSource from '../routes/Home.tsx?raw'
import rsvpClockSource from '../lib/rsvpClock.ts?raw'
import rsvpDraftSource from '../lib/rsvpDraft.ts?raw'
import rsvpSessionSource from '../lib/rsvpSession.ts?raw'
import * as eventContent from './event'
import eventSource from './event.ts?raw'
import {
  DRESS,
  EVENT_DATE,
  EVENT_DAY_START,
  EVENT_END,
  GUIDE,
  HERO,
  HOTELS,
  MEMORIES_COPY,
  NAV_LINKS,
  PROGRAMA,
  SECTION_IDS,
  VENUE,
} from './event'

type RsvpCopyContract = {
  route: {
    kicker: string
    heading: string
    deadline: string
    deadlinePassed: string
    supporting: string
  }
  phone: {
    heading: string
    body: string
    label: string
    placeholder: string
    hint: string
    submit: string
    busy: string
    localInvalid: string
    notFound: string
    rateLimited: string
    connectionError: string
    privacy: string
  }
  session: {
    restoring: string
    expired: string
    unlocked: string
    switchPhone: string
  }
  family: {
    kicker: string
    greeting: string
    savedSummary: string
    formHeading: string
    zeroGuests: string
  }
  attendance: {
    groupLabel: string
    yes: string
    pending: string
    no: string
  }
  contact: {
    label: string
    placeholder: string
    hint: string
  }
  save: {
    clean: string
    dirty: string
    submit: string
    busy: string
    partial: string
    completeAttending: string
    completeNotAttending: string
    rateLimited: string
    failure: string
  }
  discard: {
    heading: string
    body: string
    safeAction: string
    destructiveAction: string
  }
}

const RSVP_COPY = Reflect.get(eventContent, 'RSVP_COPY') as RsvpCopyContract | undefined
const RSVP_NAV_LINKS = Reflect.get(eventContent, 'RSVP_NAV_LINKS') as
  | Array<{ label: string; href: string }>
  | undefined
const GIFTS_RSVP_CALLOUT = Reflect.get(eventContent, 'GIFTS_RSVP_CALLOUT') as
  | {
      heading: string
      body: string
      cta: string
      href: string
    }
  | undefined
const RSVP_DEADLINE_BOUNDARY = Reflect.get(eventContent, 'RSVP_DEADLINE_BOUNDARY') as
  | string
  | undefined

function flattenCopy(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(flattenCopy)
}

const RSVP_SURFACE_SOURCES = [
  eventSource,
  heroSource,
  shellSource,
  buttonSource,
  fieldSource,
  rsvpDraftSource,
  rsvpSessionSource,
  rsvpClockSource,
] as const

describe('event content — PROGRAMA', () => {
  it('has exactly 7 blocks in the locked order', () => {
    expect(PROGRAMA).toHaveLength(7)
    expect(PROGRAMA.map((item) => item.time)).toEqual([
      '16:00',
      '17:00',
      '17:45',
      '19:00',
      '20:30',
      '00:30',
      '03:00',
    ])
  })
})

describe('event content — GUIDE', () => {
  it('has exactly 4 cards, every url starting with https://', () => {
    expect(GUIDE).toHaveLength(4)
    for (const place of GUIDE) {
      expect(place.url.startsWith('https://')).toBe(true)
    }
  })
})

describe('event content — HOTELS', () => {
  it('has exactly 3 hotels, every url starting with https://', () => {
    expect(HOTELS).toHaveLength(3)
    for (const hotel of HOTELS) {
      expect(hotel.url.startsWith('https://')).toBe(true)
    }
  })
})

describe('event content — NAV_LINKS', () => {
  it('prepends the RSVP route and preserves the existing home-section order', () => {
    expect(NAV_LINKS.map((link) => [link.label, link.href])).toEqual([
      ['Confirmar presença', '/confirmar'],
      ['Presentes', '/presentes'],
      ['Local', '#aracaju'],
      ['Programação', '#programacao'],
      ['Traje', '#traje'],
      ['Memórias', '#memorias'],
    ])
  })

  it('derives the memory navigation target from the canonical section ID', () => {
    expect(SECTION_IDS.memories).toBe('memorias')
    expect(NAV_LINKS.at(-1)).toEqual({
      label: 'Memórias',
      href: `#${SECTION_IDS.memories}`,
    })
  })

  it('uses absolute home targets in the reduced RSVP navigation', () => {
    expect(RSVP_NAV_LINKS?.map((link) => [link.label, link.href])).toEqual([
      ['Convite', '/'],
      ['Presentes', '/presentes'],
      ['Programação', '/#programacao'],
      ['Local', '/#aracaju'],
    ])
  })

  it('centralizes the post-save gifts callout with the approved route copy', () => {
    expect(GIFTS_RSVP_CALLOUT).toEqual({
      heading: 'Quer deixar um carinho para a Sol?',
      body: 'A carta de vinhos está aberta para você escolher um presente.',
      cta: 'Escolher um presente',
      href: '/presentes',
    })
  })
})

describe('event content — memories integration', () => {
  it('locks the approved-album copy without implying automatic publication', () => {
    expect(MEMORIES_COPY.section).toEqual({
      kicker: 'NOSSO ÁLBUM',
      heading: 'Memórias para guardar este pôr do sol.',
      intro:
        'Relembre os carinhos que já passaram por aqui e deixe também o seu. Toda memória é vista com cuidado antes de fazer parte do álbum.',
    })
    expect(MEMORIES_COPY.album.emptyBody).toContain(
      'depois da aprovação',
    )
    expect(MEMORIES_COPY.album.pause).toBe('Pausar memórias')
    expect(MEMORIES_COPY.album.resume).toBe('Retomar memórias')
  })

  it('mounts one anchorable memory section immediately after dress code', () => {
    expect(homeSource.match(/<MemoriesSection \/>/gu)).toHaveLength(1)
    expect(homeSource.indexOf('<DressCodeSection />')).toBeLessThan(
      homeSource.indexOf('<MemoriesSection />'),
    )
    expect(memoriesSectionSource).toContain('id={SECTION_IDS.memories}')
    expect(memoriesSectionSource.indexOf('<ApprovedAlbum />')).toBeLessThan(
      memoriesSectionSource.indexOf('<MemoryForm />'),
    )
  })
})

describe('event content — RSVP entry and deadline', () => {
  it('locks the hero primary route action and secondary fragment action', () => {
    expect(HERO).toMatchObject({
      primaryCtaLabel: 'Confirmar presença',
      primaryCtaHref: '/confirmar',
      secondaryCtaLabel: 'Ver programação ↓',
      secondaryCtaHref: '#programacao',
    })
  })

  it('uses the first instant after 30 September with an explicit event offset', () => {
    expect(RSVP_DEADLINE_BOUNDARY).toBe('2026-10-01T00:00:00-03:00')
  })
})

describe('event content — approved RSVP copy', () => {
  it('centralizes the complete locked copy matrix', () => {
    expect(RSVP_COPY).toEqual({
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
        failure:
          'Não foi possível salvar agora. Suas escolhas continuam nesta tela. Tente novamente.',
      },
      discard: {
        heading: 'Descartar alterações?',
        body:
          'Você tem respostas que ainda não foram salvas. Quer usar outro telefone mesmo assim?',
        safeAction: 'Continuar editando',
        destructiveAction: 'Descartar e usar outro telefone',
      },
    })
  })

  it('contains only the two approved negative account assurances', () => {
    const copy = flattenCopy(RSVP_COPY)
    const negativeAssurances = copy.filter((value) => /criar conta/i.test(value))

    expect(negativeAssurances).toEqual([
      'Você pode responder agora e editar depois, sem criar conta.',
      'Digite o telefone usado no convite. Não precisa criar conta.',
    ])

    const surfaceSource = RSVP_SURFACE_SOURCES.join('\n')
    const withoutApprovedAssurances = surfaceSource
      .replaceAll('sem criar conta', '')
      .replaceAll('Não precisa criar conta', '')

    expect(withoutApprovedAssurances).not.toMatch(
      /\b(account|cadastro|cadastrar|cadastre|conta|entrar|login|password|senha|sign-?up|administrador|admin)\b/i,
    )
    expect(withoutApprovedAssurances).not.toMatch(
      /\/(?:account|admin|cadastro|login|register|sign-?up)\b/i,
    )
  })
})

describe('RSVP primitive contracts', () => {
  it('uses important 3px sea focus declarations that win over the global shorthand', () => {
    const classes = buttonClassName('rsvp').split(/\s+/)

    expect(classes).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-[3px]!',
        'focus-visible:outline-sea!',
        'focus-visible:outline-offset-[3px]!',
      ]),
    )
  })

  it('uses a solid AA placeholder color instead of inherited half-opacity ink', () => {
    expect(fieldSource).toContain('placeholder:text-wine')
  })
})

describe('event content — legacy navigation shape removed', () => {
  it('does not regress to the three-link home navigation', () => {
    expect(NAV_LINKS).toHaveLength(6)
    expect(NAV_LINKS.map((link) => link.href)).toEqual([
      '/confirmar',
      '/presentes',
      '#aracaju',
      '#programacao',
      '#traje',
      '#memorias',
    ])
  })
})

describe('event content — DRESS.gallery', () => {
  it('has exactly 2 figures, each with non-empty alt and positive dimensions', () => {
    expect(DRESS.gallery).toHaveLength(2)
    for (const figure of DRESS.gallery) {
      expect(figure.alt.length).toBeGreaterThan(0)
      expect(figure.width).toBeGreaterThan(0)
      expect(figure.height).toBeGreaterThan(0)
    }
  })
})

describe('event content — boundary dates', () => {
  it('every boundary string carries the -03:00 offset suffix', () => {
    expect(EVENT_DAY_START.endsWith('-03:00')).toBe(true)
    expect(EVENT_DATE.endsWith('-03:00')).toBe(true)
    expect(EVENT_END.endsWith('-03:00')).toBe(true)
  })

  it('resolves to strictly increasing instants: DAY_START < DATE < END', () => {
    const dayStart = new Date(EVENT_DAY_START).getTime()
    const date = new Date(EVENT_DATE).getTime()
    const end = new Date(EVENT_END).getTime()
    expect(dayStart).toBeLessThan(date)
    expect(date).toBeLessThan(end)
  })
})

describe('event content — spelling', () => {
  it('never contains the old project misspelled street variant', () => {
    // Built from parts rather than a literal so this assertion string itself
    // does not trip the plan's `grep -rq` misspelling gate over src/.
    const misspelledVariant = ['Matap', 'oã'].join('')
    const source = JSON.stringify({ DRESS, GUIDE, HOTELS, NAV_LINKS, PROGRAMA, VENUE })
    expect(source).not.toContain(misspelledVariant)
  })
})

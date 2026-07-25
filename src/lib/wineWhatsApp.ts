import type { PublicWine } from '../../convex/wineModel'

type WineWhatsAppDetails = Pick<
  PublicWine,
  'name' | 'priceCents' | 'productCode'
>

const VANESSA_WHATSAPP_NUMBER = '5511993709046'
const VANESSA_WHATSAPP_BASE_URL = `https://wa.me/${VANESSA_WHATSAPP_NUMBER}`
const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(priceCents: number): string {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError('O preço em centavos deve ser um inteiro seguro não negativo.')
  }

  return BRL_FORMATTER.format(priceCents / 100)
}

export function buildWineWhatsAppMessage(
  wine: WineWhatsAppDetails,
): string {
  return `Olá, Vanessa! Vim pelo convite da festa Sol faz 40 e gostaria de presentear a Sol com o vinho ${wine.name} — cód. ${wine.productCode}, no valor de ${formatBRL(wine.priceCents)}. Pode me orientar sobre o pagamento e a entrega?`
}

export function buildWineWhatsAppUrl(wine: WineWhatsAppDetails): string {
  return `${VANESSA_WHATSAPP_BASE_URL}?text=${encodeURIComponent(buildWineWhatsAppMessage(wine))}`
}

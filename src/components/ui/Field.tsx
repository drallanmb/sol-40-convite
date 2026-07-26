import { forwardRef } from 'react'
import type { ForwardedRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

type FieldOwnProps = {
  label: string
  hint?: string
  id: string
  appearance?: 'underline' | 'outline'
  containerClassName?: string
}

export type FieldInputProps = FieldOwnProps & {
  multiline?: false
} & InputHTMLAttributes<HTMLInputElement>

export type FieldTextareaProps = FieldOwnProps & {
  multiline: true
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export type FieldProps = FieldInputProps | FieldTextareaProps

const controlBaseClasses =
  'w-full min-h-[44px] font-sans text-body text-ink placeholder:text-wine outline-none transition-[border-color,background-color,box-shadow] duration-(--duration-fast) ease-out focus:border-coral'

/**
 * Campo primitivo — label + input/textarea com borda inferior (foco vira
 * coral). Referência: `.field` do globals.css antigo. Discriminado por
 * `multiline` (input por padrão, textarea quando `multiline`).
 */
export const Field = forwardRef(function Field(
  props: FieldProps,
  ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>,
) {
  const {
    label,
    hint,
    id,
    multiline,
    appearance = 'underline',
    containerClassName = '',
    className = '',
    ...rest
  } = props
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy =
    [hintId, rest['aria-describedby']].filter(Boolean).join(' ') || undefined
  const appearanceClasses =
    appearance === 'outline'
      ? `${controlBaseClasses} rounded-lg border border-line bg-card px-3 py-3`
      : `${controlBaseClasses} border-0 border-b border-line bg-transparent px-0.5 py-3`

  return (
    <div className={`mb-[22px] grid gap-[9px] ${containerClassName}`.trim()}>
      <label htmlFor={id} className="text-small font-bold uppercase tracking-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          ref={ref as ForwardedRef<HTMLTextAreaElement>}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          aria-describedby={describedBy}
          className={`${appearanceClasses} min-h-[110px] resize-y leading-normal ${className}`.trim()}
        />
      ) : (
        <input
          ref={ref as ForwardedRef<HTMLInputElement>}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          aria-describedby={describedBy}
          className={`${appearanceClasses} ${className}`.trim()}
        />
      )}
      {hint ? (
        <small id={hintId} className="text-caption normal-case tracking-normal opacity-70">
          {hint}
        </small>
      ) : null}
    </div>
  )
})

export default Field

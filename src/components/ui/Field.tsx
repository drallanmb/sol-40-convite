import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

type FieldOwnProps = {
  label: string
  hint?: string
  id: string
}

export type FieldInputProps = FieldOwnProps & {
  multiline?: false
} & InputHTMLAttributes<HTMLInputElement>

export type FieldTextareaProps = FieldOwnProps & {
  multiline: true
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export type FieldProps = FieldInputProps | FieldTextareaProps

const controlClasses =
  'w-full min-h-[44px] border-0 border-b border-line bg-transparent px-0.5 py-3 font-sans text-body text-ink placeholder:text-wine outline-none focus:border-coral'

/**
 * Campo primitivo — label + input/textarea com borda inferior (foco vira
 * coral). Referência: `.field` do globals.css antigo. Discriminado por
 * `multiline` (input por padrão, textarea quando `multiline`).
 */
export function Field(props: FieldProps) {
  const { label, hint, id, multiline, className = '', ...rest } = props
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy =
    [hintId, rest['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div className="mb-[22px] grid gap-[9px]">
      <label htmlFor={id} className="text-small font-bold uppercase tracking-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          aria-describedby={describedBy}
          className={`${controlClasses} min-h-[110px] resize-y leading-normal ${className}`.trim()}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          aria-describedby={describedBy}
          className={`${controlClasses} ${className}`.trim()}
        />
      )}
      {hint ? (
        <small id={hintId} className="text-caption normal-case tracking-normal opacity-70">
          {hint}
        </small>
      ) : null}
    </div>
  )
}

export default Field

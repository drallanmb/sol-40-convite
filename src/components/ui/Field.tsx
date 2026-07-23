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
  'w-full min-h-[44px] border-0 border-b border-line bg-transparent px-0.5 py-3 font-sans text-body text-ink outline-none focus:border-coral'

/**
 * Campo primitivo — label + input/textarea com borda inferior (foco vira
 * coral). Referência: `.field` do globals.css antigo. Discriminado por
 * `multiline` (input por padrão, textarea quando `multiline`).
 */
export function Field(props: FieldProps) {
  const { label, hint, id, multiline, className = '', ...rest } = props

  return (
    <div className="mb-[22px] grid gap-[9px]">
      <label htmlFor={id} className="text-small font-bold uppercase tracking-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={`${controlClasses} min-h-[110px] resize-y leading-normal ${className}`.trim()}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          className={`${controlClasses} ${className}`.trim()}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint ? <small className="text-caption normal-case tracking-normal opacity-70">{hint}</small> : null}
    </div>
  )
}

export default Field

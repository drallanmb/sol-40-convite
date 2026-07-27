import { useId } from 'react'
import { RSVP_COPY } from '../../content/event'
import type { RsvpAttendance } from '../../lib/rsvpDraft'

export type AttendanceGroupProps = {
  name: string
  value: RsvpAttendance
  disabled?: boolean
  onChange: (attendance: RsvpAttendance) => void
}

const ATTENDANCE_OPTIONS: Array<{
  value: RsvpAttendance
  label: string
  selectedClasses: string
}> = [
  {
    value: 'yes',
    label: RSVP_COPY.attendance.yes,
    selectedClasses: 'border-rsvp-sim bg-rsvp-sim text-cream',
  },
  {
    value: 'pending',
    label: RSVP_COPY.attendance.pending,
    selectedClasses: 'border-rsvp-pendente bg-rsvp-pendente text-cream',
  },
  {
    value: 'no',
    label: RSVP_COPY.attendance.no,
    selectedClasses: 'border-rsvp-nao bg-rsvp-nao text-cream',
  },
]

function groupLabel(name: string) {
  return RSVP_COPY.attendance.groupLabel.replace('{name}', name)
}

export function AttendanceGroup({
  name,
  value,
  disabled = false,
  onChange,
}: AttendanceGroupProps) {
  const groupId = useId()

  return (
    <fieldset
      aria-label={groupLabel(name)}
      disabled={disabled}
      className="grid min-w-0 gap-4 border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)] md:items-center md:gap-6"
    >
      <legend className="min-w-0 break-words font-serif text-subheading leading-subheading text-plum md:float-left md:w-full">
        {name}
      </legend>

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        {ATTENDANCE_OPTIONS.map((option, index) => {
          const checked = value === option.value
          const optionId = `${groupId}-${index}`

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2 text-center font-sans text-small font-bold transition-[background-color,border-color,color] duration-(--duration-fast) ease-out min-[360px]:flex-col min-[360px]:gap-1 min-[360px]:px-1 min-[480px]:flex-row min-[480px]:gap-2 min-[480px]:px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-coral has-[:focus-visible]:outline-offset-[3px] motion-reduce:transition-none ${
                checked
                  ? option.selectedClasses
                  : 'border-line bg-card text-ink hover:border-plum/45'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`.trim()}
            >
              <input
                id={optionId}
                type="radio"
                name={`attendance-${groupId}`}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  checked
                    ? 'border-cream bg-cream shadow-[inset_0_0_0_3px_currentColor]'
                    : 'border-current bg-transparent'
                }`}
              />
              <span className="min-w-0">{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default AttendanceGroup

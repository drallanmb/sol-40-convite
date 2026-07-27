import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ADMIN_COPY } from '../../content/admin'
import type {
  AdminSessionError,
  AdminSessionNotice,
} from '../../lib/adminSession'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Field from '../ui/Field'

type AdminLoginProps = {
  busy: boolean
  error?: AdminSessionError
  notice?: AdminSessionNotice
  onSubmit: (email: string, password: string) => Promise<void>
}

export function AdminLogin({
  busy,
  error,
  notice,
  onSubmit,
}: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const errorId = useId()
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (error === 'invalid_credentials') {
      passwordRef.current?.focus()
      passwordRef.current?.select()
    }
  }, [error])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password || busy) return
    await onSubmit(email, password)
  }

  const errorCopy = error ? ADMIN_COPY.login.errors[error] : null
  const description =
    notice === 'expired' || notice === 'revoked'
      ? ADMIN_COPY.login.expired
      : notice === 'logout_unconfirmed'
        ? ADMIN_COPY.login.logoutUnconfirmed
        : ADMIN_COPY.login.description

  return (
    <main className="admin-dashboard grid min-h-screen place-items-center bg-cream px-4 py-12 text-ink">
      <Card variant="login" className="admin-auth-enter w-full max-w-[440px]">
        <p className="font-serif text-xl font-bold text-plum">
          {ADMIN_COPY.login.wordmark}
        </p>
        <h1 className="mt-5 font-serif text-admin-title font-bold leading-admin-title tracking-[-.025em] text-plum">
          {ADMIN_COPY.login.title}
        </h1>
        <p className="mt-3 text-base leading-normal">{description}</p>

        <form className="mt-8" onSubmit={handleSubmit}>
          <Field
            id="admin-email"
            label={ADMIN_COPY.login.emailLabel}
            type="email"
            inputMode="email"
            autoComplete="username"
            appearance="outline"
            value={email}
            disabled={busy}
            aria-invalid={errorCopy ? true : undefined}
            aria-describedby={errorCopy ? errorId : undefined}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <Field
            ref={passwordRef}
            id="admin-password"
            label={ADMIN_COPY.login.passwordLabel}
            type="password"
            autoComplete="current-password"
            appearance="outline"
            value={password}
            disabled={busy}
            aria-invalid={errorCopy ? true : undefined}
            aria-describedby={errorCopy ? errorId : undefined}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          <div
            id={errorId}
            role={errorCopy ? 'alert' : undefined}
            className={`mb-4 min-h-6 text-sm text-wine ${
              errorCopy ? 'admin-error-enter' : ''
            }`}
          >
            {errorCopy}
          </div>
          <Button
            type="submit"
            variant="adminPrimary"
            className="w-full"
            disabled={busy || !email.trim() || !password}
            aria-busy={busy}
          >
            {busy
              ? ADMIN_COPY.login.submitting
              : ADMIN_COPY.login.submit}
          </Button>
        </form>
      </Card>
    </main>
  )
}

export default AdminLogin

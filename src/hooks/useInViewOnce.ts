import { useEffect, useRef, useState } from 'react'

/**
 * Marks one meaningful composition as entered once it reaches the viewport.
 * Unsupported browsers reveal immediately; CSS owns both the choreography
 * and the reduced-motion fallback, so content never depends on JavaScript
 * for visibility.
 */
export function useInViewOnce<T extends HTMLElement>(
  rootMargin = '0px 0px -14% 0px',
) {
  const ref = useRef<T>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (entered || !ref.current) return

    if (typeof IntersectionObserver === 'undefined') {
      setEntered(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setEntered(true)
        observer.disconnect()
      },
      { rootMargin, threshold: 0.12 },
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [entered, rootMargin])

  return { entered, ref }
}

export default useInViewOnce

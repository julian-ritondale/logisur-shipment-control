import { Link, useLocation, type LinkProps } from 'react-router'

/** What a detail page's "Atrás" returns to: the page the user opened it from. */
export interface BackState {
  from: string
}

/**
 * A link to a detail page that remembers where it was clicked, for the page's "Atrás" button.
 * Pages reached any other way (after a retry, a run, an upload, or a link pasted in the address
 * bar) have no origin, so "Atrás" goes to their parent list instead of the browser's history,
 * which could be another run.
 */
export function DetailLink(props: Omit<LinkProps, 'state'>) {
  const location = useLocation()
  const state: BackState = { from: location.pathname + location.search }
  return <Link {...props} state={state} />
}

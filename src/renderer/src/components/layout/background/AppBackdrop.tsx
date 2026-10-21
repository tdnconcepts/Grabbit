import {type ReactNode} from 'react'

export function AppBackdrop(): ReactNode {
	return <div aria-hidden data-backdrop-layer="matte" className="app-matte-backdrop pointer-events-none fixed inset-0" style={{zIndex: -1}} />
}

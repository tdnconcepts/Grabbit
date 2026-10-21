/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/react" />

export {}

declare global {
	interface Window {
		__arroxyBrowserMockShowStartupSplash?: boolean
		__arroxyMockEmitClipboardUrl?: (url: string) => void
	}
}

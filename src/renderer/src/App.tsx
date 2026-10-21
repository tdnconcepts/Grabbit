import {lazy, Suspense, useEffect, useState, type ReactNode} from 'react'
import {useShallow} from 'zustand/react/shallow'
import type {UiTheme} from '@shared/schemas.js'
import {useAppStore} from './store/useAppStore.js'
import {AppBackdrop} from './components/layout/background/AppBackdrop.js'
import {TitleBar} from './components/layout/TitleBar.js'
import {WorkspaceNavigationContext} from './components/layout/workspaceNavigationContext.js'
import {WizardPanel} from './components/layout/WizardPanel.js'
import {WarmupSplash} from './components/system/WarmupSplash.js'
import {UpdateBanner} from './components/system/UpdateBanner.js'
import {Toaster} from './components/ui/sonner.js'
import {useToastSink} from './lib/toastSink.js'
import {ThemeToggle} from './components/system/ThemeToggle.js'
import {AboutDialog} from './components/system/AboutDialog.js'
import {useUpdateChannel} from './components/system/useUpdateChannel.js'
import {WhatsNewDialog} from './components/system/WhatsNewDialog.js'
import {useWhatsNewDialog} from './components/system/useWhatsNewDialog.js'
import {shouldShowSplashGreeting} from './components/system/splashGreeting.js'
import {TooltipProvider} from './components/ui/tooltip.js'
import changelogText from '../../../CHANGELOG.md?raw'

const SHOW_SCENARIO_GALLERY = import.meta.env.MODE === 'browser-mock'
const ShareDialog = lazy(() => import('./components/system/ShareDialog.js').then(module => ({default: module.ShareDialog})))
// Dev-only screens: gating the dynamic import itself lets Vite drop their chunks
// from production builds instead of shipping them unreachable.
const ScenarioGallery = SHOW_SCENARIO_GALLERY ? lazy(() => import('./dev/ScenarioGallery.js').then(module => ({default: module.ScenarioGallery}))) : null
const UiKit = import.meta.env.MODE === 'browser-mock' ? lazy(() => import('./dev/UiKit.js').then(module => ({default: module.UiKit}))) : null
type ColorScheme = 'light' | 'dark'

// Design-system sheet (browser-mock only): every primitive in every variant. Reach it via `?kit`.
function isUiKitStage(): boolean {
	return import.meta.env.MODE === 'browser-mock' && new URLSearchParams(window.location.search).has('kit')
}

function exitUiKitStage(): void {
	const url = new URL(window.location.href)
	url.searchParams.delete('kit')
	window.location.assign(`${url.pathname}${url.search}${url.hash}`)
}

function isBackdropOnlyStage(): boolean {
	return (import.meta.env.MODE === 'browser-mock' || import.meta.env.MODE === 'test') && new URLSearchParams(window.location.search).has('backdrop')
}

function resolveColorScheme(uiTheme: UiTheme, systemPrefersDark: boolean): ColorScheme {
	return uiTheme === 'dark' || (uiTheme === 'system' && systemPrefersDark) ? 'dark' : 'light'
}

function exitBackdropStage(): void {
	const url = new URL(window.location.href)
	url.searchParams.delete('backdrop')
	window.location.assign(`${url.pathname}${url.search}${url.hash}`)
}

function shouldRenderStartupSplash(): boolean {
	if (import.meta.env.MODE !== 'browser-mock') return true
	return window.__arroxyBrowserMockShowStartupSplash === true
}

export function App(): ReactNode {
	const {initialized, initialize, setSplashDismissed, splashDismissed, cancelWarmup, warmupBlocking, warmupDiagnostics, warmupProgress, settings} = useAppStore(
		useShallow(state => ({
			initialized: state.initialized,
			initialize: state.initialize,
			setSplashDismissed: state.setSplashDismissed,
			splashDismissed: state.splashDismissed,
			cancelWarmup: state.cancelWarmup,
			warmupBlocking: state.warmupBlocking,
			warmupDiagnostics: state.warmupDiagnostics,
			warmupProgress: state.warmupProgress,
			settings: state.settings
		}))
	)
	const {uiZoom, uiTheme, shareDialogOpen} = useAppStore(useShallow(state => ({uiZoom: state.uiZoom, uiTheme: state.uiTheme, shareDialogOpen: state.shareDialogOpen})))
	const update = useUpdateChannel()
	// Routes notify.ts to the toast surface for as long as the app is mounted.
	useToastSink()
	const [navigationSlot, setNavigationSlot] = useState<HTMLElement | null>(null)
	const [colorScheme, setColorScheme] = useState<ColorScheme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
	const showStartupSplash = shouldRenderStartupSplash()
	const whatsNew = useWhatsNewDialog(changelogText, {startupReady: !showStartupSplash || splashDismissed})

	useEffect(() => {
		void initialize()
	}, [initialize])

	useEffect(() => {
		const html = document.documentElement
		const mq = window.matchMedia('(prefers-color-scheme: dark)')

		function apply(): void {
			const resolved = resolveColorScheme(uiTheme, mq.matches)
			html.classList.toggle('dark', resolved === 'dark')
			html.classList.toggle('light', resolved === 'light')
			setColorScheme(resolved)
		}

		apply()
		if (uiTheme === 'system') {
			mq.addEventListener('change', apply)
			return () => mq.removeEventListener('change', apply)
		}
	}, [uiTheme])

	if (UiKit && isUiKitStage()) {
		return (
			<TooltipProvider>
				<div className="relative h-screen w-screen overflow-hidden">
					<AppBackdrop />
					<Suspense fallback={null}>
						<UiKit onExit={exitUiKitStage} />
					</Suspense>
				</div>
			</TooltipProvider>
		)
	}

	// Backdrop isolation stage keeps the matte surface easy to inspect in browser-mock.
	if (isBackdropOnlyStage()) {
		return (
			<div className="relative h-screen w-screen overflow-hidden" data-testid="backdrop-stage">
				<AppBackdrop />
				<div className="fixed bottom-4 left-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-md border border-border-strong bg-background/80 px-2 py-1.5 backdrop-blur">
					<ThemeToggle />
					<button type="button" onClick={exitBackdropStage} className="text-xs font-medium text-muted-foreground hover:text-foreground" data-testid="backdrop-stage-exit">
						← exit
					</button>
				</div>
			</div>
		)
	}

	return (
		<TooltipProvider>
			<WorkspaceNavigationContext.Provider value={navigationSlot}>
				<div className="relative flex flex-col h-screen w-screen overflow-hidden" data-testid="app-root">
					<AppBackdrop />
					<TitleBar navigationRef={setNavigationSlot} />

					{update.info && <UpdateBanner info={update.info} installing={update.installing} installError={update.error} onInstall={update.install} onDownload={update.download} onDismiss={update.dismiss} />}

					<div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="app-content">
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{zoom: uiZoom}}>
							<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden" data-testid="wizard-scrollport">
								<WizardPanel />
							</div>
						</div>
					</div>

					{showStartupSplash && <WarmupSplash initialized={initialized} warmupBlocking={warmupBlocking} warmupDiagnostics={warmupDiagnostics} warmupProgress={warmupProgress} showGreeting={shouldShowSplashGreeting(settings)} onDismissed={() => setSplashDismissed(true)} onCancel={cancelWarmup} />}
					<AboutDialog />
					{shareDialogOpen ? (
						<Suspense fallback={null}>
							<ShareDialog />
						</Suspense>
					) : null}
					<WhatsNewDialog open={whatsNew.open} digest={whatsNew.digest} onClose={whatsNew.close} onOpenFullNotes={whatsNew.openFullNotes} />
					{ScenarioGallery ? (
						<Suspense fallback={null}>
							<ScenarioGallery />
						</Suspense>
					) : null}
					<Toaster theme={colorScheme} />
				</div>
			</WorkspaceNavigationContext.Provider>
		</TooltipProvider>
	)
}

import {useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ClipboardEvent, type KeyboardEvent, type ReactNode} from 'react'
import type {TFunction} from 'i18next'
import {createPortal} from 'react-dom'
import {useTranslation} from 'react-i18next'
import {ArrowRight, Download, Inbox, Link2, ListPlus, RefreshCw, Settings, X} from 'lucide-react'
import {cleanUrl} from '@shared/cleanUrl.js'
import {bulkLogger} from '@renderer/lib/bulkLogger.js'
import {notify} from '@renderer/lib/notify.js'
import {cn} from '@renderer/lib/utils.js'
import {formatProbeError} from '../../store/helpers.js'
import {useAppStore} from '../../store/useAppStore.js'
import {useDownloadHomeView, type QuickDownloadFailureMessage} from '../../store/downloadHomeView.js'
import {Alert, AlertDescription} from '../ui/alert.js'
import {Badge} from '../ui/badge.js'
import {Button} from '../ui/button.js'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card.js'
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from '../ui/input-group.js'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs.js'
import {BulkUrlDialog} from './BulkUrlDialog.js'
import {DownloadProfilesSettingsTab} from './DownloadProfilesSettingsTab.js'
import {IncompleteCookiesConfigDialog} from './IncompleteCookiesConfigDialog.js'
import {QueueManagerTab} from '../queue/QueueManagerTab.js'
import {buildClipboardCandidate, resolveClipboardIntake, type ClipboardCandidate} from './clipboardIntake.js'
import {BotWallGuidanceAlert} from './format/BotWallNotice.js'
import {CookiesGuidanceAlert} from './format/CookiesErrorAlert.js'
import type {ProbeErrorExperience} from '../../store/wizard/probeErrorExperience.js'
import appIcon from '../../assets/App-icon-HQ.png'
import {SpeechBubble} from '../shared/SpeechBubble.js'
import {UnifiedSingleDownloadPanel} from './UnifiedSingleDownloadPanel.js'
import {SourceSiteChips} from '../shared/SourceSiteChips.js'
import {WorkspaceNavigationContext} from '../layout/workspaceNavigationContext.js'

type ProfilesTab = 'download' | 'queue' | 'settings'
const PROFILE_TABS = ['download', 'queue', 'settings'] as const satisfies readonly ProfilesTab[]
const QUEUE_TAB_TIP_STORAGE_KEY = 'arroxy_seen_queue_tab_tip'
const QUEUE_TAB_TIP_VISIBLE_MS = 5_000

function WorkspaceNavigation({children}: {children: ReactNode}): ReactNode {
	const slot = useContext(WorkspaceNavigationContext)
	return slot ? createPortal(children, slot) : children
}

function tabFromHash(hash = window.location.hash): ProfilesTab {
	const value = hash.replace(/^#/, '').toLowerCase()
	if (value === 'queue') return 'queue'
	if (value === 'setting' || value === 'settings') return 'settings'
	return 'download'
}

function browserMockScenarioId(): string | null {
	try {
		return new URLSearchParams(window.location.search).get('scenario')
	} catch {
		return null
	}
}

function isBrowserMockBulkDialogScenario(scenario: string | null): boolean {
	return scenario === 'profiles-bulk' || scenario === 'profiles-bulk-huge-input'
}

function browserMockBulkInitialRaw(scenario: string | null): string {
	if (scenario !== 'profiles-bulk-huge-input') return ''
	return [
		'vite v8.0.16 building ssr environment for development...',
		'4 modules transformed.',
		'out/preload/index.cjs  9.02 kB',
		'',
		'built in 14ms',
		'',
		'electron preload scripts built successfully',
		'',
		'-----',
		'',
		'dev server running for the electron renderer process at:',
		'',
		'  -> Local:   http://localhost:5173/',
		'  -> Network: use --host to expose',
		'',
		'starting electron app...',
		'',
		...Array.from({length: 180}, (_, index) => {
			const seconds = String(index % 60).padStart(2, '0')
			return `17:20:${seconds}.${String(index).padStart(3, '0')}          > gpu features { 2d_canvas: 'disabled_software', direct_rendering_display_compositor: 'disabled_off_ok', gpu_compositing: 'disabled_software', multiple_raster_threads: 'enabled_on', opengl: 'disabled_off', rasterization: 'disabled_software', video_decode: 'disabled_software', vulkan: 'disabled_off' }`
		})
	].join('\n')
}

function subscribeProfileTabHash(onStoreChange: () => void): () => void {
	window.addEventListener('hashchange', onStoreChange)
	return () => window.removeEventListener('hashchange', onStoreChange)
}

function profileTabSnapshot(): ProfilesTab {
	return tabFromHash()
}

function isProfilesTab(value: unknown): value is ProfilesTab {
	return typeof value === 'string' && PROFILE_TABS.includes(value as ProfilesTab)
}

function tabHash(tab: ProfilesTab): string {
	if (tab === 'queue') return '#queue'
	if (tab === 'settings') return '#settings'
	return '#download'
}

function selectProfilesTab(tab: ProfilesTab): void {
	window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${tabHash(tab)}`)
	window.dispatchEvent(new Event('hashchange'))
}

function hasSeenQueueTabTip(): boolean {
	try {
		return localStorage.getItem(QUEUE_TAB_TIP_STORAGE_KEY) === '1'
	} catch {
		return true
	}
}

function markQueueTabTipSeen(): void {
	try {
		localStorage.setItem(QUEUE_TAB_TIP_STORAGE_KEY, '1')
	} catch {
		// Storage may be unavailable in hardened browser contexts; the cue is non-critical.
	}
}

function quickDownloadFailureText(t: TFunction, message: QuickDownloadFailureMessage | null): string {
	if (!message) return ''
	switch (message.kind) {
		case 'i18n':
			return t(message.key)
		case 'text':
			return message.text
		case 'bulk-probe': {
			const probeText = formatProbeError(message.error) || t('wizard.url.quickProbeFailed')
			return `${t('wizard.url.quickBulkAllFailed')}: ${probeText}`
		}
		case 'probe':
			return formatProbeError(message.error) || t('wizard.url.quickProbeFailed')
	}
	const exhaustive: never = message
	return exhaustive
}

function QuickDownloadErrorAlert({experience, message, onEnableCookiesAndRetry, onOpenCookiesSettings, onRetry, t}: {experience: ProbeErrorExperience | null; message: string; onEnableCookiesAndRetry: () => void; onOpenCookiesSettings: () => void; onRetry: () => void; t: TFunction}): ReactNode {
	const showBotWallGuidance = experience?.botWall.variant !== undefined && experience.botWall.variant !== 'hidden'
	const showCookiesGuidance = experience?.cookies.variant !== undefined && experience.cookies.variant !== 'hidden'
	return (
		<Alert variant="warning" size="sm" className="mt-2" data-testid="quick-download-feedback">
			<AlertDescription className="flex flex-col gap-2">
				<span>{t('wizard.url.quickFailed', {error: message})}</span>
				<div className="flex flex-wrap gap-2">
					<Button type="button" size="sm" variant="outline" onClick={() => onRetry()} data-testid="quick-download-retry">
						<RefreshCw data-icon="inline-start" />
						{t('common.retry')}
					</Button>
				</div>
				{experience && (showBotWallGuidance || showCookiesGuidance) ? (
					<div className="flex flex-col gap-1.5">
						<BotWallGuidanceAlert guidance={experience.botWall} density="compact" showRetryAction={false} onEnableCookiesAndRetry={onEnableCookiesAndRetry} onRetry={onRetry} enableTestId="quick-download-enable-cookies-retry" />
						<CookiesGuidanceAlert guidance={experience.cookies} density="compact" onOpenSettings={onOpenCookiesSettings} openSettingsTestId="quick-download-cookies-settings" />
					</div>
				) : null}
			</AlertDescription>
		</Alert>
	)
}

function QueueTabFirstRunCue({onDismiss, persistent = false}: {onDismiss: () => void; persistent?: boolean}): ReactNode {
	const {t} = useTranslation()

	useEffect(() => {
		if (persistent) return undefined
		const timeout = window.setTimeout(onDismiss, QUEUE_TAB_TIP_VISIBLE_MS)
		return () => window.clearTimeout(timeout)
	}, [onDismiss, persistent])

	return (
		<div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 justify-center px-3" data-testid="queue-tab-first-run-cue">
			<div className="nudge-in pointer-events-auto flex max-w-[min(20rem,calc(100vw-2rem))] items-end gap-2">
				<img src={appIcon} alt="" aria-hidden draggable={false} className="size-10 shrink-0 object-contain" />
				<SpeechBubble tail="top">{t('queue.tabTip')}</SpeechBubble>
			</div>
		</div>
	)
}

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- these local UI controls update independently and do not share reducer-style transitions
export function DownloadProfilesHome(): ReactNode {
	const {t} = useTranslation()
	const {
		cookiesConfigDialogIssue,
		dismissCookiesConfigDialog,
		hasInput,
		openCookiesSettings,
		quickDownload,
		quickDownloadFailureMessage,
		quickDownloadProbeExperience,
		quickDownloadProgressFailed,
		quickDownloadStatus,
		quickPreparing,
		retryQuickDownloadFailure,
		retryQuickDownloadWithCookies,
		setWizardUrl,
		submitUrl,
		urlReady,
		wizardUrl
	} = useDownloadHomeView()
	const wizardStep = useAppStore(state => state.wizardStep)
	const formatsLoading = useAppStore(state => state.formatsLoading)
	const inputRef = useRef<HTMLInputElement>(null)
	const bulkOpenRef = useRef(false)
	const initialBrowserMockScenario = browserMockScenarioId()
	const activeTab = useSyncExternalStore(subscribeProfileTabHash, profileTabSnapshot, profileTabSnapshot)
	const [bulkOpen, setBulkOpen] = useState(() => isBrowserMockBulkDialogScenario(initialBrowserMockScenario))
	const [bulkInitialRaw, setBulkInitialRaw] = useState(() => browserMockBulkInitialRaw(initialBrowserMockScenario))
	const [pendingClipboard, setPendingClipboard] = useState<ClipboardCandidate | null>(null)
	const queueCount = useAppStore(state => state.queue.length)
	const queueIsActive = useAppStore(state => state.queue.some(item => item.status === 'running' || item.lastStatus?.key === 'movingFiles'))
	const previousQueueCountRef = useRef(queueCount)
	const [showQueueTabTip, setShowQueueTabTip] = useState(() => initialBrowserMockScenario === 'queue-tab-tip' || (queueCount > 0 && !hasSeenQueueTabTip()))
	const quickErrorText = quickDownloadFailureText(t, quickDownloadFailureMessage)
	const showQuickPartialWarning = quickDownloadStatus === 'queued' && quickDownloadProgressFailed > 0

	useEffect(() => {
		bulkOpenRef.current = bulkOpen
	}, [bulkOpen])

	useEffect(() => {
		if (activeTab !== 'download' || wizardStep !== 'url' || !urlReady || formatsLoading || quickPreparing) return
		const timeout = window.setTimeout(() => void submitUrl(), 550)
		return () => window.clearTimeout(timeout)
	}, [activeTab, formatsLoading, quickPreparing, submitUrl, urlReady, wizardStep, wizardUrl])

	useEffect(() => {
		if (!showQueueTabTip || initialBrowserMockScenario === 'queue-tab-tip') return
		markQueueTabTipSeen()
	}, [initialBrowserMockScenario, showQueueTabTip])

	useEffect(() => {
		const previousQueueCount = previousQueueCountRef.current
		previousQueueCountRef.current = queueCount
		if (previousQueueCount !== 0 || queueCount === 0 || hasSeenQueueTabTip()) return
		setShowQueueTabTip(true)
	}, [queueCount])

	const consumeClipboardCandidate = useCallback(
		(candidate: ClipboardCandidate): void => {
			setPendingClipboard(null)

			const url = candidate.acceptedUrls[0]
			if (!url) return
			setWizardUrl(url)
			notify.clipboard(t('wizard.url.clipboard.autofilledLink'))
		},
		[setWizardUrl, t]
	)

	function openManualBulkDialog(): void {
		setPendingClipboard(null)
		setBulkInitialRaw('')
		setBulkOpen(true)
	}

	function handleBulkOpenChange(next: boolean): void {
		setBulkOpen(next)
		if (!next) setBulkInitialRaw('')
	}

	useEffect(() => {
		return window.appApi.events.onClipboardUrl(payload => {
			const state = useAppStore.getState()
			const action = resolveClipboardIntake({candidate: buildClipboardCandidate(payload), hasInput: state.wizardUrl.trim().length > 0, formatsLoading: state.formatsLoading, quickPreparing: state.quickDownloadStatus === 'preparing', bulkOpen: bulkOpenRef.current})

			if (action.kind === 'ignore') return
			if (action.kind === 'store-pending') {
				setPendingClipboard(action.candidate)
				if (bulkOpenRef.current) bulkLogger.info('Clipboard URL held while bulk dialog is open', {accepted: action.candidate.count})
				return
			}
			if (action.kind === 'hint-bulk') {
				notify.clipboard(t('wizard.url.clipboard.bulkHint'))
				return
			}
			consumeClipboardCandidate(action.candidate)
		})
	}, [consumeClipboardCandidate, t])

	function handleClearUrl(): void {
		setWizardUrl('')
		if (pendingClipboard) {
			consumeClipboardCandidate(pendingClipboard)
			return
		}
		inputRef.current?.focus()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === 'Enter' && urlReady && !quickPreparing) {
			void submitUrl()
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLInputElement>): void {
		const pasted = event.clipboardData.getData('text')
		const cleaned = cleanUrl(pasted)
		if (cleaned === pasted) return
		event.preventDefault()
		const input = event.currentTarget
		const start = input.selectionStart ?? wizardUrl.length
		const end = input.selectionEnd ?? wizardUrl.length
		setWizardUrl(wizardUrl.slice(0, start) + cleaned + wizardUrl.slice(end))
	}

	return (
		<div className="grabbit-workspace mx-auto flex w-full flex-col gap-4 pb-5" data-testid="download-profiles-home">
			<Tabs
				value={activeTab}
				onValueChange={value => {
					if (!isProfilesTab(value)) return
					if (value !== 'download') setPendingClipboard(null)
					selectProfilesTab(value)
				}}
				className="gap-4"
			>
				<WorkspaceNavigation>
					<div className="grabbit-navigation">
						<TabsList variant="line" className="download-home-tabs flex justify-center" aria-label={t('wizard.tabsNavAria')} data-testid="profiles-tabs">
							<TabsTrigger value="download" className="h-12 flex-1 rounded-full border-0 px-4 text-sm data-active:border-transparent">
								<Link2 data-icon="inline-start" aria-hidden />
								{t('wizard.steps.url')}
							</TabsTrigger>
							<TabsTrigger value="queue" data-queue-active={queueIsActive ? 'true' : undefined} className={cn('downloads-tab-trigger h-12 flex-[1.22_1_0] rounded-full border-0 px-3 text-sm data-active:border-transparent', queueIsActive && 'queue-tab-working')}>
								<Inbox data-icon="inline-start" aria-hidden />
								{t('queue.tabLabel')}
								{queueCount > 0 ? (
									<Badge variant="secondary" size="sm" className="download-count-badge ms-0.5 min-w-4 px-1 font-mono">
										{queueCount}
									</Badge>
								) : null}
							</TabsTrigger>
							<TabsTrigger value="settings" className="h-12 flex-1 rounded-full border-0 px-4 text-sm data-active:border-transparent">
								<Settings data-icon="inline-start" aria-hidden />
								{t('wizard.url.tabs.settings')}
							</TabsTrigger>
						</TabsList>
						{showQueueTabTip ? <QueueTabFirstRunCue persistent={initialBrowserMockScenario === 'queue-tab-tip'} onDismiss={() => setShowQueueTabTip(false)} /> : null}
					</div>
				</WorkspaceNavigation>

				<TabsContent value="download" className="flex flex-col gap-4">
					<Card data-testid="profiles-download-panel" className="utility-panel grabbit-url-panel gap-0 py-0">
						<CardHeader className="grabbit-url-heading">
							<div className="grabbit-section-icon" aria-hidden>
								<Link2 />
							</div>
							<div className="min-w-0 flex-1">
								<CardTitle className="text-lg">{t('wizard.url.heading')}</CardTitle>
								<CardDescription className="mt-1 text-xs text-muted-foreground">{t('wizard.url.workspace.description')}</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="grabbit-url-content">
							<div className="grabbit-url-entry">
								<InputGroup className="grabbit-url-field">
									<InputGroupAddon align="inline-start">
										<Link2 aria-hidden />
									</InputGroupAddon>
									<InputGroupInput ref={inputRef} type="url" value={wizardUrl} onChange={event => setWizardUrl(event.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder={t('wizard.url.placeholder')} spellCheck={false} data-testid="profiles-main-input" className="text-title" />
									{hasInput ? (
										<InputGroupAddon align="inline-end">
											<InputGroupButton type="button" size="icon-sm" aria-label={t('wizard.url.clearAria')} onClick={handleClearUrl} data-testid="url-clear">
												<X aria-hidden />
											</InputGroupButton>
										</InputGroupAddon>
									) : null}
								</InputGroup>
								<Button variant="glow" size="lg" className="grabbit-analyze-button" disabled={!urlReady || quickPreparing || formatsLoading} onClick={() => void submitUrl()} data-testid="analyze-link">
									{formatsLoading ? <RefreshCw className="animate-spin" aria-hidden /> : <Download aria-hidden />}
									{t('wizard.url.interactiveDownload')}
									<ArrowRight aria-hidden />
								</Button>
							</div>
							{hasInput && !urlReady ? (
								<p className="mt-2 text-xs text-destructive" role="alert" data-testid="url-invalid">
									{t('wizard.url.workspace.invalidUrl')}
								</p>
							) : null}
							{pendingClipboard ? <ClipboardPendingAction onApply={() => consumeClipboardCandidate(pendingClipboard)} onDismiss={() => setPendingClipboard(null)} /> : null}
							<div className="grabbit-url-footer">
								<SourceSiteChips />
								<div className="flex flex-wrap gap-2">
									<Button type="button" variant="outline" size="sm" disabled={!urlReady || quickPreparing} onClick={() => void quickDownload()} data-testid="profiles-quick-download" title={t('wizard.url.quickDownloadTooltip', {profileName: t('presets.best-quality.label')})}>
										<Download data-icon="inline-start" aria-hidden />
										{quickPreparing ? t('wizard.url.quickPreparing') : t('wizard.url.quickDownload')}
									</Button>
									<Button type="button" variant="ghost" size="sm" onClick={openManualBulkDialog} data-testid="profiles-bulk-urls">
										<ListPlus data-icon="inline-start" aria-hidden />
										{t('wizard.url.bulkButton')}
									</Button>
								</div>
							</div>

							{quickDownloadStatus === 'error' ? <QuickDownloadErrorAlert experience={quickDownloadProbeExperience} message={quickErrorText} onEnableCookiesAndRetry={() => void retryQuickDownloadWithCookies()} onOpenCookiesSettings={openCookiesSettings} onRetry={() => void retryQuickDownloadFailure()} t={t} /> : null}
							{showQuickPartialWarning ? (
								<Alert variant="warning" size="sm" className="mt-2" data-testid="quick-download-feedback">
									<AlertDescription>{t('wizard.url.quickPartialFailed', {count: quickDownloadProgressFailed})}</AlertDescription>
								</Alert>
							) : null}
						</CardContent>
					</Card>
					<UnifiedSingleDownloadPanel />
				</TabsContent>

				<TabsContent value="queue">
					<QueueManagerTab />
				</TabsContent>

				<TabsContent value="settings">
					<DownloadProfilesSettingsTab />
				</TabsContent>
			</Tabs>

			{bulkOpen ? <BulkUrlDialog open={bulkOpen} onOpenChange={handleBulkOpenChange} initialRaw={bulkInitialRaw} /> : null}
			<IncompleteCookiesConfigDialog issue={cookiesConfigDialogIssue} onDismiss={dismissCookiesConfigDialog} onOpenSettings={openCookiesSettings} />
		</div>
	)
}

function ClipboardPendingAction({onApply, onDismiss}: {onApply: () => void; onDismiss: () => void}): ReactNode {
	const {t} = useTranslation()
	const Icon = Link2
	const statusLabel = t('wizard.url.clipboard.pendingLinkReady')
	const actionLabel = t('wizard.url.clipboard.useCopiedLink')
	return (
		<output className="mt-2 flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[var(--glow-border)] bg-primary/12 px-3 py-2 text-xs text-foreground" data-testid="clipboard-pending">
			<span className="flex min-w-0 flex-1 items-center gap-2">
				<Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
				<span className="min-w-0 truncate">{statusLabel}</span>
			</span>
			<Button type="button" variant="outline" size="xs" onClick={onApply} data-testid="clipboard-pending-action" className="bg-background/50">
				{actionLabel}
			</Button>
			<Button type="button" variant="ghost" size="icon-xs" onClick={onDismiss} aria-label={t('wizard.url.clipboard.dismissCopiedLink')} data-testid="clipboard-pending-dismiss" className="-me-1">
				<X aria-hidden />
			</Button>
		</output>
	)
}

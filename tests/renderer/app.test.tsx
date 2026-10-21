import {act, render, screen, fireEvent, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test'
import {App} from '@renderer/App.js'
import {useAppStore} from '@renderer/store/useAppStore.js'
import {buildMockAppApi} from '../shared/mockAppApi.js'
import {defaultAppSettings} from '@shared/constants.js'
import {ok} from '@shared/result.js'
import type {GraphicsPolicy} from '@shared/types.js'

const mockAppApi = buildMockAppApi()

const CSS_FORCED_GRAPHICS_POLICY: GraphicsPolicy = {backdrop: {forceRenderMode: 'css-only', softwareWebglAllowed: false, fallbackReason: 'gpu-feature-disabled'}}

describe('App renderer', () => {
	beforeEach(() => {
		useAppStore.setState({
			initialized: false,
			initializing: false,
			splashDismissed: false,
			settings: null,
			language: 'en',
			wizardStep: 'url',
			formatsLoading: false,
			wizardUrl: '',
			wizardTitle: '',
			wizardThumbnail: '',
			wizardFormats: [],
			selectedVideoFormatId: '',
			audioSelection: {kind: 'none'},
			activePreset: null,
			wizardOutputDir: '',
			wizardError: null,
			wizardErrorOrigin: null,
			quickDownloadStatus: 'idle',
			quickDownloadFailure: null,
			quickDownloadQueueIds: [],
			queue: [],
			graphicsPolicy: null
		})

		window.appApi = mockAppApi
		window.platform = 'linux'
		window.history.replaceState(null, '', '/')

		vi.clearAllMocks()
	})

	it('renders the app heading and URL input', async () => {
		render(<App />)
		expect(await screen.findByTestId('title-bar')).toHaveTextContent('Grabbit')
		expect(await screen.findByText('Download from URL')).toBeInTheDocument()
		expect(await screen.findByTestId('profiles-main-input')).toBeInTheDocument()
	})

	it('does not render the bottom toolbar or delayed feedback prompt', async () => {
		render(<App />)
		await screen.findByTestId('profiles-main-input')
		expect(screen.queryByTestId('app-footer')).not.toBeInTheDocument()
		expect(screen.queryByTestId('footer-left-controls')).not.toBeInTheDocument()
		expect(screen.queryByTestId('btn-discord')).not.toBeInTheDocument()
		expect(screen.queryByTestId('btn-feedback')).not.toBeInTheDocument()
		expect(screen.queryByTestId('feedback-nudge')).not.toBeInTheDocument()
	})

	it('does not mount a WebGL canvas before settings and graphics policy resolve', async () => {
		let resolveSettings!: (value: Awaited<ReturnType<typeof mockAppApi.settings.get>>) => void
		let resolveGraphicsPolicy!: (value: Awaited<ReturnType<typeof mockAppApi.app.getGraphicsPolicy>>) => void
		const api = buildMockAppApi()
		vi.mocked(api.settings.get).mockReturnValue(
			new Promise(resolve => {
				resolveSettings = resolve
			})
		)
		vi.mocked(api.app.getGraphicsPolicy).mockReturnValue(
			new Promise(resolve => {
				resolveGraphicsPolicy = resolve
			})
		)
		window.appApi = api

		render(<App />)

		expect(document.querySelector('canvas[data-backdrop-layer="webgl"]')).toBeNull()

		await act(async () => {
			resolveSettings(ok(defaultAppSettings('/tmp')))
		})
		expect(document.querySelector('canvas[data-backdrop-layer="webgl"]')).toBeNull()

		await act(async () => {
			resolveGraphicsPolicy(ok(CSS_FORCED_GRAPHICS_POLICY))
		})
	})

	it('uses the matte backdrop without mounting a decorative canvas', async () => {
		const api = buildMockAppApi()
		vi.mocked(api.app.getGraphicsPolicy).mockResolvedValue(ok(CSS_FORCED_GRAPHICS_POLICY))
		window.appApi = api

		render(<App />)

		expect(await screen.findByTestId('title-bar')).toBeInTheDocument()
		expect(document.querySelector('[data-backdrop-layer="matte"]')).toBeInTheDocument()
		expect(document.querySelector('canvas[data-backdrop-layer="webgl"]')).toBeNull()
	})

	it('renders the backdrop isolation stage from the browser-mock query param', async () => {
		window.history.replaceState(null, '', '/?backdrop=1')

		render(<App />)

		expect(await screen.findByTestId('backdrop-stage')).toBeInTheDocument()
		expect(screen.queryByTestId('title-bar')).not.toBeInTheDocument()
	})

	it('keeps the matte isolation stage theme controls', async () => {
		window.history.replaceState(null, '', '/?backdrop=1&backdropForceFallback=css')

		render(<App />)

		fireEvent.click(await screen.findByRole('button', {name: 'Dark mode'}))
		let url = new URL(window.location.href)
		expect(url.searchParams.get('theme')).toBe('dark')
		expect(url.searchParams.get('backdrop')).toBe('1')
		expect(document.querySelector('[data-backdrop-layer="matte"]')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', {name: 'Light mode'}))
		url = new URL(window.location.href)
		expect(url.searchParams.get('theme')).toBe('light')

		fireEvent.click(screen.getByRole('button', {name: 'System default'}))
		url = new URL(window.location.href)
		expect(url.searchParams.get('theme')).toBe('system')
	})

	it('automatically analyzes a valid URL and reveals the unified options', async () => {
		render(<App />)

		const input = await screen.findByTestId('profiles-main-input')
		fireEvent.change(input, {target: {value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}})

		await waitFor(
			() => {
				expect(mockAppApi.downloads.probe).toHaveBeenCalledWith(expect.objectContaining({url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}))
			},
			{timeout: 2_000}
		)
		expect(await screen.findByTestId('unified-download-options')).toHaveTextContent('Test Video')
		expect(screen.getByTestId('download-action-bar')).toBeInTheDocument()
		expect(screen.getByTestId('btn-download')).toBeEnabled()
	})

	it('keeps Quick Download compact and blocks competing analysis while it prepares', async () => {
		let resolveProbe!: (value: Awaited<ReturnType<typeof mockAppApi.downloads.probe>>) => void
		vi.mocked(mockAppApi.downloads.probe).mockReturnValue(
			new Promise(resolve => {
				resolveProbe = resolve
			})
		)
		render(<App />)

		const quick = await screen.findByTestId('profiles-quick-download')
		expect(quick.textContent).toMatch(/Quick download/i)
		expect(screen.queryByRole('combobox', {name: 'Active profile'})).not.toBeInTheDocument()
		expect(screen.queryByRole('tab', {name: 'Profiles'})).not.toBeInTheDocument()
		expect(quick).toBeDisabled()

		const input = await screen.findByTestId('profiles-main-input')
		fireEvent.change(input, {target: {value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}})
		fireEvent.click(quick)

		const progressDialog = await screen.findByTestId('quick-download-progress-dialog')
		expect(progressDialog).toHaveTextContent('Preparing Quick Download')
		expect(progressDialog).toHaveTextContent('Best quality')
		expect(progressDialog).toHaveClass('overflow-hidden')
		expect(screen.getByTestId('quick-download-progress-body')).toHaveClass('min-w-0')
		expect(screen.getByTestId('quick-download-progress-current')).toHaveClass('max-w-full', 'min-w-0', 'overflow-hidden')
		expect(screen.getByTestId('quick-download-progress-current-label')).toHaveClass('flex-1', 'min-w-0', 'truncate')
		expect(screen.getByTestId('quick-download-progress-count')).toHaveTextContent('0 / 1')

		act(() => {
			useAppStore.setState({playlistProbeProgress: {url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', playlistMode: 'playlist', phase: 'pages', loaded: 8, at: new Date().toISOString()}} as never)
		})
		expect(screen.getByTestId('quick-download-progress-current')).toHaveTextContent('Scanning channel pages')
		expect(screen.getByTestId('quick-download-progress-count')).toHaveTextContent('8 pages found')
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

		act(() => {
			useAppStore.setState({playlistProbeProgress: {url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', playlistMode: 'playlist', phase: 'items', loaded: 48, total: 100, at: new Date().toISOString()}} as never)
		})
		expect(screen.getByTestId('quick-download-progress-current')).toHaveTextContent('Collecting videos')
		expect(screen.getByTestId('quick-download-progress-count')).toHaveTextContent('48 / 100')
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '48')

		await waitFor(() => {
			expect(quick).toBeDisabled()
		})
		await new Promise(resolve => window.setTimeout(resolve, 600))
		expect(mockAppApi.downloads.probe).toHaveBeenCalledTimes(1)

		resolveProbe({
			ok: true,
			data: {
				kind: 'video',
				extractor: 'youtube',
				extractorKey: 'Youtube',
				webpageUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				isAudioOnlySource: false,
				formats: [{formatId: '22', label: '720p | mp4', ext: 'mp4', resolution: '720p', fps: 30, isVideoOnly: false, isAudioOnly: false}],
				title: 'Test Video',
				thumbnail: '',
				subtitles: {},
				automaticCaptions: {},
				isLive: false,
				hasDrm: false
			}
		})

		await waitFor(() => {
			expect(mockAppApi.queue.cmd.add).toHaveBeenCalledTimes(1)
		})
		await waitFor(() => {
			expect(screen.queryByTestId('quick-download-progress-dialog')).not.toBeInTheDocument()
		})
	})

	it('cancels quick download preparation from the blocking progress dialog', async () => {
		vi.mocked(mockAppApi.downloads.probe).mockReturnValue(new Promise(() => undefined))
		render(<App />)

		const input = await screen.findByTestId('profiles-main-input')
		fireEvent.change(input, {target: {value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}})
		fireEvent.click(screen.getByTestId('profiles-quick-download'))

		expect(await screen.findByTestId('quick-download-progress-dialog')).toBeInTheDocument()
		fireEvent.click(screen.getByTestId('quick-download-progress-cancel'))

		await waitFor(() => {
			expect(screen.queryByTestId('quick-download-progress-dialog')).not.toBeInTheDocument()
		})
		expect(mockAppApi.downloads.probeCancel).toHaveBeenCalled()
		expect(screen.getByTestId('profiles-main-input')).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
	})

	it('keeps the primary navigation focused on downloads and settings', async () => {
		render(<App />)
		expect(await screen.findByRole('tab', {name: 'URL'})).toBeInTheDocument()
		expect(screen.getByRole('tab', {name: /^downloads/i})).toBeInTheDocument()
		expect(screen.getByRole('tab', {name: 'Settings'})).toBeInTheDocument()
		expect(screen.queryByRole('tab', {name: 'Profiles'})).not.toBeInTheDocument()
	})

	it('shows Downloads as a top-level tab', async () => {
		render(<App />)
		fireEvent.click(await screen.findByRole('tab', {name: /^downloads/i}))
		expect(await screen.findByTestId('queue-manager-tab')).toBeInTheDocument()
	})

	it('shows the welcome-back greeting while warmup is still running', async () => {
		const pendingWarmupApi = buildMockAppApi({settings: {common: {defaultOutputDir: '/tmp', rememberLastOutputDir: false, clipboardWatchEnabled: false, hotkeyEnabled: false, launchCount: 4}}})
		vi.mocked(pendingWarmupApi.app.warmUp).mockReturnValue(new Promise(() => undefined))
		window.appApi = pendingWarmupApi

		render(<App />)

		expect(await screen.findByTestId('splash-greeting')).toHaveTextContent('Hey, welcome back!')
		expect(screen.getByTestId('splash-overlay')).toHaveTextContent('Preparing downloads')
		expect(useAppStore.getState().initialized).toBe(false)
	})

	it('applies persisted document language and direction during initialization', async () => {
		const settings = defaultAppSettings('/tmp')
		const rtlApi = buildMockAppApi({settings: {...settings, common: {...settings.common, language: 'ar'}}})
		window.appApi = rtlApi
		document.documentElement.lang = 'en'
		document.documentElement.dir = 'ltr'

		await useAppStore.getState().initialize()

		expect(useAppStore.getState().language).toBe('ar')
		expect(document.documentElement.lang).toBe('ar')
		expect(document.documentElement.dir).toBe('rtl')
		expect(rtlApi.app.setLanguage).toHaveBeenCalledWith('ar')
	})
})

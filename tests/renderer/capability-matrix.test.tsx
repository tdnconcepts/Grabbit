// @vitest-environment jsdom
import {render, screen, within} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test'
import {App} from '@renderer/App.js'
import {StepUrlInput} from '@renderer/components/wizard/StepUrlInput.js'
import {TooltipProvider} from '@renderer/components/ui/tooltip.js'
import {useAppStore} from '@renderer/store/useAppStore.js'
import {defaultAppSettings} from '@shared/constants.js'
import {buildMockAppApi} from '../shared/mockAppApi.js'

describe('DownloadProfilesHome action rows', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '/')
		window.appApi = buildMockAppApi()
		window.platform = 'linux'
		useAppStore.setState({initialized: true, initializing: false, aboutDialogOpen: false, settings: defaultAppSettings('/tmp'), wizardStep: 'url', wizardUrl: '', formatsLoading: false, quickDownloadStatus: 'idle', quickDownloadFailure: null, quickDownloadQueueIds: [], queue: []})
		vi.clearAllMocks()
	})

	it('keeps the URL panel compact and separate from analyzed options', () => {
		render(
			<TooltipProvider>
				<StepUrlInput />
			</TooltipProvider>
		)

		const panel = screen.getByTestId('profiles-download-panel')
		expect(panel).toHaveClass('utility-panel')
		expect(within(panel).getByTestId('profiles-quick-download')).toBeInTheDocument()
		expect(screen.queryByTestId('profiles-interactive-download')).not.toBeInTheDocument()
	})

	it('keeps static supported-site proof out of the main URL workflow', () => {
		render(
			<TooltipProvider>
				<StepUrlInput />
			</TooltipProvider>
		)

		expect(screen.queryByTestId('url-capabilities')).not.toBeInTheDocument()
		expect(screen.queryByText('2000+ sites')).not.toBeInTheDocument()
	})

	it('uses concise inline guidance instead of a decorative helper block', () => {
		render(
			<TooltipProvider>
				<StepUrlInput />
			</TooltipProvider>
		)

		const panel = screen.getByTestId('profiles-download-panel')

		expect(within(panel).getByText('Paste a link to analyze it automatically, then choose everything here.')).toBeInTheDocument()
		expect(within(panel).queryByTestId('profiles-mascot-header')).not.toBeInTheDocument()
		expect(screen.queryByTestId('profiles-mascot-help')).not.toBeInTheDocument()
	})
})

describe('About capabilities', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '/')
		window.appApi = buildMockAppApi()
		window.appVersion = '1.2.3'
		window.platform = 'linux'
		useAppStore.setState({initialized: true, initializing: false, settings: defaultAppSettings('/tmp'), wizardStep: 'url', wizardUrl: '', formatsLoading: false, quickDownloadStatus: 'idle', quickDownloadFailure: null, quickDownloadQueueIds: [], queue: [], aboutDialogOpen: false})
		vi.clearAllMocks()
	})

	it('moves the static supported-site proof into the About dialog', async () => {
		useAppStore.setState({aboutDialogOpen: true})
		render(<App />)

		const about = await screen.findByTestId('about-dialog')
		const capabilities = within(about).getByTestId('about-capabilities')

		expect(within(capabilities).getByText('YouTube')).toBeVisible()
		expect(within(capabilities).getByText('2000+ sites')).toBeVisible()
		expect(within(capabilities).getByTestId('source-capability-site-logo-vimeo')).toBeInTheDocument()
		expect(within(capabilities).getByTestId('source-capability-any-site-tip')).toHaveAccessibleName('2000+ sites: Videos, Video playlists, Music playlists, Audio only, Subtitles')
	})
})

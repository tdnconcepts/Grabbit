import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test'
import {App} from '@renderer/App.js'
import {useAppStore} from '@renderer/store/useAppStore.js'
import {defaultAppSettings} from '@shared/constants.js'
import {buildMockAppApi} from '../shared/mockAppApi.js'

describe('Grabbit app utilities', () => {
	beforeEach(() => {
		window.appApi = buildMockAppApi()
		window.appVersion = '1.2.3'
		window.platform = 'linux'
		useAppStore.setState({initialized: true, initializing: false, aboutDialogOpen: false, settings: defaultAppSettings('/tmp'), wizardStep: 'url', wizardUrl: '', formatsLoading: false, queue: []})
		vi.clearAllMocks()
	})

	it('links About to Grabbit without upstream community links', async () => {
		useAppStore.setState({aboutDialogOpen: true})
		render(<App />)
		expect(screen.queryByTestId('about-link-discord')).not.toBeInTheDocument()
		expect(screen.queryByTestId('about-link-website')).not.toBeInTheDocument()
		fireEvent.click(await screen.findByTestId('about-link-github'))
		expect(window.appApi.shell.openExternal).toHaveBeenCalledWith('https://github.com/tdnconcepts/Grabbit')
	})

	it('keeps log browsing local', async () => {
		render(<App />)
		fireEvent.click(await screen.findByText('Settings'))
		fireEvent.click(await screen.findByTestId('btn-logs'))
		await waitFor(() => expect(window.appApi.logs.openDir).toHaveBeenCalledOnce())
	})

	it('keeps diagnostic export local', async () => {
		render(<App />)
		fireEvent.click(await screen.findByText('Settings'))
		fireEvent.click(await screen.findByTestId('btn-save-diagnostics'))
		await waitFor(() => expect(window.appApi.logs.saveDiagnostics).toHaveBeenCalledOnce())
	})
})

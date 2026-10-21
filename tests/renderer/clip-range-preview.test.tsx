// @vitest-environment jsdom
import {act, fireEvent, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test'
import {ClipRangeSection} from '@renderer/components/wizard/ClipRangeSection.js'
import {useAppStore} from '@renderer/store/useAppStore.js'
import {RESET_WIZARD_STATE} from '@renderer/store/wizard/commands.js'
import {buildMockAppApi} from '../shared/mockAppApi.js'

describe('ClipRangeSection preview', () => {
	beforeEach(() => {
		window.appApi = buildMockAppApi()
		act(() => useAppStore.setState({...RESET_WIZARD_STATE, wizardDuration: 212}))
	})

	it('keeps both handles visible at a fractional video end', () => {
		act(() => useAppStore.setState({wizardDuration: Number('95.16666700000004')}))
		render(<ClipRangeSection thumbnail="" title="Video" />)
		fireEvent.click(screen.getByTestId('clip-range-custom'))
		expect(screen.getByTestId('clip-end')).toHaveValue('01:35.167')
		expect(screen.getByTestId('clip-end-slider')).toHaveStyle({visibility: 'visible'})
		expect(screen.getByTestId('clip-start-slider')).toHaveStyle({visibility: 'visible'})
		expect(screen.queryByTestId('clip-error')).not.toBeInTheDocument()
	})

	it('captures precise start and end points from the preview playhead', () => {
		render(<ClipRangeSection thumbnail="" title="Video" />)
		const seek = screen.getByRole('slider', {name: 'Clip preview'})

		fireEvent.change(seek, {target: {value: '80'}})
		fireEvent.click(screen.getByRole('button', {name: 'Set start'}))
		fireEvent.change(seek, {target: {value: '145'}})
		fireEvent.click(screen.getByRole('button', {name: 'Set end'}))

		expect(useAppStore.getState()).toMatchObject({wizardClipMode: 'range', wizardClipStart: '01:20', wizardClipEnd: '02:25'})
		expect(screen.getByTestId('clip-summary')).toHaveTextContent('Clip length 01:05')
	})

	it('renders the secure preview stream when the probe provides one', () => {
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="https://cdn.example/poster.jpg" title="Video" />)

		expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.example/preview.mp4')
	})

	it('keeps the timeline usable when no playable stream is available', () => {
		render(<ClipRangeSection thumbnail="https://cdn.example/poster.jpg" title="Video" />)

		expect(screen.getByText('Preview unavailable for this source. You can still use the timeline and time fields.')).toBeInTheDocument()
		expect(screen.getByRole('slider', {name: 'Clip preview'})).toBeEnabled()
	})

	it('uses preview metadata when the source did not supply a duration', () => {
		act(() => useAppStore.setState({wizardDuration: undefined, wizardPreviewUrl: 'https://cdn.example/preview.mp4'}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="" title="Video" />)
		fireEvent.click(screen.getByTestId('clip-range-custom'))
		const video = container.querySelector('video')!
		Object.defineProperty(video, 'duration', {configurable: true, value: 28.5})
		fireEvent.loadedMetadata(video)

		expect(useAppStore.getState().wizardDuration).toBe(28.5)
		expect(screen.getByTestId('clip-end')).toHaveValue('00:28.5')
		expect(screen.getByTestId('clip-end-slider')).toBeEnabled()
		expect(screen.queryByTestId('clip-error')).not.toBeInTheDocument()
		expect(screen.getByTestId('clip-summary')).toHaveTextContent('Clip length 00:28.5')
	})

	it('does not enforce an empty end time while preview duration is still unknown', () => {
		act(() => useAppStore.setState({wizardDuration: undefined, wizardClipMode: 'range'}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="" title="Video" />)
		const video = container.querySelector('video')!
		Object.defineProperty(video, 'paused', {configurable: true, value: false})
		video.currentTime = 3
		fireEvent.timeUpdate(video)
		expect(video.currentTime).toBe(3)
	})

	it('accepts a later finite duration without overwriting a manually entered cut', () => {
		act(() => useAppStore.setState({wizardDuration: undefined, wizardPreviewUrl: 'https://cdn.example/preview.mp4', wizardClipMode: 'range', wizardClipEnd: '00:05'}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="" title="Video" />)
		const video = container.querySelector('video')!
		Object.defineProperty(video, 'duration', {configurable: true, value: Number.POSITIVE_INFINITY})
		fireEvent.loadedMetadata(video)
		expect(useAppStore.getState().wizardDuration).toBeUndefined()
		Object.defineProperty(video, 'duration', {configurable: true, value: 8})
		fireEvent.durationChange(video)
		expect(useAppStore.getState()).toMatchObject({wizardDuration: 8, wizardClipEnd: '00:05'})
	})

	it('ignores duration events from a previous preview source', () => {
		act(() => useAppStore.setState({wizardDuration: undefined, wizardPreviewUrl: 'https://cdn.example/new.mp4'}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/old.mp4" thumbnail="" title="Video" />)
		const video = container.querySelector('video')!
		Object.defineProperty(video, 'duration', {configurable: true, value: 28})
		fireEvent.loadedMetadata(video)
		expect(useAppStore.getState().wizardDuration).toBeUndefined()
	})

	it('allows clearing and retyping the end time after entering range mode', () => {
		render(<ClipRangeSection thumbnail="" title="Video" />)
		fireEvent.click(screen.getByTestId('clip-range-custom'))
		fireEvent.change(screen.getByTestId('clip-end'), {target: {value: ''}})
		expect(screen.getByTestId('clip-end')).toHaveValue('')
		fireEvent.change(screen.getByTestId('clip-end'), {target: {value: '00:20.5'}})
		expect(screen.getByTestId('clip-summary')).toHaveTextContent('Clip length 00:20.5')
	})

	it('clears the old cut when changing to another source', () => {
		act(() => useAppStore.setState({wizardUrl: 'https://example.com/old', wizardClipMode: 'range', wizardClipStart: '00:20', wizardClipEnd: '00:40'}))
		act(() => useAppStore.getState().setWizardUrl('https://example.com/new'))
		expect(useAppStore.getState()).toMatchObject({wizardDuration: undefined, wizardClipMode: 'full', wizardClipStart: '00:00', wizardClipEnd: ''})
	})

	it('steps one preview frame and captures the precise position', () => {
		act(() => useAppStore.setState({wizardPreviewFps: 25}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="" title="Video" />)
		const video = container.querySelector('video')!
		vi.spyOn(video, 'pause').mockImplementation(() => undefined)
		fireEvent.change(screen.getByRole('slider', {name: 'Clip preview'}), {target: {value: '1'}})
		fireEvent.click(screen.getByRole('button', {name: 'Next frame'}))
		expect(video.currentTime).toBeCloseTo(1.04, 5)
		fireEvent.click(screen.getByRole('button', {name: 'Set start'}))
		expect(screen.getByTestId('clip-start')).toHaveValue('00:01.04')
		fireEvent.click(screen.getByRole('button', {name: 'Previous frame'}))
		expect(video.currentTime).toBeCloseTo(1, 5)
	})

	it('zooms and pans without changing the selected cut', () => {
		act(() => useAppStore.setState({wizardClipMode: 'range', wizardClipStart: '00:20', wizardClipEnd: '00:40'}))
		render(<ClipRangeSection thumbnail="" title="Video" />)
		fireEvent.click(screen.getByRole('button', {name: 'Zoom in'}))
		expect(screen.getByTestId('clip-zoom-level')).toHaveTextContent('2×')
		expect(screen.getByRole('slider', {name: 'Clip preview'})).toHaveAttribute('max', '106')
		fireEvent.change(screen.getByTestId('clip-pan'), {target: {value: '50'}})
		expect(screen.getByRole('slider', {name: 'Clip preview'})).toHaveAttribute('min', '50')
		expect(useAppStore.getState()).toMatchObject({wizardClipStart: '00:20', wizardClipEnd: '00:40'})
	})

	it('loops the selected range instead of pausing at its end', () => {
		act(() => useAppStore.setState({wizardClipMode: 'range', wizardClipStart: '00:02', wizardClipEnd: '00:05'}))
		const {container} = render(<ClipRangeSection previewUrl="https://cdn.example/preview.mp4" thumbnail="" title="Video" />)
		const video = container.querySelector('video')!
		const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)
		Object.defineProperty(video, 'paused', {configurable: true, value: false})
		fireEvent.click(screen.getByTestId('clip-loop'))
		video.currentTime = 5.1
		fireEvent.timeUpdate(video)
		expect(video.currentTime).toBe(2)
		expect(pause).not.toHaveBeenCalled()
	})
})

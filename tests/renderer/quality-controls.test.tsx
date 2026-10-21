import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vite-plus/test'
import {PresetStrip} from '@renderer/components/wizard/format/PresetStrip.js'
import {TooltipProvider} from '@renderer/components/ui/tooltip.js'

describe('simplified quality presets', () => {
	it('offers only best quality and audio-only in the main controls', () => {
		const onSelect = vi.fn()
		render(
			<TooltipProvider>
				<PresetStrip activePreset="best-quality" onSelect={onSelect} />
			</TooltipProvider>
		)
		expect(screen.getByText('Best quality')).toBeInTheDocument()
		expect(screen.getByText('Audio only')).toBeInTheDocument()
		expect(screen.queryByText('Balanced')).not.toBeInTheDocument()
		expect(screen.queryByText('Small file')).not.toBeInTheDocument()
		fireEvent.click(screen.getByText('Audio only'))
		expect(onSelect).toHaveBeenCalledWith('audio-only')
	})

	it('keeps the other presets available only in the advanced group', () => {
		const onSelect = vi.fn()
		render(
			<TooltipProvider>
				<PresetStrip activePreset="balanced" onSelect={onSelect} advanced />
			</TooltipProvider>
		)
		expect(screen.getByText('Balanced')).toBeInTheDocument()
		expect(screen.getByText('Small file')).toBeInTheDocument()
		expect(screen.getByText('Subtitles only')).toBeInTheDocument()
		expect(screen.queryByText('Best quality')).not.toBeInTheDocument()
		expect(screen.queryByText('Audio only')).not.toBeInTheDocument()
		fireEvent.click(screen.getByText('Small file'))
		expect(onSelect).toHaveBeenCalledWith('small-file')
	})
})

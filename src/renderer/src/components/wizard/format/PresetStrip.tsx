import type {ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import type {Preset} from '@shared/types.js'
import {Captions, FileDown, Music2, Scale, Star} from 'lucide-react'
import {presetOptions} from '../../../store/useAppStore.js'
import {ToggleGroup} from '../../ui/toggle-group.js'
import {OptionCard} from '../../shared/OptionCard.js'
import {Tooltip, TooltipTrigger, TooltipContent} from '../../ui/tooltip.js'
import {SectionLabel} from '../../shared/SectionLabel.js'

interface PresetStripProps {
	activePreset: Preset | null
	onSelect: (p: Preset) => void
	advanced?: boolean
}
const PRESET_ICONS: Record<Preset, typeof Star> = {'best-quality': Star, balanced: Scale, 'small-file': FileDown, 'audio-only': Music2, 'subtitle-only': Captions}

export function PresetStrip({activePreset, onSelect, advanced = false}: PresetStripProps): ReactNode {
	const {t} = useTranslation()
	const options = presetOptions().filter(option => (option.value !== 'best-quality' && option.value !== 'audio-only') === advanced)

	return (
		<div className="grabbit-presets" data-testid={advanced ? 'advanced-quality-presets' : 'quality-presets'}>
			<SectionLabel className="sr-only">{t('wizard.formats.quickPresets')}</SectionLabel>
			<ToggleGroup
				value={activePreset ? [activePreset] : []}
				onValueChange={vals => {
					if (vals[0]) onSelect(vals[0] as Preset)
				}}
				spacing={2}
				className={advanced ? 'grabbit-preset-grid grabbit-preset-grid-advanced' : 'grabbit-preset-grid'}
			>
				{options.map(p => {
					const Icon = PRESET_ICONS[p.value]
					return (
						<Tooltip key={p.value}>
							<TooltipTrigger render={props => <OptionCard {...props} value={p.value} icon={<Icon aria-hidden />} title={p.label} description={p.desc} className="grabbit-preset-card" />} />
							<TooltipContent>{p.desc}</TooltipContent>
						</Tooltip>
					)
				})}
			</ToggleGroup>
		</div>
	)
}

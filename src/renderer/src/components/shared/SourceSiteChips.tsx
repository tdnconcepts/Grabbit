import type {ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import IconYoutube from '~icons/simple-icons/youtube'
import IconInstagram from '~icons/simple-icons/instagram'
import IconTiktok from '~icons/simple-icons/tiktok'
import IconX from '~icons/simple-icons/x'
import IconFacebook from '~icons/simple-icons/facebook'

const SITES = [
	{name: 'YouTube', Icon: IconYoutube},
	{name: 'Instagram', Icon: IconInstagram},
	{name: 'TikTok', Icon: IconTiktok},
	{name: 'X', Icon: IconX},
	{name: 'Facebook', Icon: IconFacebook}
]

export function SourceSiteChips(): ReactNode {
	const {t} = useTranslation()
	return (
		<ul className="grabbit-sites" aria-label={t('wizard.url.features.heading')}>
			{SITES.map(({name, Icon}) => (
				<li key={name} data-site={name}>
					<Icon aria-hidden />
					<span>{name}</span>
				</li>
			))}
			<li>{t('wizard.url.features.anySite.heading')}</li>
		</ul>
	)
}

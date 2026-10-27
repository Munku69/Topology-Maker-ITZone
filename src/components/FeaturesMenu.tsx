import { Cable, EthernetPort, Network, Tags, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface FeaturesMenuProps {
  showCables: boolean
  portSelection: boolean
  showDeviceNames: boolean
  showIpAddresses: boolean
  onShowCablesChange: (value: boolean) => void
  onPortSelectionChange: (value: boolean) => void
  onShowDeviceNamesChange: (value: boolean) => void
  onShowIpAddressesChange: (value: boolean) => void
}

function FeatureToggle({ icon, title, description, checked, onChange }: {
  icon: ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="feature-option">
      <span className="feature-option__icon">{icon}</span>
      <span className="feature-option__copy"><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="feature-switch" aria-hidden="true"><span /></span>
    </label>
  )
}

export function FeaturesMenu(props: FeaturesMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick, true)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick, true)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <details ref={menuRef} className="features-menu" open={open}>
      <summary className="toolbar-button" title="Topology display and connection features" onClick={(event) => { event.preventDefault(); setOpen((current) => !current) }}><SlidersHorizontal size={16} /><span>Features</span></summary>
      <div className="features-menu__panel">
        <div className="features-menu__heading"><p className="eyebrow">Workspace</p><strong>Features</strong></div>
        <FeatureToggle icon={<Cable size={17} />} title="Show cables" description="Display links on the canvas" checked={props.showCables} onChange={props.onShowCablesChange} />
        <FeatureToggle icon={<Tags size={17} />} title="Device names" description="Show device names below icons" checked={props.showDeviceNames} onChange={props.onShowDeviceNamesChange} />
        <FeatureToggle icon={<Network size={17} />} title="IP addresses" description="Show management IP addresses" checked={props.showIpAddresses} onChange={props.onShowIpAddressesChange} />
        <FeatureToggle icon={<EthernetPort size={17} />} title="Choose ports" description="Ask for a port at each endpoint" checked={props.portSelection} onChange={props.onPortSelectionChange} />
        <p className="features-menu__note">Preferences are saved in this browser.</p>
      </div>
    </details>
  )
}

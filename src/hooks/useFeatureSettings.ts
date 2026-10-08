import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'network-topology-features'

export interface FeatureSettings {
  showCables: boolean
  portSelection: boolean
  showDeviceLabels: boolean
}

const defaults: FeatureSettings = {
  showCables: true,
  portSelection: false,
  showDeviceLabels: true,
}

function loadSettings(): FeatureSettings {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaults
    const value = JSON.parse(saved) as Partial<FeatureSettings>
    return {
      showCables: typeof value.showCables === 'boolean' ? value.showCables : defaults.showCables,
      portSelection: typeof value.portSelection === 'boolean' ? value.portSelection : defaults.portSelection,
      showDeviceLabels: typeof value.showDeviceLabels === 'boolean' ? value.showDeviceLabels : defaults.showDeviceLabels,
    }
  } catch {
    return defaults
  }
}

export function useFeatureSettings() {
  const [settings, setSettings] = useState<FeatureSettings>(loadSettings)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // The editor still works if browser storage is unavailable.
    }
  }, [settings])

  const setFeature = useCallback(<Key extends keyof FeatureSettings>(key: Key, value: FeatureSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }, [])

  return { settings, setFeature }
}

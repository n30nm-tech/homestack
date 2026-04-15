'use client'

import { useState, useRef } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'

const OS_LIST = [
  // Debian-based
  'Debian 12 (Bookworm)',
  'Debian 11 (Bullseye)',
  'Ubuntu 24.04 LTS',
  'Ubuntu 22.04 LTS',
  'Ubuntu 20.04 LTS',
  // RHEL-based
  'Rocky Linux 9',
  'AlmaLinux 9',
  'Fedora 41',
  'CentOS Stream 9',
  // Lightweight
  'Alpine Linux 3.21',
  'Alpine Linux 3.20',
  // Arch
  'Arch Linux',
  // BSD / NAS / storage
  'TrueNAS SCALE 24.10',
  'TrueNAS CORE 13',
  'FreeBSD 14',
  // Virtualisation
  'Proxmox VE 8.3',
  'Proxmox VE 8.2',
  'Proxmox VE 7.4',
  'XCP-ng 8.3',
  // Networking / firewall
  'pfSense 2.7',
  'OPNsense 24.7',
  'OpenWrt 23.05',
  // Network devices
  'UniFi Network 8.x',
  'UniFi AP Firmware 6.x',
  'Cisco IOS',
  'Cisco NX-OS',
  // Windows
  'Windows Server 2022',
  'Windows Server 2019',
  'Windows 11',
  'Windows 10',
  // macOS
  'macOS Sequoia 15',
  'macOS Sonoma 14',
  'macOS Ventura 13',
  // Other
  'openSUSE Leap 15.6',
  'Raspberry Pi OS (Bookworm)',
]

interface OsComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function OsCombobox({ value, onChange, placeholder = 'e.g. Debian 12, Ubuntu 24.04…' }: OsComboboxProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = value.trim()
    ? OS_LIST.filter(os => os.toLowerCase().includes(value.toLowerCase()))
    : OS_LIST

  function select(os: string) {
    onChange(os)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <Popover.Root open={open && filtered.length > 0} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <Input
          ref={inputRef}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
          placeholder={placeholder}
          className="font-mono text-xs"
        />
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={e => e.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)] max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50 outline-none p-1"
        >
          {filtered.map(os => (
            <button
              key={os}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(os) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors"
            >
              {value === os && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              <span className={`font-mono text-xs ${value === os ? 'text-primary' : ''}`}>{os}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

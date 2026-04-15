import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Status, BackupStatus, DeviceType, VirtualHostType } from '@prisma/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_LABELS: Record<Status, string> = {
  ACTIVE: 'Active',
  OFFLINE: 'Offline',
  WARNING: 'Warning',
  BUILD_IN_PROGRESS: 'Build in Progress',
  RETIRED: 'Retired',
  UNKNOWN: 'Unknown',
}

export const STATUS_COLORS: Record<Status, string> = {
  ACTIVE: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  OFFLINE: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  WARNING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  BUILD_IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  RETIRED: 'text-zinc-600 bg-zinc-600/10 border-zinc-600/20',
  UNKNOWN: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
}

export const STATUS_DOT: Record<Status, string> = {
  ACTIVE: 'bg-emerald-400',
  OFFLINE: 'bg-zinc-500',
  WARNING: 'bg-amber-400',
  BUILD_IN_PROGRESS: 'bg-blue-400',
  RETIRED: 'bg-zinc-700',
  UNKNOWN: 'bg-zinc-600',
}

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
  SUCCESS: 'Success',
  FAILED: 'Failed',
  RUNNING: 'Running',
  UNKNOWN: 'Unknown',
}

export const BACKUP_STATUS_COLORS: Record<BackupStatus, string> = {
  SUCCESS: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
  RUNNING: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  UNKNOWN: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  FIREWALL: 'Firewall',
  SWITCH: 'Switch',
  ACCESS_POINT: 'Access Point',
  ROUTER: 'Router',
  SERVER: 'Server',
  NAS: 'NAS',
  OTHER: 'Other',
}

export const VHOST_TYPE_LABELS: Record<VirtualHostType, string> = {
  PROXMOX: 'Proxmox',
  HYPER_V: 'Hyper-V',
  ESXI: 'ESXi',
  KVM: 'KVM',
  VIRTUALBOX: 'VirtualBox',
  OTHER: 'Other',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function formatMB(mb: number): string {
  const gb = mb / 1024
  if (Number.isInteger(gb)) return `${gb} GB`
  return `${gb.toFixed(1)} GB`
}

export function getHostingSummary(item: {
  device?: { name: string } | null
  virtualHost?: { name: string } | null
  vm?: { name: string } | null
  lxc?: { name: string } | null
  dockerHost?: { name: string } | null
}): string {
  if (item.dockerHost) return `Docker — ${item.dockerHost.name}`
  if (item.lxc) return `LXC — ${item.lxc.name}`
  if (item.vm) return `VM — ${item.vm.name}`
  if (item.virtualHost) return item.virtualHost.name
  if (item.device) return item.device.name
  return 'Unassigned'
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

/** Ensure a URL has a protocol so it opens as an absolute link, not a relative path. */
export function ensureUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `http://${url}`
}

const ICON_CDN = 'https://cdn.jsdelivr.net/gh/selfhst/icons@main'

/** Return the WebP URL for a selfh.st icon reference slug. */
export function iconUrl(reference: string): string {
  return `${ICON_CDN}/webp/${reference}.webp`
}

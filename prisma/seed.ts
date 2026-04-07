import { PrismaClient, Status, DeviceType, VirtualHostType, BackupStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding HomeStack demo data...')

  // ─── Admin user ────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'homestack', 12)
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? 'admin@homestack.local' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL ?? 'admin@homestack.local',
      password: hashedPassword,
      name: 'Admin',
    },
  })

  // ─── Tags ─────────────────────────────────────────────────────────────────
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: 'production' }, update: {}, create: { name: 'production', color: '#ef4444' } }),
    prisma.tag.upsert({ where: { name: 'media' }, update: {}, create: { name: 'media', color: '#8b5cf6' } }),
    prisma.tag.upsert({ where: { name: 'monitoring' }, update: {}, create: { name: 'monitoring', color: '#f59e0b' } }),
    prisma.tag.upsert({ where: { name: 'networking' }, update: {}, create: { name: 'networking', color: '#06b6d4' } }),
    prisma.tag.upsert({ where: { name: 'storage' }, update: {}, create: { name: 'storage', color: '#10b981' } }),
    prisma.tag.upsert({ where: { name: 'security' }, update: {}, create: { name: 'security', color: '#f97316' } }),
    prisma.tag.upsert({ where: { name: 'automation' }, update: {}, create: { name: 'automation', color: '#6366f1' } }),
  ])

  const [tagProd, tagMedia, tagMonitoring, tagNetworking, tagStorage, tagSecurity, tagAutomation] = tags

  // ─── Devices ──────────────────────────────────────────────────────────────
  const firewall = await prisma.device.upsert({
    where: { id: 'device-firewall' },
    update: {},
    create: {
      id: 'device-firewall',
      name: 'pfSense Firewall',
      type: DeviceType.FIREWALL,
      brand: 'Protectli',
      model: 'VP2420',
      hostname: 'pfsense.lan',
      managementIp: '192.168.1.1',
      mainIp: '192.168.1.1',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      serialNumber: 'PRTL-2024-001',
      location: 'Server Rack - U1',
      rackRoom: 'Home Office',
      role: 'Primary firewall and router',
      os: 'pfSense 2.7.2',
      status: Status.ACTIVE,
      favourite: true,
      notes: 'Main firewall for the homelab. Handles all routing, VLANs, and firewall rules.',
      tags: { connect: [{ id: tagNetworking.id }, { id: tagSecurity.id }] },
    },
  })

  const coreSwitch = await prisma.device.upsert({
    where: { id: 'device-switch' },
    update: {},
    create: {
      id: 'device-switch',
      name: 'Core Switch',
      type: DeviceType.SWITCH,
      brand: 'UniFi',
      model: 'USW-Pro-24-POE',
      hostname: 'switch-core.lan',
      managementIp: '192.168.1.2',
      mainIp: '192.168.1.2',
      location: 'Server Rack - U2',
      rackRoom: 'Home Office',
      role: '24-port managed PoE switch, core network',
      os: 'UniFi Network 8.x',
      status: Status.ACTIVE,
      notes: 'Core switch with PoE for APs and cameras. 10G uplink to Proxmox.',
      tags: { connect: [{ id: tagNetworking.id }] },
    },
  })

  const ap = await prisma.device.upsert({
    where: { id: 'device-ap' },
    update: {},
    create: {
      id: 'device-ap',
      name: 'Living Room AP',
      type: DeviceType.ACCESS_POINT,
      brand: 'UniFi',
      model: 'U6 Pro',
      hostname: 'ap-lr.lan',
      managementIp: '192.168.1.10',
      location: 'Living Room - Ceiling',
      role: 'Primary WiFi access point',
      os: 'UniFi AP Firmware 6.x',
      status: Status.ACTIVE,
      tags: { connect: [{ id: tagNetworking.id }] },
    },
  })

  const nas = await prisma.device.upsert({
    where: { id: 'device-nas' },
    update: {},
    create: {
      id: 'device-nas',
      name: 'TrueNAS Scale',
      type: DeviceType.NAS,
      brand: 'Custom Build',
      model: 'Tower NAS',
      hostname: 'truenas.lan',
      managementIp: '192.168.10.5',
      mainIp: '192.168.10.5',
      serialNumber: 'NAS-2023-001',
      location: 'Server Rack - U6',
      rackRoom: 'Home Office',
      role: 'Primary network attached storage',
      os: 'TrueNAS SCALE 24.10',
      status: Status.ACTIVE,
      favourite: true,
      notes: 'Main storage for media, backups, and VMs. 6x4TB drives in RAIDZ2. 64GB ECC RAM.',
      setupNotes: 'Pools: tank (media/data), backup (offsite snapshots). SMB shares configured for Plex and Time Machine.',
      tags: { connect: [{ id: tagStorage.id }, { id: tagProd.id }] },
    },
  })

  const proxmoxServer = await prisma.device.upsert({
    where: { id: 'device-proxmox' },
    update: {},
    create: {
      id: 'device-proxmox',
      name: 'Proxmox Server',
      type: DeviceType.SERVER,
      brand: 'Custom Build',
      model: 'Tower Server',
      hostname: 'proxmox.lan',
      managementIp: '192.168.10.2',
      mainIp: '192.168.10.2',
      location: 'Server Rack - U4',
      rackRoom: 'Home Office',
      role: 'Primary hypervisor running all VMs and LXCs',
      os: 'Proxmox VE 8.3',
      status: Status.ACTIVE,
      favourite: true,
      notes: 'Intel i9-13900K, 128GB DDR5 ECC RAM, 2TB NVMe boot pool, 10G NIC.',
      tags: { connect: [{ id: tagProd.id }] },
    },
  })

  // ─── VLANs ─────────────────────────────────────────────────────────────────
  const vlanManagement = await prisma.vLAN.upsert({
    where: { id: 'vlan-mgmt' },
    update: {},
    create: {
      id: 'vlan-mgmt',
      name: 'Management',
      vlanId: 1,
      subnet: '192.168.1.0/24',
      gateway: '192.168.1.1',
      purpose: 'Network infrastructure management',
      dhcpRange: '192.168.1.100 - 192.168.1.200',
      dnsServer: '192.168.1.1',
      internetAccess: true,
      devices: { connect: [{ id: firewall.id }, { id: coreSwitch.id }, { id: ap.id }] },
    },
  })

  const vlanServers = await prisma.vLAN.upsert({
    where: { id: 'vlan-servers' },
    update: {},
    create: {
      id: 'vlan-servers',
      name: 'Servers',
      vlanId: 10,
      subnet: '192.168.10.0/24',
      gateway: '192.168.10.1',
      purpose: 'Servers and homelab infrastructure',
      dnsServer: '192.168.10.2',
      internetAccess: true,
      devices: { connect: [{ id: proxmoxServer.id }, { id: nas.id }] },
    },
  })

  const vlanIoT = await prisma.vLAN.upsert({
    where: { id: 'vlan-iot' },
    update: {},
    create: {
      id: 'vlan-iot',
      name: 'IoT',
      vlanId: 20,
      subnet: '192.168.20.0/24',
      gateway: '192.168.20.1',
      purpose: 'Smart home devices, isolated from main network',
      internetAccess: true,
      notes: 'No access to servers VLAN. Blocked from management VLAN.',
    },
  })

  // ─── Virtual Host (Proxmox) ────────────────────────────────────────────────
  const proxmoxHost = await prisma.virtualHost.upsert({
    where: { id: 'vhost-proxmox' },
    update: {},
    create: {
      id: 'vhost-proxmox',
      name: 'Proxmox PVE',
      type: VirtualHostType.PROXMOX,
      hostname: 'proxmox.lan',
      ip: '192.168.10.2',
      os: 'Debian 12 (Proxmox VE)',
      version: '8.3.1',
      cpu: 24,
      ram: 131072,
      storage: '2TB NVMe + NAS NFS',
      deviceId: proxmoxServer.id,
      status: Status.ACTIVE,
      favourite: true,
      notes: 'Main Proxmox node. Manages all VMs and LXCs in the homelab.',
      tags: { connect: [{ id: tagProd.id }] },
    },
  })

  // ─── VMs ──────────────────────────────────────────────────────────────────
  const vmDocker = await prisma.vM.upsert({
    where: { id: 'vm-docker' },
    update: {},
    create: {
      id: 'vm-docker',
      name: 'Docker VM',
      vmid: '100',
      hostname: 'docker.lan',
      ip: '192.168.10.10',
      os: 'Ubuntu 24.04 LTS',
      cpu: 8,
      ram: 16384,
      disk: 100,
      status: Status.ACTIVE,
      favourite: true,
      hostId: proxmoxHost.id,
      notes: 'Primary Docker host running production services.',
      tags: { connect: [{ id: tagProd.id }] },
    },
  })

  const vmDev = await prisma.vM.upsert({
    where: { id: 'vm-dev' },
    update: {},
    create: {
      id: 'vm-dev',
      name: 'Dev VM',
      vmid: '101',
      hostname: 'dev.lan',
      ip: '192.168.10.11',
      os: 'Ubuntu 24.04 LTS',
      cpu: 4,
      ram: 8192,
      disk: 50,
      status: Status.ACTIVE,
      hostId: proxmoxHost.id,
      notes: 'Development environment. Used for testing before production deployment.',
    },
  })

  // ─── LXCs ─────────────────────────────────────────────────────────────────
  const lxcNginx = await prisma.lXC.upsert({
    where: { id: 'lxc-nginx' },
    update: {},
    create: {
      id: 'lxc-nginx',
      name: 'Nginx Proxy Manager',
      ctid: '200',
      hostname: 'npm.lan',
      ip: '192.168.10.20',
      os: 'Debian 12',
      cpu: 2,
      ram: 512,
      disk: 8,
      status: Status.ACTIVE,
      hostId: proxmoxHost.id,
      notes: 'Nginx Proxy Manager for reverse proxying all services.',
      tags: { connect: [{ id: tagNetworking.id }, { id: tagProd.id }] },
    },
  })

  const lxcPihole = await prisma.lXC.upsert({
    where: { id: 'lxc-pihole' },
    update: {},
    create: {
      id: 'lxc-pihole',
      name: 'Pi-hole',
      ctid: '201',
      hostname: 'pihole.lan',
      ip: '192.168.10.21',
      os: 'Debian 12',
      cpu: 1,
      ram: 256,
      disk: 4,
      status: Status.ACTIVE,
      hostId: proxmoxHost.id,
      notes: 'Network-wide ad blocking and local DNS.',
      tags: { connect: [{ id: tagNetworking.id }, { id: tagSecurity.id }] },
    },
  })

  // ─── Docker Host ───────────────────────────────────────────────────────────
  const dockerHost = await prisma.dockerHost.upsert({
    where: { id: 'docker-main' },
    update: {},
    create: {
      id: 'docker-main',
      name: 'Docker Main',
      hostname: 'docker.lan',
      ip: '192.168.10.10',
      status: Status.ACTIVE,
      vmId: vmDocker.id,
      notes: 'Main Docker daemon. Uses Compose for all service definitions.',
    },
  })

  // ─── Services ─────────────────────────────────────────────────────────────
  await prisma.service.upsert({
    where: { id: 'svc-plex' },
    update: {},
    create: {
      id: 'svc-plex',
      name: 'Plex Media Server',
      url: 'https://plex.home.example.com',
      status: Status.ACTIVE,
      description: 'Media server for movies, TV shows, and music.',
      ip: '192.168.10.10',
      port: 32400,
      category: 'Media',
      favourite: true,
      dockerHostId: dockerHost.id,
      dockerCompose: `version: '3.8'
services:
  plex:
    image: lscr.io/linuxserver/plex:latest
    container_name: plex
    network_mode: host
    environment:
      - PUID=1000
      - PGID=1000
      - VERSION=docker
      - PLEX_CLAIM=\${PLEX_CLAIM}
    volumes:
      - /opt/plex/config:/config
      - /mnt/media/tv:/tv
      - /mnt/media/movies:/movies
    restart: unless-stopped`,
      envVars: `PUID=1000
PGID=1000
VERSION=docker
PLEX_CLAIM=claim-xxxxxxxxxxxxxxxxxxxx`,
      setupSteps: `1. Mount NAS media share at /mnt/media via NFS
2. Deploy with docker compose up -d
3. Navigate to http://ip:32400/web to complete setup
4. Add libraries pointing to /tv and /movies`,
      notes: 'Primary media server. Libraries include 2TB of movies and TV. Hardware transcoding enabled with Intel QuickSync.',
      tags: { connect: [{ id: tagMedia.id }, { id: tagProd.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-jellyfin' },
    update: {},
    create: {
      id: 'svc-jellyfin',
      name: 'Jellyfin',
      url: 'https://jellyfin.home.example.com',
      status: Status.ACTIVE,
      description: 'Open source media server, alternative to Plex.',
      ip: '192.168.10.10',
      port: 8096,
      category: 'Media',
      dockerHostId: dockerHost.id,
      dockerCompose: `version: '3.8'
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    user: 1000:1000
    network_mode: host
    volumes:
      - /opt/jellyfin/config:/config
      - /opt/jellyfin/cache:/cache
      - /mnt/media:/media
    restart: unless-stopped`,
      notes: 'Secondary media server for users who prefer open source.',
      tags: { connect: [{ id: tagMedia.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-grafana' },
    update: {},
    create: {
      id: 'svc-grafana',
      name: 'Grafana',
      url: 'https://grafana.home.example.com',
      status: Status.ACTIVE,
      description: 'Metrics visualisation and dashboards.',
      ip: '192.168.10.10',
      port: 3000,
      category: 'Monitoring',
      favourite: true,
      dockerHostId: dockerHost.id,
      notes: 'Connected to Prometheus. Dashboards for network, server, and service metrics.',
      tags: { connect: [{ id: tagMonitoring.id }, { id: tagProd.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-prometheus' },
    update: {},
    create: {
      id: 'svc-prometheus',
      name: 'Prometheus',
      url: 'http://192.168.10.10:9090',
      status: Status.ACTIVE,
      description: 'Metrics collection and alerting.',
      ip: '192.168.10.10',
      port: 9090,
      category: 'Monitoring',
      dockerHostId: dockerHost.id,
      notes: 'Scrapes metrics from node exporters, cAdvisor, and other exporters.',
      tags: { connect: [{ id: tagMonitoring.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-portainer' },
    update: {},
    create: {
      id: 'svc-portainer',
      name: 'Portainer',
      url: 'https://portainer.home.example.com',
      status: Status.ACTIVE,
      description: 'Docker management UI.',
      ip: '192.168.10.10',
      port: 9000,
      category: 'Infrastructure',
      favourite: true,
      dockerHostId: dockerHost.id,
      dockerCompose: `version: '3.8'
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    restart: unless-stopped

volumes:
  portainer_data:`,
      tags: { connect: [{ id: tagProd.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-homeassistant' },
    update: {},
    create: {
      id: 'svc-homeassistant',
      name: 'Home Assistant',
      url: 'https://ha.home.example.com',
      status: Status.ACTIVE,
      description: 'Smart home automation platform.',
      ip: '192.168.10.10',
      port: 8123,
      category: 'Automation',
      favourite: true,
      dockerHostId: dockerHost.id,
      notes: 'Controls all smart home devices. Integrations: Zigbee (via Zigbee2MQTT), Google Home, Apple HomeKit bridge.',
      tags: { connect: [{ id: tagAutomation.id }, { id: tagProd.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-pihole' },
    update: {},
    create: {
      id: 'svc-pihole',
      name: 'Pi-hole',
      url: 'http://192.168.10.21/admin',
      status: Status.ACTIVE,
      description: 'Network-wide ad blocking and local DNS resolver.',
      ip: '192.168.10.21',
      port: 80,
      category: 'Networking',
      lxcId: lxcPihole.id,
      notes: 'Primary DNS for all VLANs. Blocks ~30% of DNS queries. Also handles local DNS entries.',
      tags: { connect: [{ id: tagNetworking.id }, { id: tagSecurity.id }] },
    },
  })

  await prisma.service.upsert({
    where: { id: 'svc-npm' },
    update: {},
    create: {
      id: 'svc-npm',
      name: 'Nginx Proxy Manager',
      url: 'http://192.168.10.20:81',
      status: Status.ACTIVE,
      description: 'Reverse proxy with web UI and automatic SSL.',
      ip: '192.168.10.20',
      port: 81,
      category: 'Networking',
      lxcId: lxcNginx.id,
      notes: 'Handles all HTTPS termination and reverse proxying. Certificates from Let\'s Encrypt via DNS challenge.',
      tags: { connect: [{ id: tagNetworking.id }, { id: tagSecurity.id }] },
    },
  })

  // ─── Reverse Proxy records ─────────────────────────────────────────────────
  await prisma.reverseProxy.upsert({
    where: { id: 'proxy-plex' },
    update: {},
    create: {
      id: 'proxy-plex',
      name: 'plex.home.example.com',
      domain: 'plex.home.example.com',
      serviceId: 'svc-plex',
      targetIp: '192.168.10.10',
      targetPort: 32400,
      ssl: true,
      notes: 'SSL via Let\'s Encrypt. DNS challenge through Cloudflare.',
    },
  })

  await prisma.reverseProxy.upsert({
    where: { id: 'proxy-grafana' },
    update: {},
    create: {
      id: 'proxy-grafana',
      name: 'grafana.home.example.com',
      domain: 'grafana.home.example.com',
      serviceId: 'svc-grafana',
      targetIp: '192.168.10.10',
      targetPort: 3000,
      ssl: true,
    },
  })

  // ─── DNS Records ───────────────────────────────────────────────────────────
  await prisma.dNSRecord.upsert({
    where: { id: 'dns-proxmox' },
    update: {},
    create: {
      id: 'dns-proxmox',
      ip: '192.168.10.2',
      recordName: 'proxmox',
      domain: 'lan',
      serviceId: null,
    },
  })

  await prisma.dNSRecord.upsert({
    where: { id: 'dns-nas' },
    update: {},
    create: {
      id: 'dns-nas',
      ip: '192.168.10.5',
      recordName: 'truenas',
      domain: 'lan',
    },
  })

  // ─── Backup Jobs ───────────────────────────────────────────────────────────
  await prisma.backupJob.upsert({
    where: { id: 'backup-proxmox-vms' },
    update: {},
    create: {
      id: 'backup-proxmox-vms',
      name: 'Proxmox VM Backups',
      description: 'Daily backups of all VMs via Proxmox Backup Server.',
      destination: 'NAS - /tank/proxmox-backups',
      backupType: 'Incremental (PBS)',
      schedule: 'Daily at 03:00',
      retention: '7 daily, 4 weekly, 3 monthly',
      lastRun: new Date('2026-04-05T03:00:00Z'),
      status: BackupStatus.SUCCESS,
      tool: 'Proxmox Backup Server',
      virtualHostId: proxmoxHost.id,
      notes: 'Uses Proxmox Backup Server deduplication. Typical backup ~500MB per VM.',
    },
  })

  await prisma.backupJob.upsert({
    where: { id: 'backup-nas-config' },
    update: {},
    create: {
      id: 'backup-nas-config',
      name: 'TrueNAS Config Backup',
      description: 'Daily export of TrueNAS configuration to offsite S3.',
      destination: 'Backblaze B2 - homelab-configs bucket',
      backupType: 'Full (config export)',
      schedule: 'Daily at 04:00',
      retention: '30 days',
      lastRun: new Date('2026-04-05T04:00:00Z'),
      status: BackupStatus.SUCCESS,
      tool: 'TrueNAS built-in + rclone',
      deviceId: nas.id,
    },
  })

  await prisma.backupJob.upsert({
    where: { id: 'backup-docker-volumes' },
    update: {},
    create: {
      id: 'backup-docker-volumes',
      name: 'Docker Volume Backups',
      description: 'Weekly backup of all Docker named volumes.',
      destination: 'NAS - /tank/docker-backups',
      backupType: 'Full archive',
      schedule: 'Weekly on Sunday at 02:00',
      retention: '4 weeks',
      lastRun: new Date('2026-03-30T02:00:00Z'),
      status: BackupStatus.SUCCESS,
      tool: 'docker-volume-backup',
      vmId: vmDocker.id,
    },
  })

  // ─── Documentation Pages ───────────────────────────────────────────────────
  await prisma.documentationPage.upsert({
    where: { id: 'doc-network-overview' },
    update: {},
    create: {
      id: 'doc-network-overview',
      title: 'Network Overview',
      content: `# Network Overview

The homelab network is built around a pfSense firewall with VLAN segmentation. All traffic is managed through a UniFi 24-port PoE switch.

## Architecture

The network is divided into three main VLANs:
- **VLAN 1 - Management**: Network devices and infrastructure management
- **VLAN 10 - Servers**: Homelab servers, VMs, and LXCs
- **VLAN 20 - IoT**: Smart home devices, isolated from other VLANs

## DNS

Pi-hole runs on LXC 201 and serves as the primary DNS for all VLANs. It provides ad blocking and local DNS resolution.

## External Access

All external access is handled through Nginx Proxy Manager running on LXC 200. All services are published via HTTPS with Let's Encrypt certificates.`,
      tags: { connect: [{ id: tagNetworking.id }] },
    },
  })

  await prisma.documentationPage.upsert({
    where: { id: 'doc-backup-strategy' },
    update: {},
    create: {
      id: 'doc-backup-strategy',
      title: 'Backup Strategy',
      content: `# Backup Strategy

The homelab follows a 3-2-1 backup strategy where possible.

## Rule

- **3** copies of data
- **2** different storage media
- **1** offsite copy

## VM Backups

All Proxmox VMs are backed up daily to the TrueNAS via Proxmox Backup Server. Incremental backups with deduplication keep storage usage manageable.

## Config Backups

All service configs are stored in /opt on the Docker VM and backed up weekly. TrueNAS config is exported daily to Backblaze B2.`,
      tags: { connect: [{ id: tagStorage.id }] },
    },
  })

  console.log('✅ Demo data seeded successfully!')
  console.log(`\n🔐 Login: ${process.env.ADMIN_EMAIL ?? 'admin@homestack.local'} / ${process.env.ADMIN_PASSWORD ?? 'homestack'}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

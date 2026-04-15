import * as net from 'net'

export interface CheckResult {
  online: boolean
  responseMs: number
}

// HTTP check — fetches the URL and considers anything < 500 as online
export async function checkHttp(url: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
      // Don't follow redirects to external — still counts as up
      redirect: 'follow',
    })
    return { online: res.status < 500, responseMs: Date.now() - start }
  } catch {
    // Fallback: try GET if HEAD fails (some servers reject HEAD)
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      })
      return { online: res.status < 500, responseMs: Date.now() - start }
    } catch {
      return { online: false, responseMs: Date.now() - start }
    }
  }
}

// TCP check — tries to open a connection on the given port
export function checkTcp(host: string, port: number): Promise<CheckResult> {
  const start = Date.now()
  return new Promise(resolve => {
    const socket = new net.Socket()
    let done = false

    function finish(online: boolean) {
      if (done) return
      done = true
      socket.destroy()
      resolve({ online, responseMs: Date.now() - start })
    }

    socket.setTimeout(5000)
    socket.connect(port, host, () => finish(true))
    socket.on('error', () => finish(false))
    socket.on('timeout', () => finish(false))
  })
}

// Device check — tries common admin ports in order, returns on first success
const DEVICE_PORTS = [22, 80, 443, 8080, 8443]

export async function checkDevice(ip: string): Promise<CheckResult> {
  const start = Date.now()
  for (const port of DEVICE_PORTS) {
    const result = await checkTcp(ip, port)
    if (result.online) return { online: true, responseMs: Date.now() - start }
  }
  return { online: false, responseMs: Date.now() - start }
}

// Decide what kind of check to run for a service
export async function checkService(service: {
  url: string | null
  ip: string | null
  port: number | null
}): Promise<CheckResult> {
  if (service.url) return checkHttp(service.url)
  if (service.ip && service.port) return checkTcp(service.ip, service.port)
  if (service.ip) return checkDevice(service.ip)
  return { online: false, responseMs: 0 }
}

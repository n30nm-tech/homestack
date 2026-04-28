import { execSync } from 'child_process'

function getGitInfo() {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim()
    const hash  = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    return { count, hash }
  } catch {
    return { count: '0', hash: 'unknown' }
  }
}

const { count, hash } = getGitInfo()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  env: {
    NEXT_PUBLIC_BUILD_NUMBER: count,
    NEXT_PUBLIC_BUILD_HASH:   hash,
  },
}

export default nextConfig

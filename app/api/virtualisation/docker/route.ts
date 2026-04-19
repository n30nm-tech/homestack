import { NextResponse } from 'next/server'

// DockerHost no longer exists as a separate entity.
export async function GET() {
  return NextResponse.json([])
}

export async function POST() {
  return NextResponse.json({ error: 'Docker hosts are no longer used.' }, { status: 410 })
}

import { NextResponse } from 'next/server'

// LXCs no longer exist as a separate entity — services carry ctid/hasDocker directly.
export async function GET() {
  return NextResponse.json([])
}

export async function POST() {
  return NextResponse.json({ error: 'LXCs are no longer used. Create a Service instead.' }, { status: 410 })
}

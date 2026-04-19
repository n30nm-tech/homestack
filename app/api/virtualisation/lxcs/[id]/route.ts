import { NextResponse } from 'next/server'

// LXCs no longer exist as a separate entity.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
export async function PATCH() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

import { notFound } from 'next/navigation'

// LXCs are no longer separate entities — services now carry ctid/hasDocker directly.
export default function LXCDetailPage() {
  notFound()
}

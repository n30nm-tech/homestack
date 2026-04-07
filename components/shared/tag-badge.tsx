import { cn } from '@/lib/utils'

interface Tag {
  id: string
  name: string
  color?: string | null
}

interface TagBadgeProps {
  tag: Tag
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', className)}
      style={
        tag.color
          ? {
              borderColor: `${tag.color}30`,
              backgroundColor: `${tag.color}15`,
              color: tag.color,
            }
          : undefined
      }
    >
      {tag.name}
    </span>
  )
}

interface TagListProps {
  tags: Tag[]
  className?: string
}

export function TagList({ tags, className }: TagListProps) {
  if (!tags.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  )
}

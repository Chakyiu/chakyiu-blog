import Link from 'next/link'
import type { TagView } from '@/types'

interface TagBadgeProps {
  tag: TagView
  asLink?: boolean
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function TagBadge({ tag, asLink = false }: TagBadgeProps) {
  const bgColor = tag.color ?? '#6e7781'
  const textColor = getContrastColor(bgColor)

  const badge = (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {tag.name}
    </span>
  )

  if (asLink) {
    return (
      <Link href={`/?tag=${tag.slug}`} className="hover:opacity-80">
        {badge}
      </Link>
    )
  }

  return badge
}

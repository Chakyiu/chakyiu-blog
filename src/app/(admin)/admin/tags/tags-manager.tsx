'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TagBadge } from '@/components/blog/tag-badge'
import { createTag, updateTag, deleteTag } from '@/lib/actions/tags'
import type { TagView } from '@/types'
import { TAG_COLOR_PALETTE } from '@/lib/validators/tag'

interface TagsManagerProps {
  initialTags: TagView[]
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#000' : 'transparent',
            outline: value === color ? '2px solid #000' : 'none',
            outlineOffset: '1px',
          }}
          title={color}
        />
      ))}
    </div>
  )
}

interface TagFormState {
  name: string
  color: string
}

function TagFormDialog({
  trigger,
  title,
  initialValues,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode
  title: string
  initialValues: TagFormState
  onSubmit: (values: TagFormState) => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<TagFormState>(initialValues)

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) setValues(initialValues)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="tag-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="tag-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. React"
              required
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <ColorPicker
              value={values.color}
              onChange={(color) => setValues((v) => ({ ...v, color }))}
            />
            <p className="text-xs text-muted-foreground">{values.color}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !values.name.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TagsManager({ initialTags }: TagsManagerProps) {
  const [tags, setTags] = useState<TagView[]>(initialTags)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const defaultColor = TAG_COLOR_PALETTE[0]

  function handleCreate(values: TagFormState) {
    setError(null)
    startTransition(async () => {
      const result = await createTag(values.name, values.color)
      if (!result.success) {
        setError(result.error)
        return
      }
      setTags((prev) => [...prev, result.data])
    })
  }

  function handleUpdate(tagId: string, values: TagFormState) {
    setError(null)
    startTransition(async () => {
      const result = await updateTag(tagId, values.name, values.color)
      if (!result.success) {
        setError(result.error)
        return
      }
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, name: result.data.name, slug: result.data.slug, color: result.data.color } : t))
      )
    })
  }

  function handleDelete(tagId: string, tagName: string) {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all posts.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteTag(tagId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setTags((prev) => prev.filter((t) => t.id !== tagId))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-sm text-muted-foreground mt-1">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        </div>
        <TagFormDialog
          trigger={<Button size="sm">New Tag</Button>}
          title="Create Tag"
          initialValues={{ name: '', color: defaultColor }}
          onSubmit={handleCreate}
          isPending={isPending}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {tags.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No tags yet. Create your first tag.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Tag</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-right px-4 py-3 font-medium">Posts</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <TagBadge tag={tag} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tag.slug}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{tag.postCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <TagFormDialog
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                        title={`Edit "${tag.name}"`}
                        initialValues={{ name: tag.name, color: tag.color ?? defaultColor }}
                        onSubmit={(values) => handleUpdate(tag.id, values)}
                        isPending={isPending}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(tag.id, tag.name)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/blog/markdown-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createPost, updatePost } from '@/lib/actions/posts'
import { createTag } from '@/lib/actions/tags'
import type { PostView, TagView } from '@/types'
import { Loader2, Upload, X } from 'lucide-react'

interface PostFormProps {
  tags: TagView[]
  initialData?: PostView
}

export function PostForm({ tags, initialData }: PostFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const [title, setTitle] = React.useState(initialData?.title ?? '')
  const [content, setContent] = React.useState(initialData?.content ?? '')
  const [excerpt, setExcerpt] = React.useState(initialData?.excerpt ?? '')
  const [coverImageUrl, setCoverImageUrl] = React.useState(initialData?.coverImageUrl ?? '')
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(
    initialData?.status ?? 'draft'
  )
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(
    initialData?.tags.map((t) => t.id) ?? []
  )
  const [availableTags, setAvailableTags] = React.useState<TagView[]>(tags)
  const [newTagName, setNewTagName] = React.useState('')
  const [isCreatingTag, setIsCreatingTag] = React.useState(false)

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleCreateTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const name = newTagName.trim()
    if (!name) return

    // If a tag with the same name already exists, just select it
    const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
    const existing = availableTags.find((t) => t.slug === slug)
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id])
      }
      setNewTagName('')
      return
    }

    setIsCreatingTag(true)
    try {
      const result = await createTag(name, '#6e7781')
      if (result.success) {
        setAvailableTags((prev) => [...prev, result.data])
        setSelectedTagIds((prev) => [...prev, result.data.id])
        setNewTagName('')
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title,
        content,
        excerpt: excerpt || null,
        coverImageUrl: coverImageUrl || null,
        status,
        tagIds: selectedTagIds,
      }

      const result = initialData
        ? await updatePost(initialData.id, payload)
        : await createPost(payload)

      if (result.success) {
        toast({
          title: 'Success',
          description: initialData ? 'Post updated' : 'Post created',
        })
        router.push('/admin/posts')
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: 'draft' | 'published' | 'archived') =>
              setStatus(value)
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
            {availableTags.length === 0 && (
              <span className="text-sm text-muted-foreground">No tags yet. Type below to create one.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleCreateTag}
              placeholder="New tag name — press Enter to create"
              disabled={isCreatingTag}
              className="h-8 text-sm"
            />
            {isCreatingTag && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt (Optional)</Label>
        <Input
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary for list view"
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          minHeight={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImageUrl">Cover Image (Optional)</Label>
        <div className="flex gap-2">
          <Input
            id="coverImageUrl"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploadingImage ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setIsUploadingImage(true)
              try {
                const formData = new FormData()
                formData.append('file', file)
                const res = await fetch('/api/upload', { method: 'POST', body: formData })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}))
                  throw new Error(err?.error ?? 'Upload failed')
                }
                const { url } = await res.json()
                setCoverImageUrl(url)
                toast({ title: 'Image uploaded', description: 'Cover image set successfully.' })
              } catch (err) {
                toast({
                  title: 'Upload failed',
                  description: err instanceof Error ? err.message : 'Could not upload image.',
                  variant: 'destructive',
                })
              } finally {
                setIsUploadingImage(false)
                e.target.value = ''
              }
            }}
          />
        </div>
        {coverImageUrl && (
          <div className="relative w-full max-w-xs h-32 rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverImageUrl('')}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              aria-label="Remove cover image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Paste a URL or upload a file. Displayed as the post cover image.
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/posts')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Post' : 'Create Post'}
        </Button>
      </div>
    </form>
  )
}

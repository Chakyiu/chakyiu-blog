'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/blog/markdown-editor'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProject, updateProject, fetchGithubReadme } from '@/lib/actions/projects'
import type { ProjectView } from '@/types'
import { Loader2, RefreshCw, Github, ExternalLink, Upload, X } from 'lucide-react'

interface ProjectFormProps {
  initialData?: ProjectView
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isFetchingReadme, setIsFetchingReadme] = React.useState(false)
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const [title, setTitle] = React.useState(initialData?.title ?? '')
  const [description, setDescription] = React.useState(initialData?.description ?? '')
  const [githubUrl, setGithubUrl] = React.useState(initialData?.githubUrl ?? '')
  const [imageUrl, setImageUrl] = React.useState(initialData?.imageUrl ?? '')
  const [productUrl, setProductUrl] = React.useState(initialData?.productUrl ?? '')
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(
    initialData?.status ?? 'draft'
  )
  const [cachedReadme, setCachedReadme] = React.useState(
    initialData?.cachedReadme ?? ''
  )

  const handleFetchReadme = async () => {
    const url = githubUrl.trim()
    if (!url) {
      toast({
        title: 'GitHub URL required',
        description: 'Please enter a GitHub repository URL first.',
        variant: 'destructive',
      })
      return
    }

    setIsFetchingReadme(true)
    try {
      const result = await fetchGithubReadme(url)
      if (result.success) {
        setCachedReadme(result.data)
        toast({
          title: 'README fetched',
          description: 'README content loaded into editor. You can edit it before saving.',
        })
      } else {
        toast({
          title: 'Failed to fetch README',
          description: result.error,
          variant: 'destructive',
        })
      }
    } finally {
      setIsFetchingReadme(false)
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
        description: description || null,
        githubUrl: githubUrl || null,
        productUrl: productUrl || null,
        imageUrl: imageUrl || null,
        cachedReadme: cachedReadme || null,
        status,
      }

      const result = initialData
        ? await updateProject(initialData.id, payload)
        : await createProject(payload)

      if (result.success) {
        toast({
          title: 'Success',
          description: initialData ? 'Project updated' : 'Project created',
        })
        router.push('/admin/projects')
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch {
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
            placeholder="Enter project title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: 'draft' | 'published' | 'archived') => setStatus(value)}
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
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown on the project card"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl">GitHub Repository URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="githubUrl"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchReadme}
            disabled={isFetchingReadme || !githubUrl.trim()}
          >
            {isFetchingReadme ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isFetchingReadme ? 'Fetching…' : 'Fetch README'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Optional. Use the button to fetch README from a public GitHub repo into the editor below.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="productUrl">Product URL (Optional)</Label>
        <div className="relative">
          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="productUrl"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product.com"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Link to the live product, demo, or landing page.
        </p>
      </div>

      <div className="space-y-2">
        <Label>README Content (Optional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Write or paste the project README in Markdown. You can also fetch it from GitHub using the button above.
        </p>
        <MarkdownEditor
          value={cachedReadme}
          onChange={setCachedReadme}
          placeholder="Write the project README in Markdown..."
          minHeight={300}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Cover Image (Optional)</Label>
        <div className="flex gap-2">
          <Input
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/screenshot.png"
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
                setImageUrl(url)
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
        {imageUrl && (
          <div className="relative w-40 h-24 rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              aria-label="Remove cover image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Paste a URL or upload a file. Displayed as the project card thumbnail.
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/projects')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}

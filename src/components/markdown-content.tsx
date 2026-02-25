interface MarkdownContentProps {
  renderedHtml: string
  className?: string
}

export function MarkdownContent({ renderedHtml, className }: MarkdownContentProps) {
  return (
    <>
      <style>{`
        .shiki.github-light { display: block !important; }
        .shiki.github-dark { display: none !important; }
        .dark .shiki.github-light { display: none !important; }
        .dark .shiki.github-dark { display: block !important; }
      `}</style>
      <div
        className={[
          'prose prose-neutral dark:prose-invert max-w-none',
          'prose-pre:rounded-md prose-pre:overflow-hidden',
          'prose-code:before:content-none prose-code:after:content-none',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </>
  )
}

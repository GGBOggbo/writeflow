type ProseTextProps = {
  content: string;
  className?: string;
};

export function ProseText({ content, className }: ProseTextProps) {
  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} data-testid="prose-paragraph" className={index > 0 ? "mt-4" : ""}>
          {paragraph.replace(/\n/g, " ")}
        </p>
      ))}
    </div>
  );
}

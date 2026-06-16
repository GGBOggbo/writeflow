import { renderSafeGfm } from "@/lib/markdown/render";

export function MarkdownArticle({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const html = renderSafeGfm(content);

  return (
    <article
      className={[
        "text-[15px] leading-8 text-stone-700",
        "[&_h1]:mb-5 [&_h1]:mt-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-[#233044]",
        "[&_h2]:mb-4 [&_h2]:mt-9 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#233044]",
        "[&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[#233044]",
        "[&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold",
        "[&_p]:my-4 [&_strong]:font-semibold [&_strong]:text-stone-900 [&_del]:text-stone-400",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#8facbf] [&_blockquote]:pl-4 [&_blockquote]:text-stone-600",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5",
        "[&_input]:mr-2 [&_input]:align-middle",
        "[&_a]:text-[#315f8b] [&_a]:underline [&_a]:underline-offset-4",
        "[&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-xl",
        "[&_hr]:my-8 [&_hr]:border-stone-200",
        "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border [&_th]:border-stone-200 [&_th]:bg-stone-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left",
        "[&_td]:border [&_td]:border-stone-200 [&_td]:px-3 [&_td]:py-2",
        "[&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#1f2933] [&_pre]:p-4 [&_pre]:text-stone-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
        className,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

import type { FormattingBlock } from "@/types/workflow";

const MAX_PARAGRAPH_CHARS = 180;
const MAX_GROUPED_BLOCKS = 4;

export function composeFormattingBlocks(blocks: FormattingBlock[]) {
  const composed: FormattingBlock[] = [];
  let paragraphGroup: FormattingBlock[] = [];

  const flushParagraphGroup = () => {
    if (paragraphGroup.length === 0) return;

    composed.push({
      id: paragraphGroup[0].id,
      type: "paragraph",
      text: paragraphGroup.map((block) => block.text).join("\n\n"),
    });
    paragraphGroup = [];
  };

  for (const block of blocks) {
    if (block.type !== "paragraph") {
      flushParagraphGroup();
      composed.push(block);
      continue;
    }

    const nextText = [...paragraphGroup, block]
      .map((item) => item.text)
      .join("\n\n");

    if (
      paragraphGroup.length >= MAX_GROUPED_BLOCKS ||
      (paragraphGroup.length > 0 && nextText.length > MAX_PARAGRAPH_CHARS)
    ) {
      flushParagraphGroup();
    }

    paragraphGroup.push(block);
  }

  flushParagraphGroup();
  return composed;
}

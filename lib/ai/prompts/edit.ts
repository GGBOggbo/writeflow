import { z } from "zod";
import { WRITING_SYSTEM_PROMPT } from "./system";

export const editResponseSchema = z.object({
  content: z.string(),
});

export function buildEditPrompt(input: {
  draftId: string;
  instruction: string;
}) {
  return {
    systemPrompt: WRITING_SYSTEM_PROMPT,
    userPrompt: `对草稿 ${input.draftId} 做局部修改：${input.instruction}`,
    outputSchema: editResponseSchema,
  };
}

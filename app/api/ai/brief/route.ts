import { meteredJsonResponse } from "../_shared";
import { generateBrief } from "@/lib/ai/service";
import { briefRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(request, briefRequestSchema, "brief", (input) =>
    generateBrief(input)
  );
}

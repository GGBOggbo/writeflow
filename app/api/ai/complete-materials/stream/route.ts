import { authenticatedStreamJsonResponse } from "../../_stream";
import { completeDraftMaterials } from "@/lib/ai/service";
import { completeDraftMaterialsRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return authenticatedStreamJsonResponse(
    request,
    completeDraftMaterialsRequestSchema,
    "draft",
    (input, onProgress) => completeDraftMaterials(input, { onProgress })
  );
}

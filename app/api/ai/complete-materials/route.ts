import { authenticatedJsonResponse } from "../_shared";
import { completeDraftMaterials } from "@/lib/ai/service";
import { completeDraftMaterialsRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return authenticatedJsonResponse(
    request,
    completeDraftMaterialsRequestSchema,
    "draft",
    (input) => completeDraftMaterials(input)
  );
}

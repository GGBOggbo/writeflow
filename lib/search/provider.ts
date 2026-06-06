import type { SearchQueryInput, SearchResult } from "./types";
import type { ProgressReporter } from "@/lib/progress/types";

export type SearchProviderName = "generic";

export interface SearchProvider {
  search(input: SearchQueryInput, onProgress?: ProgressReporter): Promise<SearchResult[]>;
}

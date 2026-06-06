/**
 * Robust JSON extraction from LLM responses.
 *
 * LLMs frequently wrap JSON in markdown fences, add leading commentary,
 * or embed the JSON inside prose. These utilities handle the common cases
 * so the provider layer can focus on schema validation.
 */

/**
 * Extract a JSON object from a raw LLM response string.
 *
 * Tries, in order:
 * 1. Direct `JSON.parse` (ideal case)
 * 2. Extract from markdown code fence (```json ... ```)
 * 3. Brute-force scan for balanced `{…}` substrings
 *
 * @param content  Raw response text from the model.
 * @param label    Human-readable label used in error messages (e.g. "mimo outline").
 */
export function parseJsonObject(content: string, label = "AI response"): unknown {
  const candidates = parseJsonCandidates(content);

  if (candidates.length > 0) {
    return candidates[0];
  }

  throw new Error(`${label} 返回内容不是合法 JSON。`);
}

/**
 * Return every successfully parsed JSON candidate found in `content`, preserving order.
 *
 * This is useful when models prepend a smaller valid JSON object before the
 * actual payload we want. Callers can then try each candidate against a schema.
 */
export function parseJsonCandidates(content: string): unknown[] {
  const trimmed = content.trim();
  const parsedCandidates: unknown[] = [];

  try {
    parsedCandidates.push(JSON.parse(trimmed));
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if (fencedMatch?.[1]) {
      parsedCandidates.push(JSON.parse(fencedMatch[1]));
    }
  }

  for (const candidate of extractJsonObjectCandidates(trimmed)) {
    try {
      parsedCandidates.push(JSON.parse(candidate));
    } catch {
      continue;
    }
  }

  return parsedCandidates;
}

/**
 * Scan `input` for substrings that look like balanced JSON objects.
 *
 * For every `{` at the top level, walk forward tracking brace depth and
 * string literals, and yield each `{…}` region that balances back to zero.
 */
function extractJsonObjectCandidates(input: string): string[] {
  const candidates: string[] = [];

  for (let start = 0; start < input.length; start += 1) {
    if (input[start] !== "{") {
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < input.length; index += 1) {
      const char = input[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === "\\") {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          candidates.push(input.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return candidates;
}

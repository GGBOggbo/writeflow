# wxrank Topic Smart Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production WeChat topic-reference provider with wxrank, using a 30-day historical-first route and real-time fallback while preserving the existing `SearchResult` contract and deep-dive quality.

**Architecture:** Add a small wxrank HTTP client, a pure query/ranking module, and a provider that orchestrates current-month history, previous-month history, real-time fallback, and two-article enrichment. Keep Jizhila available as an environment-controlled rollback provider; the AI service and frontend continue consuming the existing `SearchProvider` interface unchanged.

**Tech Stack:** TypeScript, Vitest, native `fetch`, existing search provider abstractions.

---

## File Map

- Create `lib/search/wxrank-client.ts`: authenticated HTTPS calls, timeout handling, response validation, wxrank error classification.
- Create `lib/search/wxrank-client.test.ts`: request and error-safety tests.
- Create `lib/search/wxrank-ranking.ts`: provider-specific query adaptation, date filtering, relevance scoring, and URL deduplication.
- Create `lib/search/wxrank-ranking.test.ts`: pure routing and ranking tests.
- Create `lib/search/wxrank-provider.ts`: historical-first orchestration, result mapping, progress events, article HTML and comment enrichment.
- Create `lib/search/wxrank-provider.test.ts`: routing, mapping, enrichment, and degradation tests.
- Modify `lib/search/service.ts`: select wxrank for `SEARCH_PROVIDER=wxrank`.
- Modify `lib/search/service.test.ts`: verify provider selection and stable bundle shape.
- Modify `.env.example`: document wxrank settings without a real key.
- Modify `README.md`: document the new provider and cost-aware route.

### Task 1: Build wxrank query adaptation and ranking

**Files:**
- Create: `lib/search/wxrank-ranking.ts`
- Create: `lib/search/wxrank-ranking.test.ts`

- [ ] **Step 1: Write failing tests for provider-specific query terms**

```ts
import { describe, expect, it } from "vitest";
import { buildWxrankQueryTerms } from "./wxrank-ranking";

describe("buildWxrankQueryTerms", () => {
  it("removes business hint words from realtime search", () => {
    expect(buildWxrankQueryTerms("Claude神话模型 痛点")).toEqual({
      historyKeyword: "Claude",
      realtimeKeyword: "Claude神话模型",
      scoringTerms: ["Claude", "神话", "模型"],
    });
  });

  it("keeps meaningful audience and domain terms", () => {
    expect(buildWxrankQueryTerms("AI 编程 普通人 副业 痛点")).toEqual({
      historyKeyword: "AI",
      realtimeKeyword: "AI 编程 普通人 副业",
      scoringTerms: ["AI", "编程", "普通人", "副业"],
    });
  });
});
```

- [ ] **Step 2: Run the query tests and verify failure**

Run: `npx vitest run lib/search/wxrank-ranking.test.ts`

Expected: FAIL because `./wxrank-ranking` does not exist.

- [ ] **Step 3: Implement query adaptation**

Create `lib/search/wxrank-ranking.ts` with an explicit wxrank stop-word set containing `痛点`, `现状`, `结构`, `大纲`, `人群`, `最新`, `爆款`, `摘要`, and `选题`. Export:

```ts
export type WxrankQueryTerms = {
  historyKeyword: string;
  realtimeKeyword: string;
  scoringTerms: string[];
};

export function buildWxrankQueryTerms(query: string): WxrankQueryTerms;
```

Tokenize Chinese/ASCII terms with the same structured regex style already used by `lib/search/service.ts`. Choose the first entity-like term for `historyKeyword`, join all non-stop terms for `realtimeKeyword`, and retain all non-stop terms for local scoring.

- [ ] **Step 4: Add failing tests for relevance, 30-day filtering, and deduplication**

```ts
import { filterAndRankHistoricalArticles } from "./wxrank-ranking";

it("keeps recent entity matches and rejects generic false positives", () => {
  const results = filterAndRankHistoricalArticles(
    [
      article("Claude Fable 5 神话模型实测", "正文", "2026-06-10 10:00:00", 20000),
      article("AI 融资出现新机会", "Claude 被顺带提及", "2026-06-11 10:00:00", 100001),
      article("Claude 去年复盘", "神话模型", "2026-04-01 10:00:00", 50000),
    ],
    ["Claude", "神话", "模型"],
    new Date("2026-06-12T00:00:00+08:00")
  );

  expect(results.map((item) => item.title)).toEqual([
    "Claude Fable 5 神话模型实测",
  ]);
});
```

Also test normalization of equivalent `http://mp.weixin.qq.com/...` and `https://mp.weixin.qq.com/...` links so only one survives.

- [ ] **Step 5: Implement pure historical ranking**

Export provider-neutral raw input and ranked output types plus:

```ts
export function filterAndRankHistoricalArticles(
  articles: WxrankHistoricalArticle[],
  scoringTerms: string[],
  now: Date
): WxrankHistoricalArticle[];
```

Require the first scoring term to appear in title or content. Score title matches above content matches, then sort by score, weighted engagement, and publication time. Reject invalid timestamps and articles older than 30 days. Normalize WeChat URLs before deduplication.

- [ ] **Step 6: Run ranking tests**

Run: `npx vitest run lib/search/wxrank-ranking.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the ranking unit**

```bash
git add lib/search/wxrank-ranking.ts lib/search/wxrank-ranking.test.ts
git commit -m "feat: add wxrank query ranking"
```

### Task 2: Add a safe wxrank HTTP client

**Files:**
- Create: `lib/search/wxrank-client.ts`
- Create: `lib/search/wxrank-client.test.ts`

- [ ] **Step 1: Write failing client request tests**

Cover these concrete assertions:

```ts
it("posts to the HTTPS wxrank endpoint with the environment key", async () => {
  vi.stubEnv("WXRANK_API_KEY", "test-key");
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 })
  );

  await createWxrankClient().searchArticles({ keyword: "Claude", sortType: 4 });

  expect(fetchSpy).toHaveBeenCalledWith(
    "https://data.wxrank.com/weixin/getso",
    expect.objectContaining({ method: "POST" })
  );
  expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
    key: "test-key",
    keyword: "Claude",
    sort_type: 4,
  });
});
```

Add tests that a missing key throws `WxrankConfigurationError`, `code=1000` throws `WxrankInsufficientBalanceError`, and thrown messages never contain `test-key`.

- [ ] **Step 2: Run client tests and verify failure**

Run: `npx vitest run lib/search/wxrank-client.test.ts`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement typed wxrank calls**

Create a client with these public methods:

```ts
type WxrankClient = {
  listHotArticles(input: { month: string; keyword: string }): Promise<WxrankArtlistResponse>;
  searchArticles(input: { keyword: string; sortType: 0 | 2 | 4 }): Promise<WxrankGetsoResponse>;
  getArticleInfo(url: string): Promise<WxrankArticleInfo>;
  getArticleComments(input: { url: string; commentId: string }): Promise<WxrankComment[]>;
};

export function createWxrankClient(): WxrankClient;
```

Use `https://data.wxrank.com` by default, `AbortSignal.timeout(15_000)`, POST JSON, and `code === 0` validation. Permit `WXRANK_BASE_URL` only when it parses as HTTPS, except in `NODE_ENV=test` where local HTTP test servers may be used. Do not include request bodies or raw response text in public errors.

- [ ] **Step 4: Add response-shape and timeout tests**

Test malformed JSON, HTTP 500, business error `9999`, and an `AbortError`. Assert each becomes a typed wxrank error with endpoint name but no key or article body.

- [ ] **Step 5: Run client tests**

Run: `npx vitest run lib/search/wxrank-client.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the client unit**

```bash
git add lib/search/wxrank-client.ts lib/search/wxrank-client.test.ts
git commit -m "feat: add secure wxrank client"
```

### Task 3: Implement historical-first topic routing

**Files:**
- Create: `lib/search/wxrank-provider.ts`
- Create: `lib/search/wxrank-provider.test.ts`

- [ ] **Step 1: Write failing current-month hit test**

Freeze time at `2026-06-12T00:00:00+08:00`. Mock `artlist` with five qualified articles and assert:

```ts
expect(fetchSpy).toHaveBeenCalledTimes(1);
expect(endpointNames(fetchSpy)).toEqual(["artlist"]);
expect(results).toHaveLength(5);
expect(results[0]).toMatchObject({
  source: "wechat",
  engagementMetrics: {
    readCount: 20000,
    likeCount: 300,
    lookingCount: 80,
    shareCount: 120,
  },
});
```

The request keyword must be the adapted `historyKeyword`, not the original query containing `痛点`.

- [ ] **Step 2: Write failing previous-month and realtime-fallback tests**

Test both routes separately:

- Current month returns 3 qualified articles, previous month adds 2: calls `artlist` twice and never calls `getso`.
- Two months total 4 qualified articles: calls `getso` once with the adapted `realtimeKeyword`, merges results, deduplicates by normalized URL, and returns at most 8.

- [ ] **Step 3: Run provider tests and verify failure**

Run: `npx vitest run lib/search/wxrank-provider.test.ts`

Expected: FAIL because the provider does not exist.

- [ ] **Step 4: Implement the provider search route**

Export `wxrankSearchProvider: SearchProvider`. Preserve the existing progress sequence:

```ts
search_query_built -> web_search_started -> web_search_completed
-> results_normalized -> engagement_enrichment_started
-> engagement_enrichment_completed -> deep_dive_started
-> deep_dive_completed
```

For wxrank, use `engagement_enrichment_*` to report that historical interaction data has been selected rather than making `getrk` calls. Map `artlist` content to a cleaned, truncated snippet and `getso` descriptions to cleaned snippets. Include `公众号分类`/`原创状态` notes for history and `公众号：<wx_name>` for realtime.

- [ ] **Step 5: Add degradation tests**

Assert:

- Current-month failure still attempts previous month.
- Both historical calls failing triggers realtime search.
- Realtime failure returns non-empty historical results when available.
- All three searches failing causes the provider to throw a sanitized error that `safeSearch` converts to a degraded bundle.

- [ ] **Step 6: Run provider tests**

Run: `npx vitest run lib/search/wxrank-provider.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit historical routing**

```bash
git add lib/search/wxrank-provider.ts lib/search/wxrank-provider.test.ts
git commit -m "feat: add wxrank historical topic routing"
```

### Task 4: Preserve deep-dive HTML and comment quality

**Files:**
- Modify: `lib/search/wxrank-provider.ts`
- Modify: `lib/search/wxrank-provider.test.ts`

- [ ] **Step 1: Write failing two-article enrichment test**

Return eight ranked search articles, then mock exactly two `artinfo` responses containing `html`, `article_url`, and `comment_id`. Mock two `getcm` responses containing `data.comment_list`. Assert:

```ts
expect(endpointNames(fetchSpy).filter((name) => name === "artinfo")).toHaveLength(2);
expect(endpointNames(fetchSpy).filter((name) => name === "getcm")).toHaveLength(2);
expect(results.filter((item) => item.articleHtml)).toHaveLength(2);
expect(results.filter((item) => item.comments?.length)).toHaveLength(2);
```

Verify comments are sorted by top status where available, then `like_num`, and sliced to `WXRANK_COMMENT_TOP_N` with a default of 10.

- [ ] **Step 2: Write failing missing-comment-id and partial-failure tests**

Assert that a missing `comment_id` skips `getcm`, and one failed `artinfo`/`getcm` call does not remove the base search result or fail the whole provider.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npx vitest run lib/search/wxrank-provider.test.ts -t "deep|comment|partial"`

Expected: FAIL because enrichment is not implemented.

- [ ] **Step 4: Implement deep-dive enrichment**

Use the existing `selectDeepDiveArticles` function with a default limit of 2. Store the long `article_url` returned by `artinfo`, attach `html`, and pass both long URL and `comment_id` to `getcm`. Run at most two article calls and two comment calls, respecting wxrank QPS; use sequential calls or a small delay rather than unbounded `Promise.all` retries.

Keep the Jizhila-compatible `SearchResult.articleHtml` and `SearchResult.comments` fields so `summarizeDraftBenchmarks` remains unchanged.

- [ ] **Step 5: Run provider and AI service tests**

Run: `npx vitest run lib/search/wxrank-provider.test.ts lib/ai/service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit enrichment**

```bash
git add lib/search/wxrank-provider.ts lib/search/wxrank-provider.test.ts
git commit -m "feat: enrich wxrank benchmark articles"
```

### Task 5: Wire configuration and document rollout

**Files:**
- Modify: `lib/search/service.ts`
- Modify: `lib/search/service.test.ts`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Write a failing provider-selection test**

Add a service test with `SEARCH_PROVIDER=wxrank` and `WXRANK_API_KEY=test-key`. Mock a five-result `artlist` response and assert the first request targets `/weixin/artlist`, no Jizhila endpoint is called, and the returned `SearchReferenceBundle` has `status: "success"`.

- [ ] **Step 2: Run the service test and verify failure**

Run: `npx vitest run lib/search/service.test.ts -t "wxrank"`

Expected: FAIL because `getSearchProvider()` does not recognize `wxrank`.

- [ ] **Step 3: Wire wxrank provider selection**

Import `wxrankSearchProvider` and add:

```ts
if (providerName === "wxrank") {
  return wxrankSearchProvider;
}
```

Do not delete the `jizhila` branch; it remains the rollback route.

- [ ] **Step 4: Update environment documentation**

Document these values without real secrets:

```dotenv
# Search providers: disabled | bocha | jizhila | wxrank
SEARCH_PROVIDER=disabled
WXRANK_API_KEY=
WXRANK_BASE_URL=https://data.wxrank.com
WXRANK_HISTORY_MIN_RESULTS=5
WXRANK_RESULT_LIMIT=8
WXRANK_DEEP_DIVE_LIMIT=2
WXRANK_COMMENT_TOP_N=10
```

Update the README flow to describe current-month history, previous-month history, realtime fallback, and two-article deep dive. Remove claims that production must call `read_zan_pro` when wxrank history already includes interaction data.

- [ ] **Step 5: Switch only the ignored local environment**

Set `SEARCH_PROVIDER=wxrank` in `.env.local`. Keep `WXRANK_API_KEY` there and verify:

Run: `git check-ignore -v .env.local`

Expected: `.env.local` is ignored by `.gitignore`.

- [ ] **Step 6: Run search and AI integration tests**

Run: `npx vitest run lib/search lib/ai/service.test.ts app/api/ai/ai-routes.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit configuration and docs**

```bash
git add lib/search/service.ts lib/search/service.test.ts .env.example README.md
git commit -m "feat: enable wxrank search provider"
```

### Task 6: Full verification and secret audit

**Files:**
- Verify only; fix only failures caused by this implementation.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint on changed source files**

Run: `npx eslint lib/search/wxrank-client.ts lib/search/wxrank-client.test.ts lib/search/wxrank-ranking.ts lib/search/wxrank-ranking.test.ts lib/search/wxrank-provider.ts lib/search/wxrank-provider.test.ts lib/search/service.ts lib/search/service.test.ts`

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js production build succeeds.

- [ ] **Step 4: Audit tracked content for the real key**

Run:

```bash
set -a
source .env.local
set +a
git grep -n -- "$WXRANK_API_KEY"
```

Expected: no output.

- [ ] **Step 5: Review the final diff and runtime cost behavior**

Run: `git status --short && git log --oneline -6`

Confirm unrelated modifications in `lib/auth.ts`, `scripts/migrate.mjs`, and `docs/wxrank-api.md` were not staged or changed by this implementation. Confirm tests prove that `getso` is skipped whenever at least five qualified historical articles exist.

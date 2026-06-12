import { z } from "zod";

const DEFAULT_BASE_URL = "https://data.wxrank.com";
const REQUEST_TIMEOUT_MS = 15_000;

const ipWordingSchema = z
  .object({
    city_id: z.string().optional(),
    city_name: z.string().optional(),
    country_id: z.string().optional(),
    country_name: z.string().optional(),
    province_id: z.string().optional(),
    province_name: z.string().optional(),
  })
  .passthrough();

const commentReplySchema = z
  .object({
    content: z.string(),
    like_num: z.number().optional(),
    ip_wording: ipWordingSchema.optional(),
    create_time: z.string().optional(),
  })
  .passthrough();

const commentSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    content: z.string(),
    like_num: z.number().optional(),
    ip_wording: ipWordingSchema.optional(),
    nick_name: z.string().optional(),
    logo_url: z.string().optional(),
    create_time: z.string().optional(),
    reply_new: z
      .object({
        max_reply_id: z.union([z.string(), z.number()]).optional(),
        reply_total_cnt: z.number().optional(),
        reply_list: z.array(commentReplySchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const historicalArticleSchema = z
  .object({
    sn: z.string().optional(),
    wx_biz: z.string().optional(),
    wx_type: z.string().optional(),
    pub_time: z.string(),
    title: z.string(),
    read_num: z.number(),
    like_num: z.number().optional(),
    look_num: z.number().optional(),
    share_num: z.number().optional(),
    ip_region: z.string().optional(),
    copyright: z.string().optional(),
    art_url: z.string(),
    pic_url: z.string().optional(),
    content: z.string(),
    data_update_time: z.string().optional(),
  })
  .passthrough();

const artlistSchema = z
  .object({
    cursor: z.string().optional(),
    total: z.number().optional(),
    list: z.array(historicalArticleSchema),
  })
  .passthrough();

const searchArticleSchema = z
  .object({
    wx_name: z.string(),
    pub_time: z.string(),
    title: z.string(),
    desc: z.string(),
    art_url: z.string(),
    pic_url: z.string(),
  })
  .passthrough();

const articleInfoSchema = z
  .object({
    biz: z.string().optional(),
    mid: z.union([z.string(), z.number()]).optional(),
    idx: z.union([z.string(), z.number()]).optional(),
    sn: z.string().optional(),
    article_url: z.string(),
    name: z.string().optional(),
    user_name: z.string().optional(),
    pub_time: z.string(),
    signature: z.string().optional(),
    hd_head_img: z.string().optional(),
    msg_cdn_url: z.string().optional(),
    service_type: z.union([z.string(), z.number()]).optional(),
    copyright_stat: z.union([z.string(), z.number()]).optional(),
    title: z.string(),
    digest: z.string().optional(),
    author: z.string().optional(),
    province_name: z.string().optional(),
    comment_id: z.union([z.string(), z.number()]).optional(),
    msg_daily_idx: z.string().optional(),
    item_show_type: z.string().optional(),
    picture_url_list: z.array(z.string()).optional(),
    text: z.string(),
    html: z.string(),
  })
  .passthrough();

const commentsDataSchema = z
  .object({
    comment_list: z.array(commentSchema),
  })
  .passthrough();

const envelopeSchema = z
  .object({
    code: z.number(),
    msg: z.string().optional(),
    data: z.unknown().optional(),
  })
  .passthrough();

export type WxrankHistoricalArticle = z.infer<typeof historicalArticleSchema>;
export type WxrankArtlistResponse = z.infer<typeof artlistSchema>;
export type WxrankSearchArticle = z.infer<typeof searchArticleSchema>;
export type WxrankGetsoResponse = WxrankSearchArticle[];
export type WxrankArticleInfo = z.infer<typeof articleInfoSchema>;
export type WxrankCommentReply = z.infer<typeof commentReplySchema>;
export type WxrankComment = z.infer<typeof commentSchema>;

export class WxrankError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "WxrankError";
  }
}

export class WxrankConfigurationError extends WxrankError {
  constructor(message: string) {
    super(message, "configuration");
    this.name = "WxrankConfigurationError";
  }
}

export class WxrankRequestError extends WxrankError {
  constructor(endpoint: string, reason: string, options?: ErrorOptions) {
    super(`wxrank ${endpoint}: ${reason}`, endpoint, options);
    this.name = "WxrankRequestError";
  }
}

export class WxrankBusinessError extends WxrankError {
  constructor(
    endpoint: string,
    public readonly code: number
  ) {
    super(`wxrank ${endpoint}: request rejected with code ${code}`, endpoint);
    this.name = "WxrankBusinessError";
  }
}

export class WxrankInsufficientBalanceError extends WxrankBusinessError {
  constructor(endpoint: string) {
    super(endpoint, 1000);
    this.name = "WxrankInsufficientBalanceError";
  }
}

export type WxrankClient = {
  listHotArticles(input: {
    month: string;
    keyword: string;
  }): Promise<WxrankArtlistResponse>;
  searchArticles(input: {
    keyword: string;
    sortType: 0 | 2 | 4;
  }): Promise<WxrankGetsoResponse>;
  getArticleInfo(url: string): Promise<WxrankArticleInfo>;
  getArticleComments(input: {
    url: string;
    commentId: string;
  }): Promise<WxrankComment[]>;
};

function resolveBaseUrl() {
  const configured = process.env.WXRANK_BASE_URL?.trim() || DEFAULT_BASE_URL;
  let parsed: URL;

  try {
    parsed = new URL(configured);
  } catch {
    throw new WxrankConfigurationError("WXRANK_BASE_URL is invalid");
  }

  if (parsed.username || parsed.password) {
    throw new WxrankConfigurationError(
      "WXRANK_BASE_URL must not contain credentials"
    );
  }

  const localTestHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLocalTestUrl =
    process.env.NODE_ENV === "test" &&
    parsed.protocol === "http:" &&
    localTestHosts.has(parsed.hostname);

  if (parsed.protocol !== "https:" && !isLocalTestUrl) {
    throw new WxrankConfigurationError("WXRANK_BASE_URL must use HTTPS");
  }

  return configured.replace(/\/+$/, "");
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

export function createWxrankClient(): WxrankClient {
  const apiKey = process.env.WXRANK_API_KEY?.trim();
  if (!apiKey) {
    throw new WxrankConfigurationError("WXRANK_API_KEY is required");
  }

  const baseUrl = resolveBaseUrl();

  async function request<T>(
    endpoint: string,
    payload: Record<string, unknown>,
    dataSchema: z.ZodType<T>
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}/weixin/${endpoint}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: apiKey, ...payload }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new WxrankRequestError(endpoint, "request timed out");
      }
      throw new WxrankRequestError(endpoint, "network request failed");
    }

    if (!response.ok) {
      throw new WxrankRequestError(
        endpoint,
        `HTTP request failed with status ${response.status}`
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new WxrankRequestError(endpoint, "response was not valid JSON");
    }

    const envelope = envelopeSchema.safeParse(raw);
    if (!envelope.success) {
      throw new WxrankRequestError(endpoint, "response envelope was invalid");
    }

    if (envelope.data.code === 1000) {
      throw new WxrankInsufficientBalanceError(endpoint);
    }
    if (envelope.data.code !== 0) {
      throw new WxrankBusinessError(endpoint, envelope.data.code);
    }

    const data = dataSchema.safeParse(envelope.data.data);
    if (!data.success) {
      throw new WxrankRequestError(endpoint, "response data was invalid");
    }

    return data.data;
  }

  return {
    listHotArticles({ month, keyword }) {
      return request("artlist", { month, keyword }, artlistSchema);
    },
    searchArticles({ keyword, sortType }) {
      return request(
        "getso",
        { keyword, sort_type: sortType },
        z.array(searchArticleSchema)
      );
    },
    getArticleInfo(url) {
      return request("artinfo", { url }, articleInfoSchema);
    },
    async getArticleComments({ url, commentId }) {
      const normalizedCommentId = commentId.trim();
      if (!normalizedCommentId) {
        throw new WxrankConfigurationError("commentId is required for getcm");
      }

      const data = await request(
        "getcm",
        { url, comment_id: normalizedCommentId },
        commentsDataSchema
      );
      return data.comment_list;
    },
  };
}

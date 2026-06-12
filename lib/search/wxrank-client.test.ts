import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WxrankBusinessError,
  WxrankConfigurationError,
  WxrankInsufficientBalanceError,
  WxrankRequestError,
  createWxrankClient,
} from "./wxrank-client";

const TEST_KEY = "test-key-must-not-leak";
const ARTICLE_URL =
  "https://mp.weixin.qq.com/s?__biz=private-article&comments=private-comments";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

function expectSafeError(error: unknown, endpoint: string) {
  expect(error).toBeInstanceOf(Error);
  const message = (error as Error).message;

  expect(message).toContain(endpoint);
  expect(message).not.toContain(TEST_KEY);
  expect(message).not.toContain("private-article");
  expect(message).not.toContain("private-comments");
  expect(message).not.toContain("raw-response-secret");
}

describe("wxrank client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("posts search requests to the default HTTPS endpoint", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeoutSignal);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: [
          {
            wx_name: "测试公众号",
            pub_time: "2026-06-12 08:00:00",
            title: "Claude 新模型",
            desc: "一篇摘要",
            art_url: "http://mp.weixin.qq.com/s/example",
            pic_url: "https://mmbiz.qpic.cn/example",
          },
        ],
      })
    );

    const result = await createWxrankClient().searchArticles({
      keyword: "Claude",
      sortType: 4,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      wx_name: "测试公众号",
      title: "Claude 新模型",
    });
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://data.wxrank.com/weixin/getso",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: TEST_KEY,
          keyword: "Claude",
          sort_type: 4,
        }),
        signal: timeoutSignal,
      }
    );
  });

  it("returns the typed historical article list", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          cursor: "next-page",
          total: 1,
          list: [
            {
              sn: "article-sn",
              wx_biz: "wx-biz",
              wx_type: "科技",
              pub_time: "2026-06-10 12:00:00",
              title: "Claude 实测",
              read_num: 20000,
              like_num: 300,
              look_num: 80,
              share_num: 120,
              ip_region: "北京",
              copyright: "原创",
              art_url: ARTICLE_URL,
              pic_url: "https://mmbiz.qpic.cn/cover",
              content: "文章正文",
              data_update_time: "2026-06-11 01:00:00",
            },
          ],
        },
      })
    );

    const result = await createWxrankClient().listHotArticles({
      month: "202606",
      keyword: "Claude",
    });

    expect(result.total).toBe(1);
    expect(result.list[0]).toMatchObject({
      sn: "article-sn",
      read_num: 20000,
      content: "文章正文",
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      key: TEST_KEY,
      month: "202606",
      keyword: "Claude",
    });
  });

  it("accepts list articles when provider omits nonessential metadata", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          list: [
            {
              pub_time: "2026-06-10 12:00:00",
              title: "Claude 实测",
              read_num: 20000,
              art_url: ARTICLE_URL,
              content: "文章正文",
            },
          ],
        },
      })
    );

    const result = await createWxrankClient().listHotArticles({
      month: "202606",
      keyword: "Claude",
    });

    expect(result.list[0]).toMatchObject({
      title: "Claude 实测",
      read_num: 20000,
    });
    expect(result.list[0]?.like_num).toBeUndefined();
    expect(result.list[0]?.look_num).toBeUndefined();
    expect(result.list[0]?.share_num).toBeUndefined();
  });

  it("returns typed article information", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          biz: "wx-biz",
          mid: "2247544558",
          idx: "1",
          sn: "article-sn",
          article_url: ARTICLE_URL,
          name: "测试公众号",
          user_name: "gh_example",
          pub_time: "2026-06-10 12:00:00",
          signature: "公众号简介",
          hd_head_img: "http://wx.qlogo.cn/avatar",
          msg_cdn_url: "https://mmbiz.qpic.cn/cover",
          service_type: "0",
          copyright_stat: "1",
          title: "Claude 实测",
          digest: "摘要",
          author: "作者",
          province_name: "北京",
          comment_id: "3805478085957124103",
          msg_daily_idx: "1",
          item_show_type: "0",
          picture_url_list: ["https://mmbiz.qpic.cn/image"],
          text: "文章纯文本",
          html: "<p>文章 HTML</p>",
        },
      })
    );

    const result = await createWxrankClient().getArticleInfo(ARTICLE_URL);

    expect(result).toMatchObject({
      title: "Claude 实测",
      comment_id: "3805478085957124103",
      html: "<p>文章 HTML</p>",
    });
  });

  it("returns article information when comment_id is absent", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          biz: "wx-biz",
          mid: "2247544558",
          idx: "1",
          sn: "article-without-comments",
          article_url: ARTICLE_URL,
          name: "测试公众号",
          user_name: "gh_example",
          pub_time: "2026-06-10 12:00:00",
          signature: "公众号简介",
          hd_head_img: "http://wx.qlogo.cn/avatar",
          msg_cdn_url: "https://mmbiz.qpic.cn/cover",
          service_type: "0",
          copyright_stat: "1",
          title: "没有开放留言的文章",
          digest: "摘要",
          author: "作者",
          province_name: "北京",
          msg_daily_idx: "1",
          item_show_type: "0",
          picture_url_list: [],
          text: "仍然有效的文章纯文本",
          html: "<p>仍然有效的文章 HTML</p>",
        },
      })
    );

    const result = await createWxrankClient().getArticleInfo(ARTICLE_URL);

    expect(result).toMatchObject({
      article_url: ARTICLE_URL,
      title: "没有开放留言的文章",
      text: "仍然有效的文章纯文本",
      html: "<p>仍然有效的文章 HTML</p>",
    });
    expect(result.comment_id).toBeUndefined();
  });

  it("accepts article information when optional profile fields are absent", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          article_url: ARTICLE_URL,
          pub_time: "2026-06-10 12:00:00",
          title: "Claude 实测",
          digest: "摘要",
          html: "<p>正文</p>",
          text: "正文",
        },
      })
    );

    const result = await createWxrankClient().getArticleInfo(ARTICLE_URL);

    expect(result).toMatchObject({
      article_url: ARTICLE_URL,
      title: "Claude 实测",
      html: "<p>正文</p>",
    });
  });

  it("returns comment_list from the comments response", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          buffer: "next",
          comment_total_cnt: 1,
          total_count: 2,
          comment_list: [
            {
              id: "comment-1",
              content: "用户留言",
              like_num: 42,
              ip_wording: {
                country_name: "中国",
                province_name: "云南",
              },
              nick_name: "读者",
              logo_url: "https://wx.qlogo.cn/avatar",
              create_time: "2026-06-12 09:00:00",
              reply_new: {
                max_reply_id: 30,
                reply_total_cnt: 1,
                reply_list: [
                  {
                    content: "回复内容",
                    like_num: 3,
                    ip_wording: { province_name: "北京" },
                    create_time: "2026-06-12 09:01:00",
                  },
                ],
              },
            },
          ],
        },
      })
    );

    const result = await createWxrankClient().getArticleComments({
      url: ARTICLE_URL,
      commentId: "3805478085957124103",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "comment-1",
      content: "用户留言",
      reply_new: { reply_total_cnt: 1 },
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      key: TEST_KEY,
      url: ARTICLE_URL,
      comment_id: "3805478085957124103",
    });
  });

  it("accepts comments when optional author metadata is absent", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 0,
        msg: "ok",
        data: {
          comment_list: [
            {
              content: "只返回正文和点赞",
              like_num: 8,
              create_time: "2026-06-12 09:00:00",
            },
          ],
        },
      })
    );

    const result = await createWxrankClient().getArticleComments({
      url: ARTICLE_URL,
      commentId: "3805478085957124103",
    });

    expect(result[0]).toMatchObject({
      content: "只返回正文和点赞",
      like_num: 8,
    });
  });

  it("rejects an empty commentId before requesting comments", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ code: 0, data: { comment_list: [] } })
      );

    const promise = createWxrankClient().getArticleComments({
      url: ARTICLE_URL,
      commentId: "   ",
    });

    await expect(promise).rejects.toBeInstanceOf(WxrankConfigurationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing API key", () => {
    vi.stubEnv("WXRANK_API_KEY", "");

    expect(() => createWxrankClient()).toThrow(WxrankConfigurationError);
  });

  it("rejects insecure non-local base URLs", () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.stubEnv("WXRANK_BASE_URL", "http://api.example.com/raw-response-secret");

    expect(() => createWxrankClient()).toThrow(WxrankConfigurationError);
  });

  it("allows an HTTP localhost base URL in tests", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.stubEnv("WXRANK_BASE_URL", "http://127.0.0.1:4567/");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ code: 0, data: [] }));

    await createWxrankClient().searchArticles({ keyword: "Claude", sortType: 0 });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:4567/weixin/getso",
      expect.any(Object)
    );
  });

  it("classifies insufficient balance without leaking provider content", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 1000,
        msg: `${TEST_KEY} ${ARTICLE_URL} raw-response-secret`,
      })
    );

    const promise = createWxrankClient().searchArticles({
      keyword: "Claude",
      sortType: 0,
    });

    await expect(promise).rejects.toBeInstanceOf(WxrankInsufficientBalanceError);
    await promise.catch((error) => expectSafeError(error, "getso"));
  });

  it("classifies other business errors without leaking provider content", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: 9999,
        msg: `${TEST_KEY} ${ARTICLE_URL} raw-response-secret`,
      })
    );

    const promise = createWxrankClient().getArticleComments({
      url: ARTICLE_URL,
      commentId: "private-comments",
    });

    await expect(promise).rejects.toBeInstanceOf(WxrankBusinessError);
    await promise.catch((error) => expectSafeError(error, "getcm"));
  });

  it("classifies HTTP failures without exposing the response body", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`${TEST_KEY} ${ARTICLE_URL} raw-response-secret`, {
        status: 500,
      })
    );

    const promise = createWxrankClient().getArticleInfo(ARTICLE_URL);

    await expect(promise).rejects.toBeInstanceOf(WxrankRequestError);
    await promise.catch((error) => expectSafeError(error, "artinfo"));
  });

  it("classifies malformed JSON without exposing the response body", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`${TEST_KEY} ${ARTICLE_URL} raw-response-secret`, {
        status: 200,
      })
    );

    const promise = createWxrankClient().getArticleInfo(ARTICLE_URL);

    await expect(promise).rejects.toBeInstanceOf(WxrankRequestError);
    await promise.catch((error) => expectSafeError(error, "artinfo"));
  });

  it("rejects a successful response with the wrong data shape", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ code: 0, data: { raw: "raw-response-secret" } })
    );

    const promise = createWxrankClient().searchArticles({
      keyword: "Claude",
      sortType: 2,
    });

    await expect(promise).rejects.toBeInstanceOf(WxrankRequestError);
    await promise.catch((error) => expectSafeError(error, "getso"));
  });

  it("classifies AbortError as a safe request timeout", async () => {
    vi.stubEnv("WXRANK_API_KEY", TEST_KEY);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException(`${TEST_KEY} ${ARTICLE_URL}`, "AbortError")
    );

    const promise = createWxrankClient().getArticleInfo(ARTICLE_URL);

    await expect(promise).rejects.toBeInstanceOf(WxrankRequestError);
    await promise.catch((error) => expectSafeError(error, "artinfo"));
  });
});

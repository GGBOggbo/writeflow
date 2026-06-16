# 微信公众号数据接口文档（wxrank）

> 来源：https://www.showdoc.com.cn/2343746579263506

---

## 1. 实时获取公众号文章阅读、点赞、在看数

- **请求 URL**：`http://data.wxrank.com/weixin/getrk`
- **请求方式**：GET / POST（推荐 POST）
- **收费标准**：按调用次数，2 分钱/次

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| url | 是 | string | 文章链接，仅支持长链接（格式：`https://mp.weixin.qq.com/s?__biz=xxx==&mid=xxx&idx=1&sn=xxx`） |
| comment_id | 否 | string | 文章留言 id，如果需要返回留言数，需要提供该参数 |

> **注意**：
> - GET 请求时 url 务必要做 urlencode（链接中有 `&` 需转义）
> - url 若是短链，需先通过文章解析接口转为长链：https://www.showdoc.com.cn/2343746579263506/11558501783383049

### 请求示例（curl）

```bash
curl --location 'http://data.wxrank.com/weixin/getrk' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "url": "https://mp.weixin.qq.com/s?__biz=MzUzMjY0NDY4Ng==&mid=2247504367&idx=1&sn=09d0f7e717a0bd73f7b515fe222270a9#rd",
    "comment_id": "4232577569528594434"
}'
```

### 请求示例（Python）

```python
import requests
import json

apikey = 'your_api_key'
url = 'http://data.wxrank.com/weixin/getrk'
data = {
    "key": apikey,
    "url": "https://mp.weixin.qq.com/s?__biz=MzUzMjY0NDY4Ng==&mid=2247504367&idx=1&sn=09d0f7e717a0bd73f7b515fe222270a9#rd",
    "comment_id": "4232577569528594434"
}
headers = {
    'Content-Type': 'application/json'
}
response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.text)
```

### 返回示例

```json
{
    "code": 0,
    "data": {
        "read_num": 100001,
        "like_num": 4246,
        "look_num": 977,
        "share_num": 4635,
        "collect_num": 1130,
        "reward_count": 70,
        "comment_count": 17
    },
    "msg": "剩余875积分"
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| read_num | int | 阅读数 |
| like_num | int | 点赞数（大拇指） |
| look_num | int | 在看数（爱心图标） |
| share_num | int | 分享数（转发图标） |
| collect_num | int | 收藏数（隐藏数据） |
| reward_count | int | 赞赏数，又名喜欢作者 |
| comment_count | int | 留言数，传 comment_id 才会返回 |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 文章链接为空（必须是公众号文章链接） |
| 1002 | 文章验证失败（文章链接解析失败） |
| 1003 | 获取失败，请重试 |
| 1004 | 服务异常，请重试 |
| 9999 | QPS 超过上限（每秒不能超过 10 个） |

---

## 2. 实时获取公众号推文列表（支持分页）

- **请求 URL**：`http://data.wxrank.com/weixin/getps`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，5 分钱/次

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| wxid | 是 | string | 微信号或原始 ID（gh 开头） |
| cursor | 否 | string | 分页游标，用来获取下一页。**有效期 24 小时** |

> **注意**：
> - wxid 尽量采用原始 ID（一般以 gh 或 wxid 开头），微信号可被修改，原始 ID 不可变
> - 每页可获取 10 次推文，每次推文最多 8 篇文章，通过 art_url 字段中 idx 可判断位于第几篇

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getps' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "wxid": "gh_e036770fc439",
    "cursor": "ZlM4Yk9jWlRXNnBwZE5iTGl6Nm43cUtiMVpCQ2daM2VtRi90amJmTzYyQT0="
}'
```

### 返回示例

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "pub_time": "2025-02-16 20:10:57",
        "title": "倪虹洁演短剧，开年就杀疯了",
        "sn": "8d2a99301e3a13fda90e36735ece3b7c",
        "art_url": "http://mp.weixin.qq.com/s?__biz=Mzg2Nzc0MDM3Nw==&mid=2248424397&idx=1&sn=8d2a99301e3a13fda90e36735ece3b7c&chksm=cc47af0ec0df34e66a4880c4ef09f21d39b651386a8a65d2c91aed1d54fd598f95a50260ecb4&scene=126&sessionid=0#rd",
        "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/haySDMRphfnDIlfwjeZjBt7GibgwnEsaicqaRSOSJAzEtzYFffHm0V8cbauVMN6eCEelicOHWSBUq8Xm1pcFhJZ6w/640?wxtype=jpeg&wxfrom=0"
      },
      {
        "pub_time": "2025-02-16 20:10:57",
        "title": "饺子，逆天改命",
        "sn": "4e7d756cb0f2f1b4841a78645190ac3f",
        "art_url": "http://mp.weixin.qq.com/s?__biz=Mzg2Nzc0MDM3Nw==&mid=2248424397&idx=2&sn=4e7d756cb0f2f1b4841a78645190ac3f&chksm=cc619dc1680bbb6b9cae46407ba55103fbf509bb833e792726b21bffe516f1e7644aa3a437cb&scene=126&sessionid=0#rd",
        "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/haySDMRphfnDIlfwjeZjBt7GibgwnEsaicd5iciaBLTw84DqbvpYwOZ8nV3EvXoPj5Oxt3Aq9GC9e0nSJqAqZOb5oA/300?wxtype=jpeg&wxfrom=0"
      },
      {
        "pub_time": "2025-02-16 20:10:57",
        "title": "金价突然下跌，有人排队8小时抢购",
        "sn": "af0bca72c57fc29d6c84d2fd1afab40b",
        "art_url": "http://mp.weixin.qq.com/s?__biz=Mzg2Nzc0MDM3Nw==&mid=2248424397&idx=3&sn=af0bca72c57fc29d6c84d2fd1afab40b&chksm=cc2965cf8bf9c88dbb35bbc146f81c0786a8bfd86f31bd2698b0bd7e97c97db3ed07d9616a51&scene=126&sessionid=0#rd",
        "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/haySDMRphfnDIlfwjeZjBt7GibgwnEsaicKYrUJXJ0PwqzeyfTf8WjApYl5ZpEbN0Ltt6lz2yAk3GuuQyjK896nw/300?wxtype=jpeg&wxfrom=0"
      }
    ],
    "wxid": "gh_e036770fc439",
    "cursor": "ZlM4Yk9jWlRXNnBwZE5iTGl6Nm43cUtiMVpCQ2daM2VtRi90amJmTzYyQT0="
  },
  "msg": "剩余32653积分"
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| list.pub_time | string | 文章发布时间 |
| list.art_url | string | 文章发布链接 |
| list.pic_url | string | 文章配图链接 |
| list.title | string | 文章标题（笔记全文） |
| list.sn | string | 文章唯一值，不会重复 |
| wxid | string | 公众号原始 ID，一般以 gh 开头 |
| cursor | string | 分页游标（首页传空，传当前页 cursor 获取下一页） |

> **分页说明**：文章列表没有总条数，当 list 数组为 `[]` 时说明已是最后一页

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | wxid 不能为空 |
| 1002 | wxid 验证失败 |
| 1003 | cursor 校验失败 |
| 1004 | 请求失败，请重试 |
| 1005 | 请求超时，请重试 |
| 9999 | QPS 超过上限（每秒不能超过 5 个） |

---

## 3. 实时获取公众号搜索列表（支持分页）

- **请求 URL**：`http://data.wxrank.com/weixin/getsu`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，1 毛钱/次
- **数据来源**：微信「添加朋友」→「公众号」模块

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| keyword | 是 | string | 搜索关键词 |
| page | 否 | int | 分页页码，默认 1 |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getsu' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "keyword": "丁香医生"
}'
```

### 返回示例

```json
{
    "code": 0,
    "data": [
        {
            "wx_id": "DingXiangYiSheng",
            "wx_biz": "MjA1ODMxMDQwMQ==",
            "wx_user": "wxid_4302923029011",
            "wx_name": "丁香医生",
            "signature": "与一群有知识、有温度的医生，共同分享健康知识。 来丁香医生App/小程序，查疾病、查药品，线上问三甲名医。",
            "headImgUrl": "http://wx.qlogo.cn/mmhead/Q3auHgzwzM6ZgyZRj3WvD0BTVSBiaaXQC4MBeaVRbIYNUibs1dk1ykPw/0"
        },
        {
            "wx_id": "JobmdCN",
            "wx_biz": "MjM5MDA4MTk2MA==",
            "wx_user": "gh_f4f286da622c",
            "wx_name": "丁香人才",
            "signature": "丁香人才是丁香园旗下专业医疗招聘平台，为您提供内科、外科、检验、康复、放射、急诊、中医等科室的公立医院、民营医院医生招聘信息。",
            "headImgUrl": "http://wx.qlogo.cn/mmhead/Q3auHgzwzM5iccQQibNlc8nG5LWwSV2LsYgCz6w4P6cm3cbIIXicFVRFw/0"
        },
        {
            "wx_id": "FZDingXiangClinics",
            "wx_biz": "MzU5NTE0NTk3Mg==",
            "wx_user": "gh_364424ef2196",
            "wx_name": "福州丁香诊所",
            "signature": "该公众号已停止服务，请新老客户前往新公众号"丁香云医疗"。",
            "headImgUrl": "http://wx.qlogo.cn/mmhead/Q3auHgzwzM5n6Utialdx1Kym0OCpSdUkD33kQudU3shs8nMicEx6QqCw/0"
        }
    ],
    "msg": "剩余33994积分"
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| wx_id | string | 公众号 ID（微信号） |
| wx_biz | string | 公众号 biz |
| wx_user | string | 公众号原始 ID |
| wx_name | string | 公众号名称 |
| signature | string | 公众号简介 |
| headImgUrl | string | 公众号头像链接 |

> **分页说明**：列表没有总条数，当 data 数组为 `[]` 时说明已是最后一页

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 关键词不能为空 |
| 1002 | 请求失败，请重试 |
| 1003 | 请求超时，请重试 |
| 1008 | 请求频繁，请稍候 |
| 9999 | QPS 超过上限（每秒不能超过 3 个） |

---

## 4. 实时获取搜一搜文章列表（支持分页）

- **请求 URL**：`http://data.wxrank.com/weixin/getso`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，1 毛钱/次
- **数据来源**：微信「搜一搜」→「文章」模块（最新/最热）

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| keyword | 是 | string | 搜索关键词 |
| sort_type | 否 | int | 排序：0.不限（默认） 2.最新 4.最热 |
| page | 否 | int | 分页页码，默认 1 |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getso' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "sort_type": "2",
    "keyword": "丁香"
}'
```

### 返回示例

```json
{
    "code": 0,
    "data": [
        {
            "wx_name": "平草木记",
            "pub_time": "2024-06-06 13:15:34",
            "title": "观察一棵树｜<em class=\"highlight\">丁香</em>•小满",
            "desc": "中医认为，公<em class=\"highlight\">丁香</em>具有温暖脾胃、助长阳气、暖肾等功效...",
            "art_url": "http://mp.weixin.qq.com/s?__biz=MzkxNTMzNDY4NA==&mid=2247486221&idx=1&sn=ff8c08d877ea47cf1307e3be73761cc6",
            "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/FQPbXVHVWtEoqKMV3DZibZkwxgvGXTe4fRrK0ic1GMYJJWf6Hrr2ia1Hia8NJksLeEibnk1ibGC46zrMH5yFGnrtxKNQ/0?wx_fmt=jpeg"
        },
        {
            "wx_name": "黑龙江大学报",
            "pub_time": "2024-06-06 13:00:44",
            "title": "<em class=\"highlight\">丁香</em>轻舞，香萦心扉｜装点校园里的一抹紫色",
            "desc": "在中国传统文化中，<em class=\"highlight\">丁香</em>花象征着高洁、坚强的品质...",
            "art_url": "http://mp.weixin.qq.com/s?__biz=MzUyOTc4MDE5Nw==&mid=2247499149&idx=1&sn=a179fadf3ed8e91c107d53425cc0f8d3",
            "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/gP02Ps38ziabtciaYHsQic8rnokFw6GzplH2vZDWc6QFaLmHBMMzLeFQCbBP9NOuDgaQfMVbPlAdH6UjMQfRJoKUg/0?wx_fmt=jpeg"
        }
    ],
    "msg": "剩余36474积分"
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| wx_name | string | 公众号名称 |
| pub_time | string | 发布时间 |
| title | string | 文章标题（含高亮标签） |
| desc | string | 文章摘要（含高亮标签） |
| art_url | string | 文章链接 |
| pic_url | string | 文章封面 |

> **分页说明**：列表没有总条数，当 data 数组为 `[]` 时说明已是最后一页

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 关键词不能为空 |
| 1002 | 请求失败，请重试 |
| 1003 | 请求超时，请重试 |
| 1004 | 返回空集，请重试 |
| 1008 | 请求频繁，请稍候 |
| 9999 | QPS 超过上限（每秒不能超过 3 个） |

---

## 5. 实时获取公众号文章页内容

- **请求 URL**：`http://data.wxrank.com/weixin/artinfo`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，1 分钱/次

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| url | 是 | string | 文章链接，长链和短链都可以 |

> **注意**：GET 请求时 url 务必要做 urlencode（链接中有 `&` 需转义）

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/artinfo' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "url": "https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA==&mid=2247544558&idx=1&sn=fb57861a2cbb1e24d5f297d303725362&chksm=e8e822f97fd977ad2b1b484c72bdb2024bbe6305aef91735edf67e471670d714cae5a4a352ff&scene=126&sessionid=1736469183#rd"
}'
```

### 请求示例（Python）

```python
import requests
import json

apikey = 'your_api_key'
url = 'http://data.wxrank.com/weixin/artinfo'
data = {
    "key": apikey,
    "url": "https://mp.weixin.qq.com/s/7iDKi_oVi_LSQAyN_nPzWg"
}
headers = {
    'Content-Type': 'application/json'
}
response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.text)
```

### 返回示例

```json
{
    "code": 0,
    "msg": "剩余99479积分",
    "data": {
        "biz": "MzIzOTU0NTQ0MA==",
        "mid": "2247544558",
        "idx": "1",
        "sn": "fb57861a2cbb1e24d5f297d303725362",
        "article_url": "https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA==&mid=2247544558&idx=1&sn=fb57861a2cbb1e24d5f297d303725362&chksm=9f0d4837db754d4176130cfe9bd65340e2c46d2b80a6438ad85abf8ce412c7d6cf0fb16689b7#rd",
        "name": "阿里云开发者",
        "user_name": "gh_7fc9311f04ad",
        "pub_time": "2025-01-10 08:31:24",
        "signature": "阿里巴巴官方技术号，关于阿里的技术创新均呈现于此。",
        "hd_head_img": "http://wx.qlogo.cn/mmhead/Q3auHgzwzM4yGEW4Je6O6aLExtOx3rQQXxibBoiawVa1y9ncdIvz8aWA/0",
        "msg_cdn_url": "https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naIzKjOqpMbH2YUhPs3fIiaFuE2bkuxOR09n4xrfIvaj9O7abP220RG3AekoAOf1IAib7O2azfic8GG6g/0?wx_fmt=jpeg",
        "service_type": "0",
        "copyright_stat": "1",
        "title": "架构实操：画好一张业务模型图",
        "digest": "本文以SDK设计的角度分析了如何构建一张属于SDK的各个业务的模型。",
        "author": "陈锦杰(河洲)",
        "province_name": "浙江",
        "comment_id": "3805478085957124103",
        "msg_daily_idx": "1",
        "item_show_type": "0",
        "picture_url_list": [
            "https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naIzKjOqpMbH2YUhPs3fIiaFuIiaQicgicAaYsOxHWmVJYf4WajD1A4UhT37AsXdxRngoTmyicpqepPyPgQ/640?wx_fmt=jpeg&from=appmsg",
            "https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naIzKjOqpMbH2YUhPs3fIiaFuVwzvDeNsJyuJGPHLmMZvSUUiasKGyBOwYQtibHzAjS6A2wqP9acICF0A/640?wx_fmt=other&from=appmsg"
        ],
        "text": "阿里妹导读本文以SDK设计的角度分析了如何构建一张属于SDK的各个业务的模型图。...",
        "html": "<p style=\"text-align: center;\">xxx</p>..."
    }
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| biz | string | 公众号 biz |
| mid | int | mid |
| sn | string | 文章唯一 ID，不会重复 |
| idx | int | 文章位置，1 代表头条，以此类推 |
| article_url | string | 文章长链接 |
| name | string | 公众号名称 |
| user_name | string | 公众号原始 ID |
| pub_time | string | 文章发布时间 |
| signature | string | 公众号简介 |
| hd_head_img | string | 公众号头像 |
| msg_cdn_url | string | 文章封面图 |
| service_type | int | 0.订阅号 1.服务号 |
| copyright_stat | int | 0.非原创 1.原创 2.转载 |
| title | string | 文章标题 |
| digest | string | 文章摘要 |
| author | string | 原创作者 |
| comment_id | string | 文章留言 ID |
| province_name | string | 发布于（IP 属地） |
| msg_daily_idx | string | 当天第几次推文（有些号一天推多次） |
| item_show_type | string | 0:文章（最常见）5:纯视频 7:纯音乐 8:纯图片 10:纯文字 |
| picture_url_list | array | 文章中的插图链接地址 |
| text | string | 文章内容（纯文本，去除 HTML 标签） |
| html | string | 文章内容（含 HTML 标签） |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 文章链接为空（必须是公众号文章链接，长链和短链都可以） |
| 1002 | 文章验证失败（链接解析失败，验证不通过） |
| 1004 | 文章删除/遮蔽（文章已不能访问） |
| 9999 | QPS 超过上限（每秒不能超过 5 个） |

---

## 6. 实时获取公众号文章留言列表（支持分页）

- **请求 URL**：`http://data.wxrank.com/weixin/getcm`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，5 分钱/次
- **说明**：每页最多 100 条，支持获取回复留言列表

### 模式一：获取留言列表

#### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| url | 是 | string | 文章长链接 |
| comment_id | 是 | bigint | 文章留言 ID |
| buffer | 否 | string | 分页游标，用来获取下一页 |

> url 和 comment_id 可通过文章内容解析接口获取：https://www.showdoc.com.cn/2343746579263506/11558501783383049

#### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getcm' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "url": "https://mp.weixin.qq.com/s?__biz=MjM5OTA1MDUyMA==&mid=2655501703&idx=1&sn=23b60208951a08be99eef2c63cce74f7&chksm=c3f7c62905b08db7116d0bc2de5ce4dac347c9e8d24f06ec44fe55c5c58444f9e6f734ddf294&scene=126&sessionid=0#rd",
    "comment_id": "4471744494148894725",
    "buffer": ""
}'
```

#### 返回示例

```json
{
    "code": 0,
    "msg": "剩余999907积分",
    "data": {
        "buffer": "GBggADAA",
        "comment_list": [
            {
                "id": "5619980168698266063",
                "content": "我就喜欢听雷子说事实：\n1、跑1300多公里只用充一次电\n2、手机比硬币薄",
                "like_num": 42,
                "ip_wording": {
                    "city_id": "",
                    "city_name": "",
                    "country_id": "156",
                    "country_name": "中国",
                    "province_id": "",
                    "province_name": "云南"
                },
                "nick_name": "暮夕",
                "logo_url": "https://wx.qlogo.cn/mmopen/xxx/64",
                "create_time": "2026-04-14 09:26:43",
                "reply_new": {
                    "max_reply_id": 30,
                    "reply_total_cnt": 26,
                    "reply_list": [
                        {
                            "content": "最后没想到是立起来的硬币[捂脸]",
                            "like_num": 29,
                            "ip_wording": {
                                "city_id": "",
                                "city_name": "",
                                "country_id": "156",
                                "country_name": "中国",
                                "province_id": "",
                                "province_name": "陕西"
                            },
                            "create_time": "2026-04-14 09:32:10"
                        }
                    ]
                }
            },
            {
                "id": "8451913421351289377",
                "content": "雷总这战略眼光真是高",
                "like_num": 19,
                "ip_wording": {
                    "country_name": "中国",
                    "province_name": "陕西"
                },
                "nick_name": "Tom",
                "logo_url": "https://wx.qlogo.cn/mmopen/xxx/64",
                "create_time": "2026-04-14 09:13:25"
            }
        ],
        "comment_total_cnt": 24,
        "total_count": 60
    }
}
```

#### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| buffer | string | 分页游标 |
| total_count | int | 留言总数 |
| comment_total_cnt | int | 一级留言总数（不包括回复），可用于判断是否需要翻页 |
| comment_list | list | 留言列表（含一级留言和回复） |
| comment_list[].id | int | 一级留言 ID，唯一值 |
| comment_list[].content | string | 留言内容 |
| comment_list[].like_num | int | 留言点赞数 |
| comment_list[].create_time | string | 留言时间 |
| comment_list[].ip_wording | object | IP 属地信息（country_name/province_name 等） |
| comment_list[].nick_name | string | 留言人昵称 |
| comment_list[].logo_url | string | 留言人头像 |
| comment_list[].reply_new | object | 回复留言（无回复时该字段不存在） |
| comment_list[].reply_new.max_reply_id | int | 回复最大 ID（用于分页获取更多回复） |
| comment_list[].reply_new.reply_total_cnt | int | 回复留言总数 |
| comment_list[].reply_new.reply_list | list | 回复留言列表 |

---

### 模式二：获取更多回复留言

> 用 offset 分页，每页最多 100 条

#### 额外请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| content_id | 是 | bigint | 一级留言中的 id |
| max_reply_id | 是 | bigint | 一级留言中的 reply_new.max_reply_id |
| offset | 否 | int | 偏移量，首页默认 0，第二页传 100，以此类推 |

#### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getcm' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "url": "https://mp.weixin.qq.com/s?__biz=MjM5OTA1MDUyMA==&mid=2655501703&idx=1&sn=23b60208951a08be99eef2c63cce74f7&chksm=c3f7c62905b08db7116d0bc2de5ce4dac347c9e8d24f06ec44fe55c5c58444f9e6f734ddf294&scene=126&sessionid=0#rd",
    "comment_id": "4471744494148894725",
    "content_id": "4308035335293501536",
    "max_reply_id": "20"
}'
```

#### 返回示例

```json
{
    "code": 0,
    "msg": "剩余999908积分",
    "data": {
        "comment_list": [
            {
                "content": "最后没想到是立起来的硬币[捂脸]",
                "like_num": 29,
                "ip_wording": {
                    "country_name": "中国",
                    "province_name": "陕西"
                },
                "create_time": "2026-04-14 09:32:10"
            },
            {
                "content": "我的车只充一次电跑不了1300公里，可能只能跑500公里。",
                "like_num": 2,
                "ip_wording": {
                    "country_name": "中国",
                    "province_name": "北京"
                },
                "create_time": "2026-04-14 09:34:04"
            }
        ],
        "offset": 0
    }
}
```

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 必须参数不能为空 |
| 1002 | 获取失败，请重试 |
| 1003 | 系统故障，请稍后 |
| 9999 | QPS 超过上限（每秒不能超过 3 个） |

---

## 7. 根据 biz 获取公众号原始 id

- **请求 URL**：`http://data.wxrank.com/weixin/getinfo`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，5 分钱/次

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| biz | 是 | string | 公众号 biz |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getinfo?key=xxx&biz=MzIzOTU0NTQ0MA=='
```

### 返回示例

```json
{
  "code": 0,
  "msg": "数据获取成功",
  "data": {
    "name": "阿里云开发者",
    "user_name": "gh_7fc9311f04ad",
    "signature": "阿里巴巴官方技术号，关于阿里的技术创新均呈现于此。",
    "hd_head_img": "http://mmbiz.qpic.cn/mmbiz_png/Z6bicxIx5naI1jwOfnA1w4PL2LhwNia76vBRfzqaQVVVlqiaLjmWYQXHsn1FqBHhuGVcxEHjxE9tibBFBjcB352fhQ/0?wx_fmt=png"
  }
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| name | string | 公众号名称 |
| user_name | string | 公众号原始 ID |
| signature | string | 公众号简介 |
| hd_head_img | string | 公众号头像 |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | biz 不能为空 |
| 9999 | QPS 超过上限（每秒不能超过 5 个） |

---

## 8. 根据 biz 获取公众号基本信息（关于公众号页面）

- **请求 URL**：`http://data.wxrank.com/weixin/getbiz`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，5 分钱/次

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| biz | 是 | string | 公众号 biz |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getbiz?key=xxx&biz=MzI2NDk5NzA0Mw=='
```

### 返回示例

```json
{
    "code": 0,
    "msg": "数据获取成功",
    "data": [
        {
            "key": "公众号简介",
            "value": "36氪是服务中国新经济参与者的卓越品牌和开创性平台，提供新锐深度的商业报道，强调趋势和价值，我们的slogan是：让一部分人先看到未来。"
        },
        {
            "key": "微信号",
            "value": "wow36kr"
        },
        {
            "key": "认证类型",
            "value": "企业"
        },
        {
            "key": "认证主体",
            "value": "北京多氪信息科技有限公司"
        },
        {
            "key": "商标保护",
            "value": "36氪"
        },
        {
            "key": "授权第三方服务",
            "value": ["壹伴", "秀米", "36氪", "抽奖助手", "钉钉 订阅号平台"]
        },
        {
            "key": "名称记录",
            "value": [
                "2018年01月01日 "品新传媒"账号迁移改名"36氪"",
                "2017年12月18日 注册"品新传媒""
            ]
        },
        {
            "key": "IP属地",
            "value": "北京"
        }
    ]
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| key | string | 字段名（公众号简介/微信号/认证类型/认证主体/商标保护/授权第三方服务/名称记录/IP 属地） |
| value | string \| array | 字段值，部分字段为数组（如授权第三方服务、名称记录） |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | biz 不能为空 |
| 9999 | QPS 超过上限（每秒不能超过 3 个） |

---

## 9. 实时获取文章内容页（含阅读/点赞/分享数）

- **请求 URL**：`http://data.wxrank.com/weixin/artdata`
- **请求方式**：POST
- **收费标准**：按调用次数，5 分钱/次
- **说明**：相当于接口 1（getrk）+ 接口 5（artinfo）的合体，一次请求获取文章内容和互动数据

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| url | 是 | string | 文章链接，仅支持长链接 |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/artdata' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "url": "https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA==&mid=2247544558&idx=1&sn=fb57861a2cbb1e24d5f297d303725362&chksm=e8e822f97fd977ad2b1b484c72bdb2024bbe6305aef91735edf67e471670d714cae5a4a352ff&scene=126&sessionid=1736469183#rd"
}'
```

### 请求示例（Python）

```python
import requests
import json

apikey = 'your_api_key'
url = 'http://data.wxrank.com/weixin/artdata'
data = {
    "key": apikey,
    "url": "https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA==&mid=2247544558&idx=1&sn=fb57861a2cbb1e24d5f297d303725362&chksm=e8e822f97fd977ad2b1b484c72bdb2024bbe6305aef91735edf67e471670d714cae5a4a352ff&scene=126&sessionid=1736469183#rd"
}
headers = {
    'Content-Type': 'application/json'
}
response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.text)
```

### 返回示例

```json
{
    "code": 0,
    "msg": "剩余99479积分",
    "data": {
        "biz": "MzIzOTU0NTQ0MA==",
        "mid": "2247544558",
        "idx": "1",
        "sn": "fb57861a2cbb1e24d5f297d303725362",
        "article_url": "https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA%3D%3D&mid=2247544558&idx=1&sn=fb57861a2cbb1e24d5f297d303725362",
        "name": "阿里云开发者",
        "user_name": "gh_7fc9311f04ad",
        "pub_time": "2025-01-10 08:31:24",
        "signature": "阿里巴巴官方技术号，关于阿里的技术创新均呈现于此。",
        "short_link": "https://mp.weixin.qq.com/s/46eX_kLhNfNcPZxYG_LQmA",
        "hd_head_img": "http://wx.qlogo.cn/mmhead/Q3auHgzwzM4yGEW4Je6O6aLExtOx3rQQXxibBoiawVa1y9ncdIvz8aWA/0",
        "msg_cdn_url": "https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naIzKjOqpMbH2YUhPs3fIiaFuE2bkuxOR09n4xrfIvaj9O7abP220RG3AekoAOf1IAib7O2azfic8GG6g/0?wx_fmt=jpeg",
        "service_type": "0",
        "copyright_stat": "1",
        "title": "架构实操：画好一张业务模型图",
        "digest": "本文以SDK设计的角度分析了如何构建一张属于SDK的各个业务的模型。",
        "author": "陈锦杰(河洲)",
        "province_name": "浙江",
        "comment_id": "3805478085957124103",
        "msg_daily_idx": "1",
        "item_show_type": "0",
        "appmsg_bar_data": {
            "read_num": 19715,
            "like_num": 193,
            "look_num": 128,
            "share_num": 1800,
            "collect_num": 1264,
            "reward_count": 0,
            "comment_count": 6,
            "original_content_num": 1785
        },
        "picture_url_list": [
            "https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naIzKjOqpMbH2YUhPs3fIiaFuIiaQicgicAaYsOxHWmVJYf4WajD1A4UhT37AsXdxRngoTmyicpqepPyPgQ/640?wx_fmt=jpeg&from=appmsg"
        ],
        "text": "阿里妹导读本文以SDK设计的角度分析了如何构建一张属于SDK的各个业务的模型图。...",
        "html": "<p style=\"text-align: center;\">xxx</p>..."
    }
}
```

### 返回参数说明

**文章基础信息**

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| biz | string | 公众号 biz |
| mid | int | mid |
| sn | string | 文章唯一 ID，不会重复 |
| idx | int | 文章位置，1 代表头条，以此类推 |
| article_url | string | 文章长链接 |
| short_link | string | 文章短链接 |
| name | string | 公众号名称 |
| user_name | string | 公众号原始 ID |
| pub_time | string | 文章发布时间 |
| signature | string | 公众号简介 |
| hd_head_img | string | 公众号头像 |
| msg_cdn_url | string | 文章封面图 |
| service_type | int | 0.订阅号 1.服务号 |
| copyright_stat | int | 0.非原创 1.原创 2.转载 |
| title | string | 文章标题 |
| digest | string | 文章摘要 |
| author | string | 原创作者 |
| comment_id | string | 文章留言 ID |
| province_name | string | 发布于（IP 属地） |
| msg_daily_idx | string | 当天第几次推文（有些号一天推多次） |
| item_show_type | string | 0:文章（最常见）5:纯视频 7:纯音乐 8:纯图片 10:纯文字 |
| picture_url_list | array | 文章中的插图链接地址 |
| text | string | 文章内容（纯文本，去除 HTML 标签） |
| html | string | 文章内容（含 HTML 标签） |

**互动数据（appmsg_bar_data）**

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| read_num | int | 阅读数 |
| like_num | int | 点赞数（大拇指） |
| look_num | int | 在看数（爱心图标） |
| share_num | int | 分享数（转发图标） |
| collect_num | int | 收藏数（隐藏数据） |
| reward_count | int | 赞赏数，又名喜欢作者 |
| comment_count | int | 留言数（评论数） |
| original_content_num | int | 原创内容篇数 |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 文章链接为空（必须是公众号文章长链接） |
| 1002 | 文章验证失败（链接解析失败，验证不通过） |
| 1003 | 系统故障（稍后再试，可联系管理员） |
| 1004 | 文章删除/遮蔽（文章已不能访问） |
| 9999 | QPS 超过上限（每秒不能超过 5 个） |

---

## 10. 实时获取公众号推文列表（返回短链）

- **请求 URL**：`http://data.wxrank.com/weixin/getpc`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，5 分钱/次

> **⚠️ 注意**：非必要不使用该接口，目前已不能获取到送达人数（预估粉丝数），建议切换到接口 2（getps）

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| biz | 是 | string | 公众号 biz（如 `MzI2NDk5NzA0Mw==`） |
| begin | 否 | int | 开始位置，默认 0；每页返回 5 次推文 |

### 请求示例

```bash
curl --location 'http://data.wxrank.com/weixin/getpc' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "biz": "MzI2NDk5NzA0Mw==",
    "begin": 0
}'
```

### 返回示例

```json
{
    "code": 0,
    "msg": "数据获取成功",
    "data": {
        "begin": 0,
        "total_count": 12828,
        "publish_list": [
            {
                "msgid": 1000013366,
                "sent_total": 5288070,
                "sent_info_time": "2025-05-28 08:10:49",
                "sent_appmsg_list": [
                    {
                        "title": "8点1氪：兴业银行就"为千万存款客户子女提供名企实习"致歉",
                        "art_url": "https://mp.weixin.qq.com/s/t6OGD6-CTwgp_lrnMnUh3A",
                        "pic_url": "https://mmbiz.qpic.cn/mmbiz_jpg/xxx/0?wx_fmt=jpeg",
                        "idx": 1,
                        "is_deleted": 0,
                        "copyright_status": 100
                    },
                    {
                        "title": "大搞辣妹风的优衣库，抛弃普通人",
                        "art_url": "https://mp.weixin.qq.com/s/3fmtym1-B17H2kdmbo30bw",
                        "pic_url": "https://mmbiz.qpic.cn/mmbiz_jpg/xxx/0?wx_fmt=jpeg",
                        "idx": 2,
                        "is_deleted": 0,
                        "copyright_status": 101
                    }
                ]
            }
        ]
    }
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| begin | int | 分页开始位置，首页是 0 |
| total_count | int | 总推文次数（非文章总数，一次推送可含多篇文章） |
| publish_list | list | 推送文章列表（每页返回 5 次推文，按时间顺序） |
| publish_list.msgid | int | 推送号，当前推送的唯一 ID |
| ~~publish_list.sent_total~~ | int | ~~送达人数~~（**已无法抓取**） |
| publish_list.sent_info_time | string | 推送时间 |
| publish_list.sent_appmsg_list.title | string | 文章标题 |
| publish_list.sent_appmsg_list.art_url | string | 文章发布链接（短链） |
| publish_list.sent_appmsg_list.pic_url | string | 文章配图链接 |
| publish_list.sent_appmsg_list.idx | int | 文章位置，1.头条，以此类推 |
| publish_list.sent_appmsg_list.is_deleted | int | 是否删除，0.否 1.是 |
| publish_list.sent_appmsg_list.copyright_status | int | 版权状态：11.原创，101/201.转载 |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | 获取失败，请稍后再试 |
| 9999 | QPS 超过上限（每秒不能超过 2 个） |

---

## 11. 获取公众号每日爆文列表（离线，支持分页）

- **请求 URL**：`http://data.wxrank.com/weixin/artlist`
- **请求方式**：GET / POST
- **收费标准**：按调用次数，1 分钱/次
- **说明**：返回数据默认按阅读数从高到低排序，每页 50 条

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |
| date | 否 | string | 日期，格式 `yyyymmdd`（如 `20250401`），最早 `20230101` |
| month | 否 | string | 年月，格式 `yyyymm`（如 `202601`），默认当月，最早 `202301` |
| wx_biz | 否 | string | 按指定公众号 biz 筛选 |
| min_read_num | 否 | int | 筛选最低阅读数 |
| max_read_num | 否 | int | 筛选最高阅读数 |
| keyword | 否 | string | 搜索关键词（标题和内容） |
| wx_type | 否 | string | 分类：时事/文化/健康/职场/学术/美食/民生/科技/情感/楼市/汽车/幽默/政务/财富/旅行/企业/时尚/美体/教育/体娱/百科/乐活/创业/文摘 |
| cursor | 否 | string | 分页游标（有效期 5 分钟） |

### 请求示例（按日期）

```bash
curl --location 'http://data.wxrank.com/weixin/artlist' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "date": "20251201",
    "keyword": "牛市来了",
    "min_read_num": 1000,
    "max_read_num": 10000
}'
```

### 请求示例（按月份）

```bash
curl --location 'http://data.wxrank.com/weixin/artlist' \
--header 'Content-Type: application/json' \
--data '{
    "key": "xxx",
    "month": "202601",
    "keyword": "比特币",
    "min_read_num": 1000,
    "max_read_num": 10000
}'
```

### 返回示例

```json
{
    "code": 0,
    "msg": "剩余99678积分",
    "data": {
        "cursor": "FGluY2x1ZGVfY29udGV4dF91dWlkDXF1ZXJ5QW5kRmV0Y2gBFmcwOHI5MEx1VFdhNWVVWGtaVFh3Q3cAAAAA...",
        "total": 2,
        "list": [
            {
                "sn": "b11ea830f02c09d92db64f5a3d0c3dc6",
                "wx_biz": "Mzg5MDc1MjM4MA==",
                "wx_type": "文化",
                "pub_time": "2025-12-01 20:37:12",
                "title": "20年6万到270万：成都李守常的稳赢",
                "read_num": 2401,
                "like_num": 25,
                "look_num": 9,
                "share_num": 105,
                "ip_region": "广东",
                "copyright": "原创",
                "art_url": "https://mp.weixin.qq.com/s?__biz=Mzg5MDc1MjM4MA==&mid=2247615598&idx=5&sn=b11ea830f02c09d92db64f5a3d0c3dc6&chksm=ce6af3497c094cc9...#rd",
                "pic_url": "https://mmbiz.qpic.cn/sz_mmbiz_jpg/xxx/0",
                "content": "拒绝晦涩！每天一个化名投资小故事...",
                "data_update_time": "2025-12-03 01:55:50"
            },
            {
                "sn": "bc7d765af6acefe14b31472abcb36b47",
                "wx_biz": "Mzg2Nzk0NzcyMQ==",
                "wx_type": "体娱",
                "pub_time": "2025-12-01 11:07:43",
                "title": "目前还有哪几个数字藏品平台可以玩？",
                "read_num": 1341,
                "like_num": 10,
                "look_num": 3,
                "share_num": 26,
                "ip_region": "江苏",
                "copyright": "原创",
                "art_url": "https://mp.weixin.qq.com/s?__biz=Mzg2Nzk0NzcyMQ==&mid=2247485900&idx=1&sn=bc7d765af6acefe14b31472abcb36b47...#rd",
                "pic_url": "https://mmbiz.qpic.cn/mmbiz_jpg/xxx/0",
                "content": "接近年底青黄不接之际，数字藏品整个市场比较低落...",
                "data_update_time": "2025-12-04 02:26:19"
            }
        ]
    }
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|:-------|:-----|:-----|
| cursor | string | 分页游标（有效期 5 分钟） |
| total | int | 符合条件的总数 |
| list.sn | string | 文章唯一标识 |
| list.wx_biz | string | 公众号 biz |
| list.wx_type | string | 账号分类 |
| list.pub_time | string | 发布时间 |
| list.art_url | string | 文章链接 |
| list.pic_url | string | 封面链接 |
| list.title | string | 文章标题 |
| list.content | string | 文章内容 |
| list.read_num | int | 阅读数 |
| list.like_num | int | 点赞数 |
| list.look_num | int | 在看数 |
| list.share_num | int | 分享数 |
| list.ip_region | string | IP 归属地 |
| list.copyright | string | 原创/转载 |
| list.data_update_time | string | 数据最后更新时间 |

### 错误码

| code | 说明 |
|:-----|:-----|
| 0 | 获取成功（扣积分） |
| 1000 | 积分不足 |
| 1001 | date 日期格式有误 |
| 1002 | 获取失败，请重试 |

---

## 12. 获取当前剩余积分

- **请求 URL**：`http://data.wxrank.com/weixin/score?key=xxx`
- **请求方式**：GET
- **说明**：查询接口，不扣积分

### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|:-------|:-----|:-----|:-----|
| key | 是 | string | API 密钥 |

### 返回示例

```json
{
    "code": 0,
    "msg": "剩余9810积分"
}
```

---

## 13. 注册积分充值指南

1. **登录管理后台（微信扫码）**：https://data.wxrank.com/
2. **点击充值**（个人中心）
3. **选择充值金额**

---

## 14. 获取参数小技巧

用浏览器打开公众号任意一篇文章，查看页面源代码（快捷键：Ctrl+U）

以文章 `https://mp.weixin.qq.com/s/KEkzoMy3Tg5Zs3WJxk-IkA?scene=0&subscene=90` 为例：

### 如何获取公众号 biz？（通常以 `==` 结尾）

搜索关键词 `var biz`

### 如何获取公众号原始 id？（通常以 `gh` 或 `wxid` 开头）

搜索关键词 `var user_name`

### 如何获取文章 comment_id？（一串数字）

搜索关键词 `var comment_id`

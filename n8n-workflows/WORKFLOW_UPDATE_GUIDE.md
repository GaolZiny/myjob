# n8n Workflow 修改指南 - 添加实际文章链接提取

本指南说明如何在 n8n workflow 中添加 HTTP Request 节点，用于提取 RSS 链接跳转后的实际文章链接。

## 目标

- **link** 字段：保存 RSS 源的原始链接
- **article_link** 字段：保存实际文章的最终链接（跟随重定向后的 URL）

## 修改步骤

### 步骤 1：在 n8n 中打开工作流

1. 打开 n8n 界面 (http://localhost:5678)
2. 找到并打开"新闻AI分类与翻译工作流"
3. 找到节点："提取新闻字段" → "检查重复新闻"

### 步骤 2：在两者之间添加 HTTP Request 节点

在"提取新闻字段"和"检查重复新闻"之间插入新节点：

#### 2.1 添加 HTTP Request 节点

点击"提取新闻字段"节点后的 **+** 按钮，搜索并添加 **HTTP Request** 节点。

#### 2.2 配置 HTTP Request 节点

**节点名称**：`获取实际文章链接`

**基本配置**：
- **Method**: `HEAD`
- **URL**: `={{ $json.link }}`
- **Authentication**: None

**选项配置** (点击 "Add Option")：
- **Redirect**:
  - **Follow Redirect**: ✅ 启用
  - **Max Redirects**: `10`
- **Timeout**: `10000` (10秒)
- **Ignore SSL Issues**: ✅ 启用（可选，如果遇到SSL错误）

**完整配置示例**：
```json
{
  "parameters": {
    "method": "HEAD",
    "url": "={{ $json.link }}",
    "options": {
      "redirect": {
        "followRedirect": true,
        "maxRedirects": 10
      },
      "timeout": 10000,
      "allowUnauthorizedCerts": true
    }
  },
  "name": "获取实际文章链接",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2
}
```

### 步骤 3：添加 Code 节点提取最终 URL

在"获取实际文章链接"后添加 **Code** 节点。

**节点名称**：`提取最终URL`

**代码**：
```javascript
// 获取原始数据（来自"提取新闻字段"节点）
const originalData = $('提取新闻字段').item.json;

// 获取 HTTP 请求的响应头
const httpResponse = $json;

// 提取最终的 URL（跟随重定向后的地址）
const finalUrl = httpResponse.headers?.location || originalData.link;

// 返回合并后的数据
return {
  title: originalData.title,
  link: originalData.link,  // RSS 原始链接
  article_link: finalUrl,   // 实际文章链接
  pubDate: originalData.pubDate
};
```

**说明**：
- `link`：保持 RSS 源的原始链接不变
- `article_link`：使用重定向后的最终 URL
- 如果没有重定向，`article_link` 将等于 `link`

### 步骤 4：更新"检查重复新闻"节点

修改 SQL 查询，使用 `article_link` 而不是 `link` 来检查重复：

**原查询**：
```sql
SELECT CAST(COUNT(*) as integer) as count
FROM news_articles
WHERE link = '{{ $json.link }}'
```

**新查询**：
```sql
SELECT CAST(COUNT(*) as integer) as count
FROM news_articles
WHERE article_link = '{{ $json.article_link }}'
```

### 步骤 5：更新"准备INSERT语句"节点

修改 Code 节点，添加 `article_link` 字段：

找到这段代码：
```javascript
const newsItem = {
  title: originalData.title || '',
  title_zh: aiResult.title_zh || '',
  link: originalData.link || '',
  // ... 其他字段
};
```

修改为：
```javascript
const newsItem = {
  title: originalData.title || '',
  title_zh: aiResult.title_zh || '',
  link: originalData.link || '',
  article_link: originalData.article_link || originalData.link || '',
  // ... 其他字段
};
```

修改 SQL 插入语句：
```javascript
const sql = `
  INSERT INTO news_articles (
    title, title_zh, link, article_link, pub_date,
    category, summary_zh, keywords, source, image_url,
    created_at, updated_at
  ) VALUES (
    ${escapeSql(newsItem.title)},
    ${escapeSql(newsItem.title_zh)},
    ${escapeSql(newsItem.link)},
    ${escapeSql(newsItem.article_link)},
    ${newsItem.pubDate ? `'${newsItem.pubDate}'` : 'NULL'},
    ${escapeSql(newsItem.category)},
    ${escapeSql(newsItem.summary_zh)},
    ${escapeSql(newsItem.keywords)},
    ${escapeSql(newsItem.source)},
    ${escapeSql(newsItem.image_url)},
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (article_link) DO NOTHING
`;
```

注意：将 `ON CONFLICT (link)` 改为 `ON CONFLICT (article_link)`

### 步骤 6：连接节点

确保节点连接顺序为：

```
提取新闻字段
    ↓
获取实际文章链接 (HTTP Request)
    ↓
提取最终URL (Code)
    ↓
检查重复新闻 (PostgreSQL)
    ↓
合并数据
    ↓
... (后续节点)
```

### 步骤 7：测试工作流

1. 点击"Execute Workflow"按钮
2. 查看每个节点的输出
3. 确认"提取最终URL"节点输出包含：
   - `link`: RSS 原始链接
   - `article_link`: 实际文章链接
4. 确认数据库中保存了两个字段

## 备选方案：使用 JavaScript 提取

如果 HEAD 请求不返回 Location 头，可以改用 GET 请求并解析 HTML：

### 方案 A：使用 HTML Extract 节点

**HTTP Request 配置**：
- Method: `GET`
- URL: `={{ $json.link }}`

添加 **HTML Extract** 节点：
- **Extraction Values**:
  - **Key**: `canonical_url`
  - **CSS Selector**: `link[rel="canonical"]`
  - **Attribute**: `href`

### 方案 B：使用 Code 节点解析 HTML

```javascript
const cheerio = require('cheerio');
const originalData = $('提取新闻字段').item.json;
const httpResponse = $json;

// 解析 HTML
const $ = cheerio.load(httpResponse.body);

// 尝试多种方法提取真实 URL
let articleLink =
  $('link[rel="canonical"]').attr('href') ||  // Canonical URL
  $('meta[property="og:url"]').attr('content') ||  // Open Graph URL
  httpResponse.headers?.location ||  // 重定向 URL
  originalData.link;  // 回退到原始链接

return {
  title: originalData.title,
  link: originalData.link,
  article_link: articleLink,
  pubDate: originalData.pubDate
};
```

## 常见问题

### 1. HTTP Request 超时

**问题**：某些网站响应很慢

**解决方案**：
- 增加 Timeout 到 30000 (30秒)
- 或者添加错误处理，超时时使用原始链接

### 2. 重定向循环

**问题**：Max Redirects 错误

**解决方案**：
- 减少 Max Redirects 到 5
- 添加错误处理节点

### 3. SSL 证书错误

**问题**：`unable to verify the first certificate`

**解决方案**：
- 启用 "Allow Unauthorized Certs" 选项

### 4. 部分链接无法访问

**问题**：某些 RSS 链接返回 403/404

**解决方案**：
添加 **IF** 节点，根据 HTTP 状态码判断：
- 200-299: 使用最终 URL
- 其他: 使用原始链接

## 性能优化

### 1. 批量处理

如果每小时有大量新闻，HTTP Request 会很慢。可以：
- 减少 RSS 拉取频率
- 使用并行处理（n8n 默认支持）

### 2. 缓存机制

在数据库中添加缓存表，避免重复访问相同的 RSS 链接。

### 3. 异步处理

将 HTTP Request 设置为异步，不阻塞主流程。

## 完整节点流程图

```
定时触发器
    ↓
读取RSS新闻源
    ↓
提取新闻字段 (title, link, pubDate)
    ↓
获取实际文章链接 (HTTP Request - HEAD)
    ↓
提取最终URL (Code - 提取 article_link)
    ↓
检查重复新闻 (PostgreSQL - WHERE article_link = ?)
    ↓
合并数据 (Merge)
    ↓
过滤新文章 (IF - count = 0)
    ↓
Gemini AI分类和翻译
    ↓
格式化数据 (Code)
    ↓
准备INSERT语句 (Code - 包含 link 和 article_link)
    ↓
保存到PostgreSQL
```

## 总结

完成以上修改后，你的 workflow 将：
- ✅ 保存 RSS 原始链接到 `link` 字段
- ✅ 自动提取并保存实际文章链接到 `article_link` 字段
- ✅ 使用 `article_link` 进行去重判断
- ✅ 所有字段都会同步到微信云数据库
- ✅ 小程序用户点击时跳转到实际文章页面

如有问题，请查看 n8n 官方文档：https://docs.n8n.io/

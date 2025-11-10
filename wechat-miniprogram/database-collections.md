# 微信云数据库集合设计

## 集合：news

**说明**：存储从API同步的新闻数据

### 字段结构

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| _id | String | 是 | 云数据库自动生成的唯一ID | 主键 |
| id | Number | 否 | API返回的新闻ID | - |
| title | String | 是 | 英文原标题 | - |
| title_zh | String | 是 | 中文翻译标题 | 全文索引 |
| link | String | 是 | RSS源链接 | - |
| article_link | String | 是 | 实际文章链接（唯一） | **唯一索引** |
| summary_zh | String | 否 | 中文摘要 | - |
| category | String | 是 | 分类（科技/财经/政治/体育/娱乐/健康/社会/其他） | **普通索引** |
| keywords | String | 否 | 关键词（逗号分隔） | - |
| source | String | 否 | 来源（如BBC News） | **普通索引** |
| image_url | String | 否 | 图片URL | - |
| pub_date | Date | 否 | 原始发布时间 | **普通索引** |
| created_at | Date | 是 | 创建时间（API返回的创建时间戳） | **普通索引** |

### 索引设置（重要！）

在微信云开发控制台 → 云数据库 → news集合 → 索引管理中创建以下索引：

#### 1. link（唯一索引）
- **字段**：link
- **类型**：唯一索引
- **升序/降序**：升序
- **作用**：防止重复新闻，加快去重查询（主要去重依据）

#### 2. category（普通索引）
- **字段**：category
- **类型**：普通索引
- **升序/降序**：升序
- **作用**：加快分类查询速度

#### 3. created_at（普通索引）
- **字段**：created_at
- **类型**：普通索引
- **升序/降序**：降序
- **作用**：加快时间排序查询

#### 4. source（普通索引）
- **字段**：source
- **类型**：普通索引
- **升序/降序**：升序
- **作用**：加快按来源筛选

#### 5. pub_date（普通索引）
- **字段**：pub_date
- **类型**：普通索引
- **升序/降序**：降序
- **作用**：按发布时间排序

### 数据库权限设置

在微信云开发控制台 → 云数据库 → news集合 → 权限设置：

```json
{
  "read": true,
  "write": false
}
```

**说明**：
- `read: true` - 允许小程序端直接读取数据
- `write: false` - 禁止小程序端写入，只能通过云函数写入（更安全）

### 示例数据

```json
{
  "_id": "cloud-db-generated-id",
  "id": 123,
  "title": "AI Breakthrough in 2025",
  "title_zh": "2025年人工智能取得重大突破",
  "link": "http://feeds.bbci.co.uk/news/rss.xml?id=xyz123",
  "article_link": "https://www.bbc.com/news/articles/xyz123",
  "summary_zh": "人工智能在2025年取得了重大突破，新的算法使得机器学习效率提升了10倍...",
  "category": "科技",
  "keywords": "AI,technology,breakthrough",
  "source": "BBC News",
  "image_url": "https://example.com/image.jpg",
  "pub_date": "2025-11-10T10:00:00.000Z",
  "created_at": "2025-11-10T11:05:00.000Z"
}
```

## 性能优化建议

### 1. 数据库限制
- 云数据库免费版：2GB存储
- 建议定期清理30天以前的旧数据

### 2. 查询优化
- 使用索引字段进行查询
- 避免全表扫描
- 使用分页加载（limit + skip）

### 3. 定期清理（可选）

创建另一个云函数 `cleanOldNews`，每天执行一次：

```javascript
// 删除30天前的旧新闻
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
await db.collection('news')
  .where({
    created_at: _.lt(thirtyDaysAgo)
  })
  .remove();
```

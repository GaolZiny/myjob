# n8n工作流故障排查指南

## 问题：PostgreSQL保存时id字段为0

### 症状
在n8n UI的"保存到PostgreSQL"节点中，"Values to Send"显示`id: 0`

### 原因
PostgreSQL表的`id`字段定义为`BIGSERIAL PRIMARY KEY`，应该由数据库自动生成递增ID。如果在INSERT语句中显式指定`id = 0`，会导致错误或覆盖自动生成的值。

### 解决方案

#### 1. 检查PostgreSQL节点配置

在n8n中打开"保存到PostgreSQL"节点，确认：

**正确配置**：
- Operation: `Insert`
- Schema: `public`
- Table: `news_articles`
- Columns: **只包含以下9个字段，不包含id**
  - `title` → `={{ $json.title }}`
  - `description` → `={{ $json.description }}`
  - `link` → `={{ $json.link }}`
  - `pub_date` → `={{ $json.pubDate }}`
  - `category` → `={{ $json.category }}`
  - `summary` → `={{ $json.summary }}`
  - `summary_zh` → `={{ $json.summary_zh }}`
  - `keywords` → `={{ $json.keywords }}`
  - `source` → `={{ $json.source }}`

**不要包含的字段**：
- ❌ `id` - 数据库会自动生成
- ❌ `count` - 这是检查重复用的临时字段
- ❌ `created_at` / `updated_at` - 数据库DEFAULT值会自动填充

#### 2. 如果看到id字段

如果在"Columns"配置中看到`id`字段：
1. 点击该字段旁边的删除按钮（垃圾桶图标）
2. 保存节点配置
3. 重新执行工作流

#### 3. 不要使用Auto-map

在PostgreSQL节点的"Columns"设置中：
- ❌ 不要点击"Add All Fields"
- ❌ 不要使用"Auto Map Input Data to Columns"
- ✅ 使用"Add Field"手动添加上面列出的9个字段

#### 4. 验证数据库中的ID

执行工作流后，检查数据库：

```sql
SELECT id, title, created_at
FROM news_articles
ORDER BY id DESC
LIMIT 10;
```

正确的结果应该是：
- `id`字段是递增的整数（1, 2, 3, ...）
- 不应该有id为0的记录

#### 5. 如果数据库中已有id=0的记录

清理错误数据：

```sql
-- 删除id为0的记录
DELETE FROM news_articles WHERE id = 0;

-- 重置序列（如果需要）
SELECT setval('news_articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM news_articles));
```

### 技术说明

**数据流程**：
```
格式化数据 (输出9个字段，不包含id)
    ↓
保存到PostgreSQL (INSERT时不指定id)
    ↓
PostgreSQL自动生成id (从序列 news_articles_id_seq)
```

**BIGSERIAL原理**：
```sql
CREATE TABLE news_articles (
    id BIGSERIAL PRIMARY KEY,  -- 等同于：
    -- id BIGINT NOT NULL DEFAULT nextval('news_articles_id_seq'),
    -- PRIMARY KEY (id)
    ...
);
```

### 相关节点检查清单

- [ ] "提取新闻字段" - 输出: title, description, link, pubDate
- [ ] "检查重复新闻" - 输出: count (单个字段)
- [ ] "合并数据" - 输出: title, description, link, pubDate, count
- [ ] "过滤新文章" - 输出: 同上（过滤count=0的）
- [ ] "Gemini AI分类和翻译" - 输出: output (LLM响应文本)
- [ ] "格式化数据" - 输出: 9个字段 (title, description, link, pubDate, category, summary, summary_zh, keywords, source)
- [ ] "保存到PostgreSQL" - INSERT: 9个字段 (不包含id)

### 如果问题仍然存在

1. 导出当前workflow为JSON
2. 检查"保存到PostgreSQL"节点的配置
3. 确认`columns.value`中没有`id`字段
4. 重新导入workflow

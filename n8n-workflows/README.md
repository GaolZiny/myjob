# n8n 新闻AI分类与翻译工作流

这是一个专为**微信小程序云服务**设计的自动化新闻处理工作流，可以从国外新闻源拉取英文新闻，通过Google Gemini AI进行分类、标题翻译和摘要生成，然后保存到PostgreSQL数据库供小程序调用。

## 功能特性

- **自动拉取新闻**：每2小时自动从RSS源拉取最新英文新闻
- **AI智能分类**：使用Google Gemini 2.5模型对新闻进行智能分类（科技、财经、政治、体育、娱乐、健康、社会等）
- **中文标题翻译**：自动将英文标题翻译成中文
- **中文摘要生成**：AI生成简洁的中文摘要
- **关键词提取**：提取3-5个英文关键词便于检索
- **去重处理**：使用ON CONFLICT自动跳过重复新闻
- **PostgreSQL存储**：极简数据库设计（仅1个表）
- **简化API**：提供简洁的REST API供微信小程序调用

## 技术栈

- **n8n**：工作流自动化平台
- **Google Gemini 2.5 Flash**：最新AI模型（免费配额丰富）
- **PostgreSQL 12+**：关系型数据库
- **Node.js + Express**：API服务
- **RSS Feed**：新闻源（BBC、CNN、TechCrunch等）

## 工作流节点说明

### 1. 定时触发器 (Schedule Trigger)
- 每2小时自动触发一次工作流
- 可根据需求调整触发频率

### 2. 读取RSS新闻源 (RSS Feed Reader)
- 默认使用BBC新闻RSS源: `http://feeds.bbci.co.uk/news/rss.xml`
- 可配置多个英文新闻源（直接在workflow中添加节点）

### 3. 提取新闻字段 (Extract Fields)
- 提取标题、链接、发布日期等关键信息
- **注意**：不再提取description字段

### 4. 检查重复新闻 (Check Duplicate)
- 查询PostgreSQL数据库判断链接是否已存在
- 返回count值（0或1）

### 5. 合并数据 (Merge)
- 使用Merge节点按位置合并原始数据和count结果
- 保证多条新闻正确配对

### 6. 过滤新文章 (Filter New Articles)
- 只处理count=0的新文章

### 7. Gemini AI分类和翻译
- **Basic LLM Chain节点** + **Google Gemini Chat Model子节点**
- 使用 `gemini-2.5-flash` 模型
- 返回JSON格式数据：
  - `category`: 新闻分类（中文：科技/财经/政治/体育/娱乐/健康/社会/其他）
  - `title_zh`: 中文翻译的标题
  - `summary_zh`: 中文摘要
  - `keywords`: 英文关键词数组

### 8. 格式化数据 (Format Data)
- 解析Gemini的JSON响应
- 合并原始数据（title, link, pubDate）和AI结果
- 设置source字段（如'BBC News'）

### 9. 准备INSERT语句 (Prepare INSERT Query)
- 使用Code节点安全转义SQL字符串
- 构建带 `ON CONFLICT (link) DO NOTHING` 的INSERT语句
- 防止SQL注入和重复key错误

### 10. 保存到PostgreSQL (Save to Database)
- 执行INSERT语句
- 重复新闻自动跳过

## 新闻分类标准

| 分类 | 说明 |
|------|------|
| 科技 | 科技、互联网、AI、数码产品等 |
| 财经 | 金融、经济、股市、企业等 |
| 政治 | 政府、政策、国际关系等 |
| 体育 | 体育赛事、运动员等 |
| 娱乐 | 影视、音乐、明星等 |
| 健康 | 医疗、养生、疾病等 |
| 社会 | 民生、社会事件等 |
| 其他 | 无法归类的内容 |

**注意**：分类在Gemini提示词中定义，不需要数据库表管理。

## 项目文件

```
n8n-workflows/
├── news-ai-classification-workflow.json  # n8n工作流配置文件
├── database-schema.sql                   # PostgreSQL数据库架构
├── server.js                             # Express API服务器（主程序）
├── package.json                          # Node.js依赖和脚本
├── .env.example                          # 环境变量模板
├── Dockerfile                            # Docker镜像配置
├── .dockerignore                         # Docker忽略文件
├── .gitignore                            # Git忽略文件
├── README.md                             # 项目文档（本文件）
├── QUICKSTART.md                         # 快速开始指南
└── TROUBLESHOOTING.md                    # 故障排查指南
```

**核心文件说明**：
- **server.js** - 完整的REST API服务器，提供新闻数据接口
- **news-ai-classification-workflow.json** - n8n工作流，自动拉取、分类、翻译新闻
- **database-schema.sql** - 数据库表结构（仅1个表：news_articles）

## 快速开始

详细安装步骤请参考 [QUICKSTART.md](./QUICKSTART.md)

### 前提条件

1. **n8n** - 工作流自动化平台
2. **PostgreSQL 12+** - 数据库
3. **Google Gemini API Key** - AI服务（免费）
4. **Node.js 18+** 或 **Docker** - API服务

## 使用Docker镜像快速部署 🐳

**推荐方式**：直接拉取GitHub自动构建的Docker镜像，无需手动编译！

### 1. 拉取镜像

```bash
docker pull ghcr.io/gaolziny/myjob/news-api:latest
```

### 2. 运行容器

```bash
docker run -d \
  --name news-api \
  -p 3000:3000 \
  -e DB_HOST=your_db_host \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=news_db \
  ghcr.io/gaolziny/myjob/news-api:latest
```

### 3. 验证运行

```bash
# 检查容器状态
docker ps

# 测试API
curl http://localhost:3000/health
curl http://localhost:3000/api/news/latest
```

### 4. 查看日志

```bash
docker logs -f news-api
```

### Docker Compose 部署（推荐）

使用Docker Compose一键部署完整环境（PostgreSQL + API）：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: news-postgres
    environment:
      POSTGRES_DB: news_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/gaolziny/myjob/news-api:latest
    container_name: news-api
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: your_password
      DB_NAME: news_db
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

保存为 `docker-compose.yml`，然后运行：

```bash
docker-compose up -d
```

### 镜像标签说明

- `latest` - 最新稳定版本（推荐）
- `main` / `master` - 主分支最新构建
- `v1.0.0` - 特定版本号

查看所有可用标签：https://github.com/GaolZiny/myjob/pkgs/container/myjob%2Fnews-api

## 从源码安装

如果你需要修改代码或自定义功能：

### 快速安装

```bash
# 1. 安装n8n
npm install n8n -g

# 2. 创建PostgreSQL数据库
psql -U postgres
CREATE DATABASE news_db;
\c news_db
\i database-schema.sql

# 3. 启动n8n并导入工作流
n8n start
# 访问 http://localhost:5678
# 导入 news-ai-classification-workflow.json

# 4. 启动API服务
cd n8n-workflows
npm install
cp .env.example .env
# 编辑 .env 填入配置
npm start
```

## 数据库架构

**极简设计** - 只有1个表！

### news_articles 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键（自动递增） |
| title | VARCHAR(500) | 英文原标题 |
| title_zh | VARCHAR(500) | AI翻译的中文标题 |
| link | VARCHAR(1000) | 新闻链接（UNIQUE） |
| pub_date | TIMESTAMP | 发布时间 |
| category | VARCHAR(50) | 分类（中文） |
| summary_zh | TEXT | 中文摘要 |
| keywords | VARCHAR(500) | 关键词（逗号分隔） |
| source | VARCHAR(200) | 来源（在workflow中设置） |
| image_url | VARCHAR(1000) | 图片URL |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引**：
- `idx_news_category` - 分类查询
- `idx_news_source` - 来源查询
- `idx_news_pub_date` - 发布时间排序
- `idx_news_created_at` - 创建时间排序
- `idx_news_fulltext` - 全文搜索（GIN索引）

**删除的表**：
- ~~news_categories~~ - 分类固定，在代码中管理
- ~~rss_sources~~ - RSS源在workflow中管理，不需要数据库

## 如何添加新的RSS源

**直接在n8n workflow中操作**，无需修改数据库：

1. 复制现有的"读取RSS新闻源"节点
2. 修改URL为新的RSS源（如TechCrunch）
3. 在"格式化数据"节点中设置对应的source名称

示例：
```javascript
// 格式化数据节点
const newsItem = {
  // ... 其他字段
  source: 'TechCrunch'  // 修改这里即可
};
```

**推荐RSS源**：
- BBC News: `http://feeds.bbci.co.uk/news/rss.xml`
- CNN: `http://rss.cnn.com/rss/edition.rss`
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`
- Reuters: `https://www.reutersagency.com/feed/`

## API接口

### 1. 获取最新新闻

```http
GET /api/news/latest?page=1&pageSize=20&category=科技
```

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "AI Breakthrough in 2025",
      "title_zh": "2025年人工智能取得重大突破",
      "summary_zh": "人工智能在2025年取得重大突破...",
      "category": "科技",
      "keywords": "AI,technology,breakthrough",
      "source": "BBC News",
      "link": "https://...",
      "pub_date": "2025-11-07T10:00:00Z",
      "created_at": "2025-11-07T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. 搜索新闻

```http
GET /api/news/search?keyword=AI&page=1&pageSize=20
```

全文搜索支持：英文标题、中文标题、中文摘要

### 3. 获取新闻详情

```http
GET /api/news/:id
```

### 4. 获取分类列表

```http
GET /api/categories
```

响应：
```json
{
  "success": true,
  "data": [
    { "category": "科技", "article_count": 150 },
    { "category": "财经", "article_count": 120 },
    { "category": "政治", "article_count": 80 }
  ]
}
```

### 5. 获取来源列表

```http
GET /api/sources
```

响应：
```json
{
  "success": true,
  "data": [
    {
      "source": "BBC News",
      "article_count": 200,
      "latest_article_at": "2025-11-09T12:00:00Z"
    },
    {
      "source": "TechCrunch",
      "article_count": 150,
      "latest_article_at": "2025-11-09T11:30:00Z"
    }
  ]
}
```

### 6. 获取统计数据

```http
GET /api/statistics
```

响应：
```json
{
  "success": true,
  "data": {
    "total_articles": 500,
    "today_articles": 50,
    "total_categories": 8,
    "total_sources": 5
  }
}
```

## 微信小程序集成

### 在小程序中调用API

```javascript
// pages/news/news.js
Page({
  data: {
    newsList: [],
    page: 1,
    category: '科技'
  },

  onLoad() {
    this.fetchNews();
  },

  fetchNews() {
    wx.request({
      url: 'https://your-api-domain.com/api/news/latest',
      data: {
        page: this.data.page,
        pageSize: 20,
        category: this.data.category
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({
            newsList: res.data.data
          });
        }
      }
    });
  },

  onCategoryChange(e) {
    this.setData({
      category: e.detail.value,
      page: 1
    });
    this.fetchNews();
  }
});
```

### 小程序WXML示例

```xml
<view class="news-container">
  <view class="category-tabs">
    <view wx:for="{{['科技','财经','政治','体育','娱乐','健康','社会']}}"
          wx:key="*this"
          class="tab {{category === item ? 'active' : ''}}"
          bindtap="onCategoryChange"
          data-category="{{item}}">
      {{item}}
    </view>
  </view>

  <view class="news-list">
    <block wx:for="{{newsList}}" wx:key="id">
      <view class="news-item" bindtap="onNewsClick" data-id="{{item.id}}">
        <image class="news-image" src="{{item.image_url}}" mode="aspectFill"></image>
        <view class="news-content">
          <view class="news-title-zh">{{item.title_zh}}</view>
          <view class="news-summary">{{item.summary_zh}}</view>
          <view class="news-meta">
            <text class="category">{{item.category}}</text>
            <text class="source">{{item.source}}</text>
            <text class="time">{{item.pub_date}}</text>
          </view>
        </view>
      </view>
    </block>
  </view>
</view>
```

## Google Gemini API

### 获取API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 登录Google账号
3. 点击 "Create API Key"
4. 复制API密钥并在n8n中配置

### 优势

- **免费配额丰富**：每分钟15次请求，每天1500次
- **最新模型**：Gemini 2.5 Flash（2025年最新版）
- **多语言支持**：原生支持翻译
- **高质量输出**：与GPT-4相当
- **低延迟**：响应速度快

### 成本

- 完全免费（有配额限制）
- 如需更高配额，可升级到付费计划

## 配置建议

### n8n配置

在n8n中配置凭证：

1. **PostgreSQL凭证**
   - Host: localhost（或远程地址）
   - Port: 5432
   - Database: news_db
   - User: postgres
   - Password: your_password

2. **Google Gemini API凭证**
   - 凭证类型：Google PaLM API
   - API Key: 从Google AI Studio获取

### workflow中的source管理

在"格式化数据"Code节点中设置source：

```javascript
const newsItem = {
  title: originalData.title || '',
  title_zh: aiResult.title_zh || '',
  link: originalData.link || '',
  pubDate: originalData.pubDate || new Date().toISOString(),
  category: aiResult.category || '其他',
  summary_zh: aiResult.summary_zh || '',
  keywords: Array.isArray(aiResult.keywords) ? aiResult.keywords.join(',') : '',
  source: 'BBC News'  // 在这里修改source名称
};
```

## 部署建议

### 1. 使用Docker部署（完整环境）

使用官方镜像一键部署 PostgreSQL + n8n + API 完整环境：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: news-postgres
    environment:
      POSTGRES_DB: news_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  n8n:
    image: n8nio/n8n:latest
    container_name: news-n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_n8n_password
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  api:
    image: ghcr.io/gaolziny/myjob/news-api:latest
    container_name: news-api
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: your_password
      DB_NAME: news_db
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
  n8n_data:
```

启动命令：

```bash
# 启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

访问服务：
- **n8n界面**：http://localhost:5678 (用户名: admin, 密码: your_n8n_password)
- **API服务**：http://localhost:3000
- **健康检查**：http://localhost:3000/health

### 2. 从源码构建（开发环境）

如果需要修改代码：

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./n8n-workflows
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=news_db
      - DB_USER=postgres
      - DB_PASSWORD=your_password
    depends_on:
      - postgres
```

### 3. 云服务部署

推荐使用：
- **数据库**：腾讯云PostgreSQL、阿里云RDS
- **服务器**：腾讯云CVM、阿里云ECS
- **容器**：腾讯云TKE、阿里云ACK

**使用Docker镜像部署到云服务器**：

```bash
# 在云服务器上拉取镜像
docker pull ghcr.io/gaolziny/myjob/news-api:latest

# 运行容器（连接云数据库）
docker run -d \
  --name news-api \
  -p 3000:3000 \
  -e DB_HOST=your-rds-host.aliyuncs.com \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=news_db \
  --restart unless-stopped \
  ghcr.io/gaolziny/myjob/news-api:latest
```

### 4. 微信小程序云开发

可以将API部署到微信云开发的云函数中。

## 性能优化

1. **数据库索引**：已创建必要的索引
2. **定期清理**：定期删除30天前的旧新闻
   ```sql
   DELETE FROM news_articles WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
   ```
3. **缓存策略**：可以添加Redis缓存热门新闻
4. **CDN加速**：图片等静态资源使用CDN

## 故障排除

详细的故障排除指南请参考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 常见问题

1. **Gemini API调用失败**
   - 检查API Key是否正确
   - 检查网络连接（可能需要代理）
   - 检查配额是否用完
   - 确认使用正确的节点类型（Basic LLM Chain + Gemini Chat Model）

2. **PostgreSQL连接失败**
   - 验证数据库凭证
   - 检查PostgreSQL服务是否运行
   - 检查防火墙设置

3. **RSS源无法访问**
   - 更换RSS源地址
   - 配置代理
   - 检查网络连接

4. **多条新闻变成1条**
   - 检查Merge节点配置（使用Combine by Position）
   - 不要使用Code节点引用之前的数据

5. **重复key错误**
   - 已使用ON CONFLICT处理，不应出现
   - 检查"准备INSERT语句"节点是否正确

## 扩展功能

### 1. 添加图片处理
在工作流中添加节点下载新闻图片并上传到OSS

### 2. 添加推送通知
重要新闻推送到微信小程序订阅消息

### 3. 多RSS源并行处理
复制workflow节点，同时抓取多个RSS源

### 4. 多语言支持
修改Gemini提示词，支持翻译成其他语言（日语、韩语等）

### 5. 情感分析
在Gemini提示词中添加情感分析要求

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题，请提交Issue。

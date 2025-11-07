# n8n 新闻AI分类与翻译工作流

这是一个专为**微信小程序云服务**设计的自动化新闻处理工作流，可以从国外新闻源拉取英文新闻，通过Google Gemini AI进行分类和翻译成中文，然后保存到PostgreSQL数据库供小程序调用。

## 功能特性

- **自动拉取新闻**：每2小时自动从RSS源拉取最新英文新闻
- **AI智能分类**：使用Google Gemini模型对新闻进行智能分类（科技、财经、政治、体育、娱乐、健康、社会等）
- **中文翻译**：自动将英文摘要翻译成中文，适合中国用户阅读
- **关键词提取**：提取3-5个英文关键词便于检索
- **去重处理**：自动检查并避免重复保存相同新闻
- **PostgreSQL存储**：使用PostgreSQL数据库，性能优异
- **简化API**：提供简洁的REST API供微信小程序调用

## 技术栈

- **n8n**：工作流自动化平台
- **Google Gemini Pro**：AI模型（免费配额丰富）
- **PostgreSQL**：关系型数据库
- **Node.js + Express**：API服务
- **RSS Feed**：新闻源（BBC、CNN、TechCrunch等）

## 工作流节点说明

### 1. 定时触发器 (Schedule Trigger)
- 每2小时自动触发一次工作流
- 可根据需求调整触发频率

### 2. 读取RSS新闻源 (RSS Feed Reader)
- 默认使用BBC新闻RSS源
- 可配置多个英文新闻源：
  - BBC News: `http://feeds.bbci.co.uk/news/rss.xml`
  - CNN: `http://rss.cnn.com/rss/edition.rss`
  - TechCrunch: `https://techcrunch.com/feed/`
  - The Verge: `https://www.theverge.com/rss/index.xml`
  - Reuters: `https://www.reutersagency.com/feed/`

### 3. 提取新闻字段 (Extract Fields)
- 提取标题、描述、链接、发布日期等关键信息

### 4. 检查重复新闻 (Check Duplicate)
- 查询PostgreSQL数据库判断新闻是否已存在
- 避免重复处理相同内容

### 5. 过滤新文章 (Filter New Articles)
- 只处理不重复的新文章

### 6. Gemini AI分类和翻译 (Gemini Classification)
- 使用Google Gemini Pro模型进行智能分析
- 返回JSON格式数据：
  - `category`: 新闻分类（中文）
  - `summary`: 英文摘要
  - `summary_zh`: 中文翻译摘要
  - `keywords`: 英文关键词数组

### 7. 格式化数据 (Format Data)
- 将Gemini返回结果与原始数据合并
- 添加时间戳等元数据

### 8. 保存到PostgreSQL (Save to Database)
- 将处理后的数据保存到数据库
- 供微信小程序API调用

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

## 快速开始

详细安装步骤请参考 [QUICKSTART.md](./QUICKSTART.md)

### 前提条件

1. **n8n** - 工作流自动化平台
2. **PostgreSQL 12+** - 数据库
3. **Google Gemini API Key** - AI服务（免费）
4. **Node.js 18+** - API服务

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

简化的数据库设计，专注于新闻数据：

### 主表

1. **news_articles** - 新闻文章表
   - 包含标题、描述、链接、分类、摘要（英文和中文）、关键词等

2. **news_categories** - 分类定义表
   - 8个预定义分类及其描述

3. **rss_sources** - RSS源配置表
   - 管理多个新闻源

### 视图

- **latest_news** - 最新新闻（自动返回中文摘要）
- **category_stats** - 分类统计

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
      "summary": "人工智能在2025年取得重大突破...",
      "category": "科技",
      "link": "https://...",
      "pub_date": "2025-11-07T10:00:00Z"
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

### 3. 获取新闻详情

```http
GET /api/news/:id
```

### 4. 获取分类列表

```http
GET /api/categories
```

### 5. 获取统计数据

```http
GET /api/statistics
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
    <block wx:for="{{categories}}" wx:key="name">
      <view class="tab {{category === item.name ? 'active' : ''}}"
            bindtap="onCategoryChange"
            data-category="{{item.name}}">
        {{item.icon}} {{item.name}}
      </view>
    </block>
  </view>

  <view class="news-list">
    <block wx:for="{{newsList}}" wx:key="id">
      <view class="news-item" bindtap="onNewsClick" data-id="{{item.id}}">
        <image class="news-image" src="{{item.image_url}}" mode="aspectFill"></image>
        <view class="news-content">
          <view class="news-title">{{item.title}}</view>
          <view class="news-summary">{{item.summary}}</view>
          <view class="news-meta">
            <text class="category">{{item.category}}</text>
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

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录Google账号
3. 点击 "Get API Key"
4. 复制API密钥

### 优势

- **免费配额丰富**：每分钟60次请求
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

2. **Gemini API凭证**
   - 在HTTP Request节点中配置API Key
   - 或使用n8n的Google PaLM凭证

### RSS源推荐

英文新闻源（自动翻译成中文）：
- BBC News（综合）
- CNN（综合）
- TechCrunch（科技）
- The Verge（科技）
- Reuters（财经）
- ESPN（体育）
- Variety（娱乐）

## 部署建议

### 1. 使用Docker部署

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: news_db
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=news_db
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=your_password
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=news_db
      - DB_USER=postgres
      - DB_PASSWORD=your_password
      - GEMINI_API_KEY=your_gemini_key
    depends_on:
      - postgres

volumes:
  postgres_data:
  n8n_data:
```

### 2. 云服务部署

推荐使用：
- **数据库**：腾讯云PostgreSQL、阿里云RDS
- **服务器**：腾讯云CVM、阿里云ECS
- **容器**：腾讯云TKE、阿里云ACK

### 3. 微信小程序云开发

可以将API部署到微信云开发的云函数中。

## 性能优化

1. **数据库索引**：已创建必要的索引
2. **定期清理**：定期删除30天前的旧新闻
3. **缓存策略**：可以添加Redis缓存热门新闻
4. **CDN加速**：图片等静态资源使用CDN

## 故障排除

### 常见问题

1. **Gemini API调用失败**
   - 检查API Key是否正确
   - 检查网络连接（可能需要代理）
   - 检查配额是否用完

2. **PostgreSQL连接失败**
   - 验证数据库凭证
   - 检查PostgreSQL服务是否运行
   - 检查防火墙设置

3. **RSS源无法访问**
   - 更换RSS源地址
   - 配置代理
   - 检查网络连接

4. **翻译质量不佳**
   - 调整Gemini的temperature参数
   - 优化提示词
   - 增加上下文长度

## 扩展功能

### 1. 添加图片处理
在工作流中添加节点下载新闻图片并上传到OSS

### 2. 添加推送通知
重要新闻推送到微信小程序订阅消息

### 3. 添加用户偏好
根据用户阅读历史推荐相关新闻

### 4. 多语言支持
支持翻译成其他语言（日语、韩语等）

### 5. 情感分析
分析新闻情感（正面/负面/中性）

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题，请提交Issue。

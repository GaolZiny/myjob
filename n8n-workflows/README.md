# n8n 新闻AI分类与总结工作流

这是一个自动化的新闻处理工作流，可以从网上拉取新闻，通过AI模型进行分类和总结，然后保存到数据库供应用使用。

## 功能特性

- **自动拉取新闻**：每2小时自动从RSS源拉取最新新闻
- **AI智能分类**：使用OpenAI GPT-4模型对新闻进行智能分类（科技、财经、政治、体育、娱乐、健康、社会等）
- **内容总结**：自动生成100字以内的新闻摘要
- **关键词提取**：提取3-5个关键词便于检索
- **去重处理**：自动检查并避免重复保存相同新闻
- **数据持久化**：保存到MySQL数据库，便于应用调用

## 工作流节点说明

### 1. 定时触发器 (Schedule Trigger)
- 每2小时自动触发一次工作流
- 可根据需求调整触发频率

### 2. 读取RSS新闻源 (RSS Feed Reader)
- 默认使用Google新闻RSS源
- 可配置其他新闻源：
  - 新浪新闻：`https://news.sina.com.cn/rss/`
  - 腾讯新闻：`https://news.qq.com/rss_newsgn.xml`
  - 网易新闻：`http://news.163.com/rss/`
  - BBC中文：`https://feeds.bbci.co.uk/zhongwen/simp/rss.xml`

### 3. 提取新闻字段 (Extract Fields)
- 提取标题、描述、链接、发布日期等关键信息

### 4. 检查重复新闻 (Check Duplicate)
- 查询数据库判断新闻是否已存在
- 避免重复处理相同内容

### 5. AI分类和总结 (OpenAI Classification)
- 使用GPT-4模型进行智能分析
- 返回JSON格式数据：
  - `category`: 新闻分类
  - `summary`: 内容摘要
  - `keywords`: 关键词数组

### 6. 格式化数据 (Format Data)
- 将AI返回结果与原始数据合并
- 添加时间戳等元数据

### 7. 保存到MySQL数据库 (Save to Database)
- 将处理后的数据保存到数据库
- 可切换为PostgreSQL、MongoDB等其他数据库

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

## 安装和配置

### 前提条件

1. **n8n 安装**
   ```bash
   # 使用npm安装
   npm install n8n -g

   # 或使用Docker
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```

2. **MySQL 数据库**
   - 创建数据库和表（参见 `database-schema.sql`）

3. **OpenAI API Key**
   - 获取API密钥：https://platform.openai.com/api-keys
   - 或使用其他兼容的AI服务（如Azure OpenAI、通义千问等）

### 配置步骤

1. **导入工作流**
   - 打开n8n界面（默认：http://localhost:5678）
   - 点击 "Import from File"
   - 选择 `news-ai-classification-workflow.json`

2. **配置数据库凭证**
   - 点击 "保存到MySQL数据库" 节点
   - 添加MySQL凭证：
     - Host: 数据库地址
     - Database: 数据库名称
     - User: 用户名
     - Password: 密码

3. **配置OpenAI凭证**
   - 点击 "AI分类和总结" 节点
   - 添加OpenAI API凭证：
     - API Key: 你的OpenAI API密钥

4. **自定义配置（可选）**
   - 修改RSS源地址
   - 调整触发频率
   - 修改AI提示词
   - 更改分类标准

5. **激活工作流**
   - 点击右上角 "Active" 开关
   - 工作流将按计划自动运行

## 测试工作流

### 手动测试
1. 点击 "Execute Workflow" 按钮
2. 查看每个节点的执行结果
3. 检查数据库是否成功保存数据

### 查看执行历史
- 点击 "Executions" 查看所有执行记录
- 检查是否有错误或失败的执行

## API使用

工作流保存的数据可以通过应用程序访问：

```sql
-- 查询最新新闻
SELECT * FROM news_articles
ORDER BY created_at DESC
LIMIT 10;

-- 按分类查询
SELECT * FROM news_articles
WHERE category = '科技'
ORDER BY created_at DESC;

-- 关键词搜索
SELECT * FROM news_articles
WHERE keywords LIKE '%AI%'
ORDER BY created_at DESC;
```

## 扩展建议

### 1. 添加更多新闻源
可以添加多个RSS Feed Reader节点，合并多个新闻源的内容。

### 2. 添加情感分析
在AI节点中添加情感分析（正面/负面/中性）。

### 3. 添加图片处理
如果新闻包含图片，可以下载并保存图片URL。

### 4. 添加通知功能
- 发送邮件通知重要新闻
- 推送到Slack/钉钉/企业微信
- 发送到Telegram Bot

### 5. 添加API接口
使用Webhook节点创建API端点，供App实时查询新闻。

### 6. 添加缓存层
使用Redis缓存热门新闻，提高查询性能。

### 7. 多语言支持
配置AI模型处理多种语言的新闻。

## 故障排除

### 常见问题

1. **RSS源无法访问**
   - 检查网络连接
   - 尝试更换RSS源地址
   - 添加代理配置

2. **OpenAI API调用失败**
   - 检查API密钥是否正确
   - 确认账户余额充足
   - 检查API速率限制

3. **数据库连接失败**
   - 验证数据库凭证
   - 检查数据库服务是否运行
   - 确认网络连接

4. **重复数据**
   - 检查去重逻辑是否正确
   - 确认数据库索引已创建

## 性能优化

1. **批量处理**：可以修改工作流，批量处理多条新闻后再统一保存

2. **异步处理**：对于大量新闻，可以使用队列节点异步处理

3. **缓存优化**：缓存已处理的新闻链接，避免重复查询

4. **API限流**：添加延迟节点，避免触发API速率限制

## 成本估算

### OpenAI API成本
- 使用 GPT-4o-mini 模型
- 每条新闻约 500 tokens
- 成本约 $0.0003 per 新闻

假设每2小时拉取50条新闻：
- 每天处理：600条新闻
- 月度成本：约 $5-10

### 优化建议
- 使用更便宜的模型（如GPT-3.5-turbo）
- 仅对新增新闻进行处理
- 使用国产AI模型（通义千问、文心一言等）

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题，请提交Issue或联系维护者。

-- ==========================================
-- 新闻AI分类系统数据库架构
-- ==========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS news_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE news_db;

-- ==========================================
-- 主表：新闻文章表
-- ==========================================
CREATE TABLE IF NOT EXISTS news_articles (
    -- 主键
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- 新闻基本信息
    title VARCHAR(500) NOT NULL COMMENT '新闻标题',
    description TEXT COMMENT '新闻描述/内容',
    link VARCHAR(1000) NOT NULL UNIQUE COMMENT '新闻链接（唯一）',
    pub_date DATETIME COMMENT '发布时间',

    -- AI处理结果
    category VARCHAR(50) NOT NULL DEFAULT '其他' COMMENT '新闻分类',
    summary TEXT COMMENT 'AI生成的摘要',
    keywords VARCHAR(500) COMMENT '关键词（逗号分隔）',

    -- 元数据
    source VARCHAR(200) COMMENT '新闻来源',
    author VARCHAR(200) COMMENT '作者',
    image_url VARCHAR(1000) COMMENT '封面图片URL',

    -- 状态和统计
    processed BOOLEAN DEFAULT TRUE COMMENT '是否已处理',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    like_count INT DEFAULT 0 COMMENT '点赞次数',
    share_count INT DEFAULT 0 COMMENT '分享次数',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    INDEX idx_category (category),
    INDEX idx_pub_date (pub_date),
    INDEX idx_created_at (created_at),
    INDEX idx_processed (processed),
    FULLTEXT INDEX idx_keywords (keywords),
    FULLTEXT INDEX idx_title_summary (title, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻文章主表';

-- ==========================================
-- 分类表：新闻分类定义
-- ==========================================
CREATE TABLE IF NOT EXISTS news_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '分类名称',
    name_en VARCHAR(50) COMMENT '英文名称',
    description VARCHAR(500) COMMENT '分类描述',
    icon VARCHAR(100) COMMENT '分类图标',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻分类表';

-- 插入默认分类
INSERT INTO news_categories (name, name_en, description, icon, sort_order) VALUES
('科技', 'technology', '科技、互联网、AI、数码产品等', '💻', 1),
('财经', 'finance', '金融、经济、股市、企业等', '💰', 2),
('政治', 'politics', '政府、政策、国际关系等', '🏛️', 3),
('体育', 'sports', '体育赛事、运动员等', '⚽', 4),
('娱乐', 'entertainment', '影视、音乐、明星等', '🎬', 5),
('健康', 'health', '医疗、养生、疾病等', '🏥', 6),
('社会', 'society', '民生、社会事件等', '👥', 7),
('其他', 'other', '无法归类的内容', '📰', 99);

-- ==========================================
-- 关键词表：用于关键词统计和搜索
-- ==========================================
CREATE TABLE IF NOT EXISTS news_keywords (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL COMMENT '关键词',
    article_id BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_keyword (keyword),
    INDEX idx_article_id (article_id),
    UNIQUE KEY unique_keyword_article (keyword, article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='新闻关键词表';

-- ==========================================
-- 用户收藏表
-- ==========================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    article_id BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id),
    UNIQUE KEY unique_user_article (user_id, article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

-- ==========================================
-- 用户阅读历史表
-- ==========================================
CREATE TABLE IF NOT EXISTS user_reading_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    article_id BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
    read_duration INT DEFAULT 0 COMMENT '阅读时长（秒）',
    read_progress INT DEFAULT 0 COMMENT '阅读进度（百分比）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_user_article (user_id, article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户阅读历史表';

-- ==========================================
-- RSS源配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS rss_sources (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL COMMENT 'RSS源名称',
    url VARCHAR(1000) NOT NULL UNIQUE COMMENT 'RSS源URL',
    category VARCHAR(50) COMMENT '默认分类',
    language VARCHAR(10) DEFAULT 'zh-CN' COMMENT '语言',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    fetch_interval INT DEFAULT 120 COMMENT '拉取间隔（分钟）',
    last_fetch_at DATETIME COMMENT '最后拉取时间',
    fetch_count INT DEFAULT 0 COMMENT '拉取次数',
    error_count INT DEFAULT 0 COMMENT '错误次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_is_active (is_active),
    INDEX idx_last_fetch (last_fetch_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RSS源配置表';

-- 插入默认RSS源
INSERT INTO rss_sources (name, url, category, language, fetch_interval) VALUES
('Google新闻', 'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans', '综合', 'zh-CN', 120),
('BBC中文', 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', '国际', 'zh-CN', 180),
('36氪', 'https://36kr.com/feed', '科技', 'zh-CN', 60),
('虎嗅网', 'https://www.huxiu.com/rss/0.xml', '科技', 'zh-CN', 60);

-- ==========================================
-- 统计表：每日新闻统计
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_news_stats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE COMMENT '统计日期',
    category VARCHAR(50) NOT NULL COMMENT '分类',
    article_count INT DEFAULT 0 COMMENT '新闻数量',
    view_count INT DEFAULT 0 COMMENT '总浏览量',
    like_count INT DEFAULT 0 COMMENT '总点赞量',
    share_count INT DEFAULT 0 COMMENT '总分享量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_stat_date (stat_date),
    INDEX idx_category (category),
    UNIQUE KEY unique_date_category (stat_date, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日新闻统计表';

-- ==========================================
-- 视图：热门新闻
-- ==========================================
CREATE OR REPLACE VIEW hot_news AS
SELECT
    id,
    title,
    summary,
    category,
    link,
    image_url,
    view_count,
    like_count,
    share_count,
    (view_count * 1 + like_count * 5 + share_count * 10) AS hot_score,
    created_at,
    pub_date
FROM news_articles
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY hot_score DESC
LIMIT 50;

-- ==========================================
-- 视图：最新新闻
-- ==========================================
CREATE OR REPLACE VIEW latest_news AS
SELECT
    id,
    title,
    summary,
    category,
    link,
    image_url,
    view_count,
    like_count,
    pub_date,
    created_at
FROM news_articles
ORDER BY created_at DESC
LIMIT 100;

-- ==========================================
-- 视图：分类统计
-- ==========================================
CREATE OR REPLACE VIEW category_stats AS
SELECT
    c.name AS category_name,
    c.name_en,
    c.icon,
    COUNT(a.id) AS article_count,
    SUM(a.view_count) AS total_views,
    SUM(a.like_count) AS total_likes
FROM news_categories c
LEFT JOIN news_articles a ON c.name = a.category
GROUP BY c.id, c.name, c.name_en, c.icon
ORDER BY c.sort_order;

-- ==========================================
-- 存储过程：更新文章浏览量
-- ==========================================
DELIMITER //
CREATE PROCEDURE update_view_count(IN article_id BIGINT)
BEGIN
    UPDATE news_articles
    SET view_count = view_count + 1
    WHERE id = article_id;
END //
DELIMITER ;

-- ==========================================
-- 存储过程：更新文章点赞
-- ==========================================
DELIMITER //
CREATE PROCEDURE update_like_count(IN article_id BIGINT)
BEGIN
    UPDATE news_articles
    SET like_count = like_count + 1
    WHERE id = article_id;
END //
DELIMITER ;

-- ==========================================
-- 触发器：新闻插入后更新统计
-- ==========================================
DELIMITER //
CREATE TRIGGER after_news_insert
AFTER INSERT ON news_articles
FOR EACH ROW
BEGIN
    INSERT INTO daily_news_stats (stat_date, category, article_count)
    VALUES (DATE(NEW.created_at), NEW.category, 1)
    ON DUPLICATE KEY UPDATE article_count = article_count + 1;
END //
DELIMITER ;

-- ==========================================
-- 常用查询示例
-- ==========================================

-- 1. 查询最新新闻（按分类）
-- SELECT * FROM news_articles WHERE category = '科技' ORDER BY created_at DESC LIMIT 20;

-- 2. 全文搜索
-- SELECT * FROM news_articles WHERE MATCH(title, summary) AGAINST('人工智能' IN NATURAL LANGUAGE MODE);

-- 3. 关键词搜索
-- SELECT * FROM news_articles WHERE keywords LIKE '%AI%' ORDER BY created_at DESC;

-- 4. 热门新闻
-- SELECT * FROM hot_news;

-- 5. 分类统计
-- SELECT * FROM category_stats;

-- 6. 用户收藏的新闻
-- SELECT a.* FROM news_articles a
-- INNER JOIN user_favorites f ON a.id = f.article_id
-- WHERE f.user_id = ? ORDER BY f.created_at DESC;

-- 7. 用户阅读历史
-- SELECT a.*, h.read_duration, h.read_progress, h.created_at as read_at
-- FROM news_articles a
-- INNER JOIN user_reading_history h ON a.id = h.article_id
-- WHERE h.user_id = ? ORDER BY h.created_at DESC;

-- 8. 清理30天前的旧新闻
-- DELETE FROM news_articles WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- ==========================================
-- 性能优化建议
-- ==========================================

-- 1. 定期优化表
-- OPTIMIZE TABLE news_articles;

-- 2. 分析表以更新统计信息
-- ANALYZE TABLE news_articles;

-- 3. 查看表大小
-- SELECT
--     table_name AS "表名",
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "大小(MB)"
-- FROM information_schema.TABLES
-- WHERE table_schema = "news_db"
-- ORDER BY (data_length + index_length) DESC;

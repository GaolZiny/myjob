/**
 * 新闻API - 简化版
 * 专为微信小程序云服务设计
 * 使用PostgreSQL数据库
 */

const { Pool } = require('pg');

// 数据库配置
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'news_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * 新闻API类
 */
class NewsAPI {
    /**
     * 获取最新新闻列表
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @param {string} category - 分类（可选）
     */
    static async getLatestNews(page = 1, pageSize = 20, category = null) {
        const offset = (page - 1) * pageSize;

        let sql = `
            SELECT
                id, title, title_zh, summary_zh, category, link, article_link,
                image_url, pub_date, source, keywords, created_at, updated_at
            FROM news_articles
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (category) {
            sql += ` AND category = $${paramIndex++}`;
            params.push(category);
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(pageSize, offset);

        const result = await pool.query(sql, params);

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM news_articles WHERE 1=1';
        const countParams = [];

        if (category) {
            countSql += ' AND category = $1';
            countParams.push(category);
        }

        const countResult = await pool.query(countSql, countParams);
        const total = parseInt(countResult.rows[0].total);

        return {
            data: result.rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 搜索新闻
     * @param {string} keyword - 搜索关键词
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    static async searchNews(keyword, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;

        const sql = `
            SELECT
                id, title, title_zh, summary_zh, category, link, article_link,
                image_url, pub_date, source, keywords, created_at, updated_at
            FROM news_articles
            WHERE to_tsvector('simple', title || ' ' || coalesce(title_zh, '') || ' ' || coalesce(summary_zh, '')) @@ to_tsquery('simple', $1)
               OR keywords ILIKE $2
               OR title ILIKE $2
               OR title_zh ILIKE $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const keywordPattern = `%${keyword}%`;
        const result = await pool.query(sql, [keyword, keywordPattern, pageSize, offset]);

        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM news_articles
            WHERE to_tsvector('simple', title || ' ' || coalesce(title_zh, '') || ' ' || coalesce(summary_zh, '')) @@ to_tsquery('simple', $1)
               OR keywords ILIKE $2
               OR title ILIKE $2
               OR title_zh ILIKE $2
        `;

        const countResult = await pool.query(countSql, [keyword, keywordPattern]);
        const total = parseInt(countResult.rows[0].total);

        return {
            data: result.rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    /**
     * 获取新闻详情
     * @param {number} id - 新闻ID
     */
    static async getNewsDetail(id) {
        const sql = `
            SELECT
                id, title, title_zh, summary_zh, category, link, article_link,
                image_url, keywords, source,
                pub_date, created_at, updated_at
            FROM news_articles
            WHERE id = $1
        `;

        const result = await pool.query(sql, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * 获取分类列表（带文章数量统计）
     */
    static async getCategories() {
        const sql = `
            SELECT
                category,
                COUNT(*) as article_count
            FROM news_articles
            GROUP BY category
            ORDER BY article_count DESC
        `;

        const result = await pool.query(sql);
        return result.rows;
    }

    /**
     * 获取来源列表（带文章数量统计）
     */
    static async getSources() {
        const sql = `
            SELECT
                source,
                COUNT(*) as article_count,
                MAX(created_at) as latest_article_at
            FROM news_articles
            WHERE source IS NOT NULL
            GROUP BY source
            ORDER BY article_count DESC
        `;

        const result = await pool.query(sql);
        return result.rows;
    }

    /**
     * 获取统计数据
     */
    static async getStatistics() {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM news_articles) as total_articles,
                (SELECT COUNT(*) FROM news_articles WHERE DATE(created_at) = CURRENT_DATE) as today_articles,
                (SELECT COUNT(DISTINCT category) FROM news_articles) as total_categories,
                (SELECT COUNT(DISTINCT source) FROM news_articles WHERE source IS NOT NULL) as total_sources
        `;

        const result = await pool.query(sql);
        return result.rows[0];
    }
}

// ==========================================
// Express API 路由
// ==========================================

const express = require('express');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 获取最新新闻
app.get('/api/news/latest', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, category } = req.query;
        const result = await NewsAPI.getLatestNews(
            parseInt(page),
            parseInt(pageSize),
            category
        );
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error fetching latest news:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 搜索新闻
app.get('/api/news/search', async (req, res) => {
    try {
        const { keyword, page = 1, pageSize = 20 } = req.query;
        if (!keyword) {
            return res.status(400).json({ success: false, message: '请提供搜索关键词' });
        }
        const result = await NewsAPI.searchNews(keyword, parseInt(page), parseInt(pageSize));
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error searching news:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取新闻详情
app.get('/api/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await NewsAPI.getNewsDetail(parseInt(id));
        if (!data) {
            return res.status(404).json({ success: false, message: '新闻不存在' });
        }
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching news detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取分类列表
app.get('/api/categories', async (req, res) => {
    try {
        const data = await NewsAPI.getCategories();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取来源列表
app.get('/api/sources', async (req, res) => {
    try {
        const data = await NewsAPI.getSources();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
    try {
        const data = await NewsAPI.getStatistics();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 健康检查
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`新闻API服务运行在端口 ${PORT}`);
    console.log(`API文档: http://localhost:${PORT}/api/news/latest`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

module.exports = NewsAPI;

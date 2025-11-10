// 小程序页面：新闻列表页
// 从云数据库读取新闻数据并显示

Page({
  data: {
    newsList: [],           // 新闻列表
    categories: ['全部', '科技', '财经', '政治', '体育', '娱乐', '健康', '社会'],
    currentCategory: '全部', // 当前选中的分类
    loading: false,         // 加载状态
    hasMore: true,          // 是否还有更多数据
    page: 0,                // 当前页码
    pageSize: 20            // 每页数量
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadNews(true);
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadNews(true);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNews(false);
    }
  },

  /**
   * 切换分类
   */
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;

    this.setData({
      currentCategory: category,
      newsList: [],
      page: 0,
      hasMore: true
    });
    this.loadNews(true);
  },

  /**
   * 加载新闻数据
   * @param {Boolean} refresh 是否刷新（true=重新加载，false=加载更多）
   */
  async loadNews(refresh = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 构建查询条件
      let query = db.collection('news');

      // 如果选择了具体分类，添加分类过滤
      if (this.data.currentCategory !== '全部') {
        query = query.where({
          category: this.data.currentCategory
        });
      }

      // 排序：按创建时间降序
      query = query.orderBy('created_at', 'desc');

      // 分页
      const page = refresh ? 0 : this.data.page;
      query = query.skip(page * this.data.pageSize).limit(this.data.pageSize);

      // 执行查询
      const result = await query.get();

      console.log('查询结果:', result);

      // 更新数据
      const newsList = refresh ? result.data : [...this.data.newsList, ...result.data];
      const hasMore = result.data.length === this.data.pageSize;

      this.setData({
        newsList: newsList,
        page: page + 1,
        hasMore: hasMore,
        loading: false
      });

      // 停止下拉刷新
      if (refresh) {
        wx.stopPullDownRefresh();
      }

      // 显示提示
      if (refresh && result.data.length === 0) {
        wx.showToast({
          title: '暂无新闻数据',
          icon: 'none'
        });
      }

    } catch (error) {
      console.error('加载新闻失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 点击新闻，跳转到详情页
   */
  onNewsClick(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/news-detail/news-detail?id=${id}`
    });
  },

  /**
   * 分享新闻
   */
  onShareAppMessage() {
    return {
      title: '国际新闻精选',
      path: '/pages/news/news'
    };
  }
});

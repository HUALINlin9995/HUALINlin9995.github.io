class BlogManager {
    constructor() {
        this.articles = [];
        this.dataPath = this.getDataPath();
    }

    // 获取数据文件路径
    getDataPath() {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'article.html') {
            return 'data/articles.json';
        } else {
            return 'data/articles.json';
        }
    }

    // 加载文章数据
    async loadArticles() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                throw new Error('无法加载文章数据');
            }
            const data = await response.json();
            this.articles = data.articles;
            return this.articles;
        } catch (error) {
            console.error('加载文章数据失败:', error);
            return [];
        }
    }

    // 渲染主页文章列表
    async renderHomePage() {
        const blogGrid = document.querySelector('.blog-grid');

        if (!blogGrid) {
            console.error('找不到博客网格容器');
            return;
        }

        try {
            const articles = await this.loadArticles();

            // 清除加载提示
            blogGrid.innerHTML = '';

            if (articles.length === 0) {
                blogGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: white; padding: 50px;"><p>暂无文章</p></div>';
                return;
            }

            articles.forEach(article => {
                const articleCard = this.createArticleCard(article);
                blogGrid.appendChild(articleCard);
            });

        } catch (error) {
            blogGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: white; padding: 50px;"><p>加载文章失败，请刷新页面重试</p></div>';
        }
    }

    // 创建文章卡片
    createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'blog-card';
        card.onclick = () => window.location.href = `article.html?id=${article.id}`;

        card.innerHTML = `
            <div class="card-image" style="background-image: url('${article.image}');"></div>
            <div class="card-content">
                <h3>${article.title}</h3>
                <p>${article.summary}</p>
                <div class="card-meta">
                    <span>${article.date}</span>
                    <a href="article.html?id=${article.id}" class="read-more">阅读更多</a>
                </div>
            </div>
        `;

        return card;
    }

    // 渲染文章页面
    async renderArticlePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');

        if (!articleId) {
            this.showError('未指定文章ID');
            return;
        }

        // 显示加载状态
        const loading = document.querySelector('.loading');
        const articleContainer = document.querySelector('.article-container');

        if (loading) loading.style.display = 'block';
        if (articleContainer) articleContainer.style.display = 'none';

        try {
            const articles = await this.loadArticles();
            const article = articles.find(a => a.id === articleId);

            if (!article) {
                this.showError('文章不存在');
                return;
            }

            this.renderArticle(article);

            // 隐藏加载状态，显示内容
            if (loading) loading.style.display = 'none';
            if (articleContainer) articleContainer.style.display = 'block';

        } catch (error) {
            this.showError('加载文章失败，请稍后重试');
        }
    }

    // 渲染单篇文章
    async renderArticle(article) {
        // 更新页面标题
        document.title = `${article.title} - 华林的个人博客`;

        // 渲染文章头部
        const header = document.querySelector('.article-header');
        if (header) {
            header.innerHTML = `
                <h1>${article.title}</h1>
                <div class="article-meta">
                    <span>发布时间：${article.date}</span> |
                    <span>作者：朱华林</span> |
                    <span>分类：${article.category}</span>
                </div>
            `;
        }

        // 渲染文章内容
        const content = document.querySelector('.article-content');
        if (content) {
            let articleContent = article.content;

            // 检查是否为txt文件路径
            if (article.content.endsWith('.txt')) {
                try {
                    const response = await fetch(article.content);
                    if (response.ok) {
                        articleContent = await response.text();
                    } else {
                        articleContent = '无法加载文章内容，请稍后重试。';
                    }
                } catch (error) {
                    console.error('加载文章内容失败:', error);
                    articleContent = '加载文章内容失败，请检查文件路径。';
                }
            }

            const formattedContent = this.formatContent(articleContent);
            content.innerHTML = `
                <div class="article-image" style="background-image: url('${article.image}');"></div>
                <div class="article-text">${formattedContent}</div>
            `;
        }
    }

    // 格式化文章内容（将markdown风格的标题转换为HTML）
    formatContent(content) {
        // 检测是否包含代码块
        const hasCodeBlocks = content.includes('```') || content.includes('//') || content.includes('QString') || content.includes('QHostInfo');

        // 检测是否包含图片
        // const hasImages = content.includes('<img');

        let formattedContent = content
            .split('\n\n')
            .map(paragraph => {
                // 处理标题
                if (paragraph.startsWith('#### ')) {
                    // 四级标题
                    const title = paragraph.replace('#### ', '');
                    return `<h4>${title}</h4>`;
                } else if (paragraph.startsWith('### ')) {
                    // 三级标题
                    const title = paragraph.replace('### ', '');
                    return `<h3>${title}</h3>`;
                } else if (paragraph.startsWith('## ')) {
                    // 二级标题
                    const title = paragraph.replace('## ', '');
                    return `<h2>${title}</h2>`;
                }

                // 处理代码块
                if (paragraph.includes('```') || (hasCodeBlocks && (paragraph.includes('//') || paragraph.includes('QString') || paragraph.startsWith('connect(')))) {
                    let codeContent = paragraph;
                    // 移除markdown代码标记
                    codeContent = codeContent.replace(/```\w*\n?/g, '');
                    codeContent = codeContent.replace(/```/g, '');
                    return `<div class="code-block"><pre><code>${this.escapeHtml(codeContent)}</code></pre></div>`;
                }

                // 处理图片
                if (paragraph.includes('<img')) {
                    // 提取图片信息
                    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
                    let processedParagraph = paragraph;
                    let match;

                    while ((match = imgRegex.exec(paragraph)) !== null) {
                        const imgTag = match[0];
                        const src = match[1];
                        const isProjectImage = src.includes('QQ_LITE') || src.includes('project');

                        // 根据图片类型应用不同的样式类
                        const imgClass = isProjectImage ? 'project-screenshot' : 'article-img';
                        const newImgTag = imgTag.replace('<img', `<img class="${imgClass}"`);

                        processedParagraph = processedParagraph.replace(imgTag, newImgTag);
                    }

                    return processedParagraph;
                }

                // 处理普通段落
                if (paragraph.trim() !== '') {
                    return `<p>${paragraph}</p>`;
                }

                return paragraph;
            })
            .join('');

        return formattedContent;
    }

    // HTML转义函数
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示错误信息
    showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: white;">
                    <h2>错误</h2>
                    <p>${message}</p>
                    <a href="index.html" class="back-button">返回首页</a>
                </div>
            `;
        }
    }

    // 获取所有文章（用于其他页面）
    async getAllArticles() {
        return await this.loadArticles();
    }

    // 根据ID获取单篇文章
    async getArticleById(id) {
        const articles = await this.loadArticles();
        return articles.find(article => article.id === id);
    }
}

// 全局blog实例
window.blogManager = new BlogManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        // 主页
        window.blogManager.renderHomePage();
    } else if (currentPage === 'article.html') {
        // 文章页
        window.blogManager.renderArticlePage();
    }
});
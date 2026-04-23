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

            // 添加图片预览功能
            this.setupImagePreview();

            // 添加视频全屏功能
            this.setupVideoFullscreen();

            // 生成文章目录
            this.generateTableOfContents();
        }
    }

    // 格式化文章内容（将markdown风格的标题转换为HTML）
    formatContent(content) {
        // 检测是否包含代码块
        const hasCodeBlocks = content.includes('```') || content.includes('//') || content.includes('QString') || content.includes('QHostInfo');

        // 首先处理粗体文本
        content = this.processBoldText(content);

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

                // 处理视频标签
                if (paragraph.includes('<video')) {
                    // 提取视频信息并保留原有的class属性
                    const videoRegex = /<video[^>]+src="([^"]+)"[^>]*(?:class="([^"]*)")?[^>]*>/g;
                    let processedParagraph = paragraph;
                    let match;

                    while ((match = videoRegex.exec(paragraph)) !== null) {
                        const videoTag = match[0];
                        const src = match[1];
                        const className = match[2] || '';

                        // 保留原有的class并添加视频播放控件
                        let newVideoTag = videoTag.replace(/<video/, `<video controls`);
                        processedParagraph = processedParagraph.replace(videoTag, newVideoTag);
                    }

                    return processedParagraph;
                }

                // 处理<a>链接标签
                if (paragraph.includes('<a ')) {
                    // 匹配所有 <a> 标签，正确处理属性和内容
                    const linkRegex = /<a\s+([^>]+)>([\s\S]*?)<\/a>/gi;
                    let processedParagraph = paragraph;

                    processedParagraph = processedParagraph.replace(linkRegex, (match, attributes, content) => {
                        // 安全添加 target 和 rel 属性，避免重复
                        let updatedAttributes = attributes || '';

                        // 添加新标签页打开
                        if (!updatedAttributes.toLowerCase().includes('target=')) {
                            updatedAttributes += ' target="_blank"';
                        }
                        // 添加安全 rel 属性
                        if (!updatedAttributes.toLowerCase().includes('rel=')) {
                            updatedAttributes += ' rel="noopener noreferrer"';
                        }

                        // 返回完整正确的 a 标签
                        return `<a ${updatedAttributes.trim()}>${content}</a>`;
                    });

                    return processedParagraph;
                }

                // 处理图片 - 保留原有的class属性
                if (paragraph.includes('<img')) {
                    let processedParagraph = paragraph;

                    // 使用更精确的正则表达式处理img标签
                    const imgRegex = /<img\s+([^>]*)>/g;
                    processedParagraph = processedParagraph.replace(imgRegex, (match, attributes) => {
                        // 检查是否已经有class属性
                        if (attributes.includes('class=')) {
                            // 已经有class属性，保持原样
                            return match;
                        } else {
                            // 没有class属性，需要添加
                            const srcMatch = attributes.match(/src="([^"]+)"/);
                            if (srcMatch) {
                                const src = srcMatch[1];
                                const isProjectImage = src.includes('QQ_LITE') || src.includes('project');
                                const imgClass = isProjectImage ? 'project-screenshot' : 'article-img';
                                return `<img class="${imgClass}" ${attributes}>`;
                            }
                            return match;
                        }
                    });

                    return processedParagraph;
                }

                // 处理代码块
                if (paragraph.includes('```') || (hasCodeBlocks && (paragraph.includes('//') || paragraph.includes('QString') || paragraph.startsWith('connect(')))) {
                    let codeContent = paragraph;
                    // 移除markdown代码标记
                    codeContent = codeContent.replace(/```\w*\n?/g, '');
                    codeContent = codeContent.replace(/```/g, '');
                    return `<div class="code-block"><pre><code>${this.escapeHtml(codeContent)}</code></pre></div>`;
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

    // 设置视频全屏功能
    setupVideoFullscreen() {
        // 创建全屏关闭按钮
        if (!document.querySelector('.video-fullscreen-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'video-fullscreen-close';
            closeBtn.innerHTML = '×';
            closeBtn.title = '退出全屏 (ESC)';
            document.body.appendChild(closeBtn);

            // 点击关闭按钮退出全屏
            closeBtn.addEventListener('click', () => {
                this.exitVideoFullscreen();
            });
        }

        // 为所有视频添加点击事件
        const videos = document.querySelectorAll('.article-content video');
        videos.forEach(video => {
            video.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterVideoFullscreen(video);
            });

            // 添加双击事件支持原生全屏
            video.addEventListener('dblclick', () => {
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                } else if (video.webkitRequestFullscreen) {
                    video.webkitRequestFullscreen();
                }
            });
        });

        // ESC键退出全屏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.exitVideoFullscreen();
            }
        });
    }

    // 进入视频全屏模式
    enterVideoFullscreen(video) {
        // 移除其他视频的全屏状态
        document.querySelectorAll('.article-content video').forEach(v => {
            v.classList.remove('video-fullscreen');
        });

        // 添加全屏样式
        video.classList.add('video-fullscreen');

        // 显示关闭按钮
        const closeBtn = document.querySelector('.video-fullscreen-close');
        closeBtn.classList.add('active');

        // 暂停其他视频
        document.querySelectorAll('.article-content video').forEach(v => {
            if (v !== video) {
                v.pause();
            }
        });

        // 确保视频在全屏时保持原有宽高比
        video.style.objectFit = 'contain';
    }

    // 退出视频全屏模式
    exitVideoFullscreen() {
        // 移除所有视频的全屏状态
        document.querySelectorAll('.article-content video').forEach(video => {
            video.classList.remove('video-fullscreen');
        });

        // 隐藏关闭按钮
        const closeBtn = document.querySelector('.video-fullscreen-close');
        closeBtn.classList.remove('active');
    }

    // 生成文章目录
    generateTableOfContents() {
        const articleText = document.querySelector('.article-text');
        const articleContainer = document.querySelector('.article-container');

        if (!articleText || !articleContainer) return;

        // 查找所有标题元素
        const headings = articleText.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) return;

        // 创建目录容器
        const tocContainer = document.createElement('div');
        tocContainer.className = 'table-of-contents';
        tocContainer.innerHTML = `
            <div class="toc-header">文章目录</div>
            <div class="toc-list"></div>
        `;

        // 生成目录项
        const tocList = tocContainer.querySelector('.toc-list');
        let tocHtml = '';

        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));
            const title = heading.textContent;
            const id = `toc-heading-${index}`;

            // 为标题添加ID以便锚点跳转
            heading.id = id;

            // 根据标题级别添加缩进
            const indent = (level - 1) * 20;
            const className = `toc-item toc-level-${level}`;

            tocHtml += `
                <div class="${className}" style="padding-left: ${indent}px" data-target="${id}">
                    ${title}
                </div>
            `;
        });

        tocList.innerHTML = tocHtml;

        // 添加到页面
        articleContainer.appendChild(tocContainer);

        // 添加点击事件
        tocContainer.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // 文本加粗处理
    processBoldText(content) {
        // 处理**粗体**语法
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 处理__粗体__语法
        content = content.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        return content;
    }

    // 设置图片预览功能
    setupImagePreview() {
        // 创建预览模态框
        if (!document.querySelector('.image-preview-modal')) {
            const modal = document.createElement('div');
            modal.className = 'image-preview-modal';
            modal.innerHTML = `
                <div class="preview-content">
                    <span class="preview-close">&times;</span>
                    <img src="" alt="预览图片">
                    <div class="preview-caption"></div>
                </div>
            `;
            document.body.appendChild(modal);

            // 点击关闭按钮关闭预览
            modal.querySelector('.preview-close').addEventListener('click', () => {
                modal.classList.remove('active');
            });

            // 点击背景关闭预览
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });

            // ESC键关闭预览
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.classList.remove('active');
                }
            });
        }

        // 为所有文章内图片添加点击事件
        const images = document.querySelectorAll('.article-content img');
        images.forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.querySelector('.image-preview-modal');
                const previewImg = modal.querySelector('img');
                const caption = modal.querySelector('.preview-caption');

                previewImg.src = img.src;
                previewImg.alt = img.alt || '图片预览';

                // 尝试获取图片标题或alt文本作为说明
                const captionText = img.title || img.alt || '';
                caption.textContent = captionText;

                modal.classList.add('active');
            });
        });
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
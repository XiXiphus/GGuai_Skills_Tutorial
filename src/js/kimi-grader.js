import { marked } from 'marked';

const GRADING_SYSTEM_PROMPT = `你是一位温柔但精准的课程助教。你正在批改一套智能体技能入门课的练习。

你的任务是评估学生的主观题回答。请按以下格式输出（必须使用 Markdown）：

## 评分：X/10

## 亮点
- （学生答得好的地方，1-2 条）

## 可以更好
- （具体建议，1-2 条，语气鼓励但不回避问题）

## 参考方向
（不要直接给完整答案，而是给一个"如果再想一步，可以从这个角度切入"的提示）

评分标准：
- 10分：准确理解概念 + 有自己的表达 + 举了贴切的例子
- 7-9分：理解基本正确，但表达或例子有一处不够到位
- 4-6分：方向对但理解有偏差，或过于笼统
- 1-3分：理解有明显错误，需要回顾课程内容
- 0分：未作答或完全离题`;

/**
 * 存储对话历史
 * 使用 Map 而不是 WeakMap，因为：
 * 1. textarea 可能会被 DOM 移除（如重新加载课程）
 * 2. 我们需要持久化保存对话历史，即使 DOM 元素被移除
 * 3. 使用问题文本作为 key，确保同一道题的历史可以被恢复
 */
const chatHistories = new Map();

/**
 * 生成对话历史的唯一 key
 */
function getHistoryKey(question, reference) {
    // 使用问题和参考答案的组合作为 key
    return `${question.slice(0, 50)}_${reference.slice(0, 30)}`;
}
const API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MODEL = 'kimi-k2.5';
const TIMEOUT_MS = 60000;

function getApiKey() {
    const key = localStorage.getItem('kimi_api_key');
    return key ? key.trim() : '';
}

function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
}

async function streamFetch(messages, targetEl, onComplete) {
    const apiKey = getApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model: MODEL, messages, stream: true }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        targetEl.classList.add('streaming');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') {
                    targetEl.classList.remove('streaming');
                    if (onComplete) onComplete(fullContent);
                    return fullContent;
                }

                try {
                    const chunk = JSON.parse(data);
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        fullContent += content;
                        targetEl.innerHTML = marked.parse(fullContent);
                        const scrollParent = targetEl.closest('.ai-feedback') || targetEl.closest('.chat-history');
                        scrollToBottom(scrollParent);
                    }
                } catch (e) {
                    // skip malformed chunks
                }
            }
        }

        targetEl.classList.remove('streaming');
        if (onComplete) onComplete(fullContent);
        return fullContent;
    } finally {
        clearTimeout(timeout);
    }
}

export async function gradeWithKimi(question, reference, answer, feedbackEl, textareaEl) {
    const apiKey = getApiKey();

    if (!apiKey) {
        showStaticFeedback(feedbackEl, reference);
        return { status: 'completed', mode: 'static' };
    }

    const messages = [
        { role: 'system', content: GRADING_SYSTEM_PROMPT },
        { role: 'user', content: `题目：${question}\n参考答案/评分重点：${reference}\n学生答案：${answer}` }
    ];

    feedbackEl.innerHTML = `
        <div class="ai-grading-result streaming-target"></div>
    `;
    feedbackEl.style.display = 'block';

    const resultEl = feedbackEl.querySelector('.streaming-target');
    resultEl.innerHTML = '<span class="streaming-cursor"></span>';

    try {
        const aiReply = await streamFetch(messages, resultEl, null);

        messages.push({ role: 'assistant', content: aiReply });
        // 使用问题文本作为 key，避免 DOM 移除导致的历史丢失
        const historyKey = getHistoryKey(question, reference);
        chatHistories.set(historyKey, { messages, question, reference });

        renderChatSection(feedbackEl, textareaEl, historyKey);
        return { status: 'completed', mode: 'ai' };

    } catch (error) {
        if (error.name === 'AbortError') {
            // 安全的 HTML 属性转义
            const safeReference = escapeHtmlAttribute(reference);
            feedbackEl.innerHTML = `
                <div class="static-feedback">
                    <p class="error-text">请求超时（60秒），请重试。</p>
                    <button class="btn btn-primary retry-btn" data-reference="${safeReference}">重试</button>
                </div>`;
            // 绑定事件处理器而不是使用 inline onclick
            const retryBtn = feedbackEl.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    const ref = retryBtn.dataset.reference;
                    const gradeBtn = retryBtn.closest('.question-card')?.querySelector('.btn[onclick*="gradeSubjective"]');
                    if (gradeBtn && window.gradeSubjective) {
                        // 从历史中删除，然后重新触发评分
                        const key = getHistoryKey(question, reference);
                        chatHistories.delete(key);
                        window.gradeSubjective(gradeBtn, ref);
                    }
                });
            }
            return { status: 'retryable-error', mode: 'timeout' };
        } else {
            console.error('Kimi API Error:', error);
            showStaticFeedback(feedbackEl, reference, true);
            return { status: 'completed', mode: 'fallback' };
        }
    }
}

async function continueChat(textareaEl, feedbackEl, userMessage, historyKey) {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const history = chatHistories.get(historyKey);
    if (!history) return;

    const { messages } = history;
    messages.push({ role: 'user', content: userMessage });

    const chatContainer = feedbackEl.querySelector('.chat-history');

    chatContainer.insertAdjacentHTML('beforeend', `
        <div class="chat-bubble user-bubble">
            <div class="bubble-content">${marked.parse(userMessage)}</div>
        </div>
        <div class="chat-bubble ai-bubble">
            <div class="bubble-content streaming-target"><span class="streaming-cursor"></span></div>
        </div>
    `);

    scrollToBottom(chatContainer);

    const inputEl = feedbackEl.querySelector('.chat-input');
    const btnEl = feedbackEl.querySelector('.chat-send-btn');
    inputEl.disabled = true;
    btnEl.disabled = true;
    inputEl.value = '';
    if (inputEl.tagName === 'TEXTAREA') {
        inputEl.style.height = 'auto';
    }

    const targetEl = chatContainer.querySelector('.chat-bubble:last-child .streaming-target');

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model: MODEL, messages, stream: true }),
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            targetEl.classList.add('streaming');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') break;

                    try {
                        const chunk = JSON.parse(data);
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            fullContent += content;
                            targetEl.innerHTML = marked.parse(fullContent);
                            scrollToBottom(chatContainer);
                        }
                    } catch (e) { /* skip */ }
                }
            }

            targetEl.classList.remove('streaming');
            messages.push({ role: 'assistant', content: fullContent });
            chatHistories.set(historyKey, history);
        } finally {
            clearTimeout(timeout);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            targetEl.innerHTML = '<span class="error-text">请求超时，请重试。</span>';
        } else {
            console.error('Kimi Chat Error:', error);
            targetEl.innerHTML = '<span class="error-text">网络错误，请重试。</span>';
        }
        targetEl.classList.remove('streaming');
        messages.pop();
    } finally {
        inputEl.disabled = false;
        btnEl.disabled = false;
        inputEl.focus();
    }
}

/**
 * 安全地转义 HTML 属性值
 */
function escapeHtmlAttribute(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderChatSection(feedbackEl, textareaEl, historyKey) {
    const history = chatHistories.get(historyKey);
    const resultEl = feedbackEl.querySelector('.ai-grading-result');

    const chatSection = document.createElement('div');
    chatSection.className = 'chat-section';
    chatSection.innerHTML = `
        <div class="chat-toolbar">
            <button class="btn btn-secondary regenerate-btn">重新获取反馈</button>
        </div>
        <div class="chat-history"></div>
        <div class="chat-input-area">
            <textarea class="chat-input" placeholder="对反馈有疑问？继续和 Kimi 聊聊..." rows="1"></textarea>
            <button class="btn btn-primary chat-send-btn">发送</button>
        </div>
    `;

    if (resultEl && resultEl.parentNode) {
        resultEl.parentNode.appendChild(chatSection);
    }

    const inputEl = chatSection.querySelector('.chat-input');
    const btnEl = chatSection.querySelector('.chat-send-btn');
    const regenBtn = chatSection.querySelector('.regenerate-btn');

    const handleSend = () => {
        const text = inputEl.value.trim();
        if (text) {
            continueChat(textareaEl, feedbackEl, text, historyKey);
        }
    };

    btnEl.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    regenBtn.addEventListener('click', () => {
        if (history) {
            const questionCard = feedbackEl.closest('.question-card');
            const gradeBtn = questionCard?.querySelector('.btn[onclick*="gradeSubjective"]');
            if (gradeBtn) {
                chatHistories.delete(historyKey);
                gradeBtn.click();
            }
        }
    });
}

function showStaticFeedback(feedbackEl, reference, isError = false) {
    const errorMsg = isError ? '<p class="error-text">API 调用失败，已降级显示参考答案。</p>' :
                              '<p class="info-text">未配置 Kimi API Key，显示静态参考答案。（可在左下角配置）</p>';

    feedbackEl.innerHTML = `
        <div class="static-feedback">
            ${errorMsg}
            <h4>参考答案 / 评分重点：</h4>
            <p>${reference}</p>
        </div>
    `;
    feedbackEl.style.display = 'block';
}

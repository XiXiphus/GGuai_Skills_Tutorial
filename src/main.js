import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/exercises.css';
import './styles/gallery.css';
import './styles/home.css';
import './styles/terminal.css';

import { marked } from 'marked';

// 配置 marked 安全选项：禁用可能危险的 HTML 标签
marked.use({
    gfm: true,
    breaks: true,
    // 禁用原始 HTML，只允许 Markdown 语法
    sanitize: true,
    // 自定义渲染器，过滤危险标签
    renderer: {
        html(text) {
            // 只允许特定的安全 HTML 标签
            const allowedTags = /^(<(b|i|em|strong|code|pre|p|br|ul|ol|li|h[1-6]|blockquote)[^>]*>)|(<\/(b|i|em|strong|code|pre|p|ul|ol|li|h[1-6]|blockquote)>)$/i;
            if (allowedTags.test(text.trim())) {
                return text;
            }
            // 其他 HTML 转义显示
            return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }
});

import {
    checkUnlocks,
    getCompletedLessons,
    hydrateExerciseDrafts,
    initDetailsToggleTracker,
    hydrateExerciseState,
    saveChoiceDraft,
    saveDetailsDraft,
    saveTextareaDraft
} from './js/progress.js';
import { showSection, toggleSidebar, nextLesson, prevLesson } from './js/navigation.js';
import { openModal, closeModal } from './js/modal.js';
import { gradeChoice, gradeSubjective } from './js/exercises.js';
import { initTerminal, toggleTerminal, openTerminalWith } from './js/terminal.js';
import { applyExerciseManifestToDom, getRenderedSectionsHtml, getSectionMeta, isSectionUnlocked } from './js/course-manifest.js';

const CURRENT_SECTION_KEY = 'currentSection';

window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.nextLesson = nextLesson;
window.prevLesson = prevLesson;
window.openModal = openModal;
window.closeModal = closeModal;
window.gradeChoice = gradeChoice;
window.gradeSubjective = gradeSubjective;
window.toggleTerminal = toggleTerminal;
window.openTerminalWith = openTerminalWith;

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
    }
    if (e.key === 'ArrowLeft' && e.ctrlKey) {
        prevLesson();
    }
    if (e.key === 'ArrowRight' && e.ctrlKey) {
        nextLesson();
    }
    if (e.key === '`' && e.ctrlKey) {
        toggleTerminal();
        e.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('content-body');
    if (container) {
        container.innerHTML = getRenderedSectionsHtml();
    }
    applyExerciseManifestToDom(document);
    hydrateExerciseState();
    checkUnlocks();
    initDetailsToggleTracker();
    hydrateExerciseDrafts();
    initTerminal();
    const storedCurrentSection = sessionStorage.getItem(CURRENT_SECTION_KEY);
    const hashSection = window.location.hash.replace(/^#/, '');
    const preferredSection = hashSection || storedCurrentSection || 'home';
    const completedLessons = getCompletedLessons();
    const safeInitialSection = getSectionMeta(preferredSection) && isSectionUnlocked(preferredSection, completedLessons) ? preferredSection : 'home';
    showSection(safeInitialSection);
});

document.addEventListener('click', function (e) {
    const actionTarget = e.target.closest('[data-action]');
    if (actionTarget) {
        const { action } = actionTarget.dataset;

        if (action === 'show-section') {
            e.preventDefault();
            showSection(actionTarget.dataset.section);
            return;
        }

        if (action === 'prev-section') {
            e.preventDefault();
            prevLesson();
            return;
        }

        if (action === 'next-section') {
            e.preventDefault();
            nextLesson();
            return;
        }

        if (action === 'toggle-terminal') {
            e.preventDefault();
            toggleTerminal();
            return;
        }

        if (action === 'open-terminal') {
            e.preventDefault();
            openTerminalWith(actionTarget.dataset.terminalCommand || '');
            return;
        }

        if (action === 'open-modal') {
            e.preventDefault();
            openModal(actionTarget.dataset.modalSrc || '');
            return;
        }
    }

    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.mobile-toggle');

    if (window.innerWidth <= 768 &&
        sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

document.addEventListener('input', function (e) {
    const textarea = e.target.closest('.text-answer');
    if (!textarea) {
        return;
    }

    const card = textarea.closest('.question-card');
    if (!card) {
        return;
    }

    saveTextareaDraft(card.dataset.exerciseId, textarea.value);
});

document.addEventListener('change', function (e) {
    const radio = e.target.closest('input[type="radio"]');
    if (radio) {
        const card = radio.closest('.question-card');
        if (!card) {
            return;
        }

        saveChoiceDraft(card.dataset.exerciseId, radio.value);
        return;
    }
});

document.addEventListener('toggle', function (e) {
    const details = e.target.closest('details');
    if (!details || !details.open) {
        return;
    }

    const card = details.closest('.question-card');
    if (!card) {
        return;
    }

    saveDetailsDraft(card.dataset.exerciseId, details.open);
}, true);

import confetti from 'canvas-confetti';
import {
    courseCards,
    courseSections,
    getCardMeta,
    getExercisesForLesson,
    getSectionMeta,
    isNavItemVisible,
    isSectionUnlocked
} from './course-manifest.js';

const EXERCISE_STATE_KEY = 'exerciseState';
const EXERCISE_DRAFT_KEY = 'exerciseDrafts';
export const totalLessons = courseCards.length;
export let completedLessons = loadCompletedLessons();
let exerciseState = loadExerciseState();
let exerciseDrafts = loadExerciseDrafts();

function loadCompletedLessons() {
    try {
        const raw = JSON.parse(localStorage.getItem('completedLessons') || '[]');
        if (!Array.isArray(raw)) return [];
        return [...new Set(raw)]
            .map(n => Number(n))
            .filter(n => Number.isInteger(n) && n >= 1 && n <= totalLessons)
            .sort((a, b) => a - b);
    } catch {
        localStorage.removeItem('completedLessons');
        return [];
    }
}

function loadExerciseState() {
    try {
        const raw = JSON.parse(localStorage.getItem(EXERCISE_STATE_KEY) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
    } catch {
        localStorage.removeItem(EXERCISE_STATE_KEY);
        return {};
    }
}

function loadExerciseDrafts() {
    try {
        const raw = JSON.parse(localStorage.getItem(EXERCISE_DRAFT_KEY) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
    } catch {
        localStorage.removeItem(EXERCISE_DRAFT_KEY);
        return {};
    }
}

function persistExerciseState() {
    localStorage.setItem(EXERCISE_STATE_KEY, JSON.stringify(exerciseState));
}

function persistExerciseDrafts() {
    localStorage.setItem(EXERCISE_DRAFT_KEY, JSON.stringify(exerciseDrafts));
}

function getExerciseCard(exerciseId) {
    return document.querySelector(`.question-card[data-exercise-id="${exerciseId}"]`);
}

function getDraftStatusEl(card) {
    let statusEl = card.querySelector('.draft-save-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'draft-save-status';
        const feedbackAnchor = card.querySelector('.score-display, .ai-feedback');
        if (feedbackAnchor) {
            feedbackAnchor.parentNode.insertBefore(statusEl, feedbackAnchor);
        } else {
            const contentAnchor = card.querySelector('details, .answer-options, .text-answer');
            if (contentAnchor) {
                contentAnchor.insertAdjacentElement('afterend', statusEl);
            } else {
                card.appendChild(statusEl);
            }
        }
    }
    return statusEl;
}

function setDraftStatus(card, message, tone = 'saved') {
    if (!card) {
        return;
    }

    const statusEl = getDraftStatusEl(card);
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
    statusEl.style.display = message ? 'block' : 'none';
}

function formatSavedAt(timestamp) {
    if (!timestamp) {
        return '';
    }

    return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function normalizeDraft(draft = {}) {
    return {
        textValue: typeof draft.textValue === 'string' ? draft.textValue : '',
        selectedValue: typeof draft.selectedValue === 'string' ? draft.selectedValue : null,
        detailsOpen: Boolean(draft.detailsOpen),
        savedAt: draft.savedAt || null
    };
}

function hasMeaningfulDraft(draft = {}) {
    return Boolean(draft.textValue || draft.selectedValue || draft.detailsOpen);
}

function syncExerciseCardState(exerciseId) {
    const card = getExerciseCard(exerciseId);
    if (!card) {
        return;
    }

    const state = exerciseState[exerciseId];
    card.dataset.exerciseStatus = state?.status || 'idle';

    if (state?.completed) {
        card.dataset.exerciseCompleted = 'true';
        card.classList.remove('unanswered');
        return;
    }

    delete card.dataset.exerciseCompleted;
}

function updateExerciseState(exerciseId, nextState = {}) {
    if (!exerciseId) {
        return;
    }

    const currentState = exerciseState[exerciseId] || {};
    exerciseState[exerciseId] = {
        ...currentState,
        ...nextState,
        updatedAt: Date.now()
    };
    persistExerciseState();
    syncExerciseCardState(exerciseId);
}

export function getCompletedLessons() {
    return completedLessons;
}

export function getExerciseState(exerciseId) {
    return exerciseState[exerciseId] || null;
}

export function getExerciseDraft(exerciseId) {
    return normalizeDraft(exerciseDrafts[exerciseId]);
}

export function isExerciseCompleted(exerciseId) {
    return Boolean(exerciseState[exerciseId]?.completed);
}

export function markExercisePending(exerciseId, metadata = {}) {
    const alreadyCompleted = isExerciseCompleted(exerciseId);
    updateExerciseState(exerciseId, {
        ...metadata,
        status: 'pending',
        completed: alreadyCompleted
    });
}

export function markExerciseCompleted(exerciseId, metadata = {}) {
    updateExerciseState(exerciseId, {
        ...metadata,
        status: 'completed',
        completed: true
    });
}

export function markExerciseIncomplete(exerciseId, metadata = {}) {
    updateExerciseState(exerciseId, {
        ...metadata,
        status: metadata.status || 'incomplete',
        completed: false
    });
}

export function hydrateExerciseState() {
    document.querySelectorAll('.question-card[data-exercise-id]').forEach((card) => {
        syncExerciseCardState(card.dataset.exerciseId);
    });
}

export function saveTextareaDraft(exerciseId, value) {
    if (!exerciseId) {
        return;
    }

    const currentDraft = normalizeDraft(exerciseDrafts[exerciseId]);
    exerciseDrafts[exerciseId] = {
        ...currentDraft,
        textValue: value,
        savedAt: Date.now()
    };

    if (!hasMeaningfulDraft(exerciseDrafts[exerciseId])) {
        delete exerciseDrafts[exerciseId];
    }

    persistExerciseDrafts();

    const card = getExerciseCard(exerciseId);
    if (card && value.trim()) {
        const savedAt = formatSavedAt(exerciseDrafts[exerciseId]?.savedAt);
        setDraftStatus(card, `你的答案已自动保存${savedAt ? ` ${savedAt}` : ''}`);
    } else if (card && !exerciseDrafts[exerciseId]) {
        setDraftStatus(card, '', 'saved');
    }
}

export function saveChoiceDraft(exerciseId, selectedValue) {
    if (!exerciseId) {
        return;
    }

    const currentDraft = normalizeDraft(exerciseDrafts[exerciseId]);
    exerciseDrafts[exerciseId] = {
        ...currentDraft,
        selectedValue: selectedValue || null,
        savedAt: Date.now()
    };

    if (!hasMeaningfulDraft(exerciseDrafts[exerciseId])) {
        delete exerciseDrafts[exerciseId];
    }

    persistExerciseDrafts();

    const card = getExerciseCard(exerciseId);
    if (card && selectedValue) {
        const savedAt = formatSavedAt(exerciseDrafts[exerciseId]?.savedAt);
        setDraftStatus(card, `你的答案已自动保存${savedAt ? ` ${savedAt}` : ''}`);
    } else if (card && !exerciseDrafts[exerciseId]) {
        setDraftStatus(card, '', 'saved');
    }
}

export function saveDetailsDraft(exerciseId, isOpen) {
    if (!exerciseId) {
        return;
    }

    const currentDraft = normalizeDraft(exerciseDrafts[exerciseId]);
    exerciseDrafts[exerciseId] = {
        ...currentDraft,
        detailsOpen: Boolean(isOpen),
        savedAt: Date.now()
    };

    if (!hasMeaningfulDraft(exerciseDrafts[exerciseId])) {
        delete exerciseDrafts[exerciseId];
    }

    persistExerciseDrafts();

    const card = getExerciseCard(exerciseId);
    if (card && isOpen) {
        const savedAt = formatSavedAt(exerciseDrafts[exerciseId]?.savedAt);
        setDraftStatus(card, `你的答案已自动保存${savedAt ? ` ${savedAt}` : ''}`);
    } else if (card && !exerciseDrafts[exerciseId]) {
        setDraftStatus(card, '', 'saved');
    }
}

export function hydrateExerciseDrafts() {
    document.querySelectorAll('.question-card[data-exercise-id]').forEach((card) => {
        const exerciseId = card.dataset.exerciseId;
        const draft = getExerciseDraft(exerciseId);
        if (!hasMeaningfulDraft(draft)) {
            return;
        }

        const textarea = card.querySelector('.text-answer');
        if (textarea && draft.textValue) {
            textarea.value = draft.textValue;
        }

        if (draft.selectedValue) {
            const radio = card.querySelector(`input[type="radio"][value="${draft.selectedValue}"]`);
            if (radio) {
                radio.checked = true;
            }
        }

        const details = card.querySelector('details');
        if (details && draft.detailsOpen) {
            details.open = true;
        }

        const exerciseState = getExerciseState(exerciseId);
        const savedAt = formatSavedAt(draft.savedAt);
        const message = exerciseState?.completed && card.dataset.exerciseType === 'subjective'
            ? `你的答案已恢复${savedAt ? `（${savedAt}）` : ''}，AI 反馈需重新生成`
            : `已恢复上次草稿${savedAt ? `（${savedAt}）` : ''}`;
        setDraftStatus(card, message, 'restored');
    });
}

export function markLessonCompleted(lessonNum) {
    if (!completedLessons.includes(lessonNum)) {
        completedLessons.push(lessonNum);
        completedLessons.sort((a, b) => a - b);
        localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
        triggerCardUnlockAnimation(lessonNum);
        checkUnlocks();
    }
}

export function validateLesson(lessonNum) {
    const sectionId = `lesson${lessonNum}`;
    const section = document.getElementById(sectionId);
    if (!section) return true;

    const exercises = getExercisesForLesson(sectionId);
    if (exercises.length === 0) return true;

    let allDone = true;
    exercises.forEach((exercise) => {
        const card = section.querySelector(`.question-card[data-exercise-id="${exercise.id}"]`);
        if (!card || !isExerciseCompleted(exercise.id)) {
            allDone = false;
            card?.classList.add('unanswered');
        } else {
            card.classList.remove('unanswered');
        }
    });

    return allDone;
}

export function initDetailsToggleTracker() {
    // 监听 details 元素的展开状态，用于标记折叠查看题为已完成
    document.querySelectorAll('.lesson-section').forEach(section => {
        if (!section.id.startsWith('lesson')) return;
        section.querySelectorAll('details').forEach(details => {
            // 避免重复绑定
            if (details.dataset.tracked) return;
            details.dataset.tracked = 'true';
            
            details.addEventListener('toggle', () => {
                if (details.open) {
                    const card = details.closest('.question-card');
                    if (card) {
                        card.dataset.opened = 'true';
                        markExerciseCompleted(card.dataset.exerciseId, {
                            lessonId: section.id,
                            type: card.dataset.exerciseType || 'details-read',
                            source: 'details'
                        });
                    }
                }
            });
        });
    });
}

function triggerCardUnlockAnimation(lessonNum) {
    const flyCard = document.createElement('div');
    flyCard.className = 'fly-card-anim';

    const cardMeta = getCardMeta(lessonNum);
    const cardItem = document.querySelector(`.card-item[data-lesson="${lessonNum}"]`);
    const imgSrc = cardItem?.querySelector('img')?.src || cardMeta?.image;
    if (imgSrc) {
        flyCard.style.backgroundImage = `url(${imgSrc})`;
    }

    document.body.appendChild(flyCard);

    setTimeout(() => {
        confetti({
            particleCount: 50,
            spread: 60,
            origin: { x: 0.85, y: 0.85 },
            disableForReducedMotion: true,
            zIndex: 9999
        });
        setTimeout(() => flyCard.remove(), 1000);
    }, 800);
}

function hasCompletedAll(nums) {
    return nums.every(n => completedLessons.includes(n));
}

// 用于防止 checkUnlocks 重复执行的锁
let unlockCheckPending = false;
let unlockCheckTimeout = null;

export function checkUnlocks() {
    // 防止竞态条件：如果正在执行，跳过这次调用
    if (unlockCheckPending) {
        // 延迟 100ms 后再试一次
        clearTimeout(unlockCheckTimeout);
        unlockCheckTimeout = setTimeout(() => checkUnlocks(), 100);
        return;
    }
    unlockCheckPending = true;
    
    try {
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            const sectionId = link.dataset.section;
            const sectionMeta = getSectionMeta(sectionId);
            if (!sectionMeta) {
                return;
            }

            if (sectionMeta.lessonNumber && completedLessons.includes(sectionMeta.lessonNumber)) {
                link.classList.add('completed');
                link.classList.remove('locked');
            } else {
                link.classList.remove('completed');

                if (!isSectionUnlocked(sectionId, completedLessons)) {
                    link.classList.add('locked');
                } else {
                    link.classList.remove('locked');
                }
            }
        });

        courseSections.forEach((section) => {
            if (!section.nav?.itemId) {
                return;
            }

            const navItem = document.getElementById(section.nav.itemId);
            if (!navItem) {
                return;
            }

            if (isNavItemVisible(section.id, completedLessons)) {
                navItem.classList.remove('nav-hidden');
                if (section.nav.hiddenUntilUnlocked) {
                    navItem.classList.add('nav-revealed');

                    if (!navItem.dataset.revealed) {
                        navItem.dataset.revealed = 'true';
                        if (section.nav.revealToast) {
                            showToast(section.nav.revealToast);
                        }
                    }
                } else {
                    navItem.classList.remove('nav-revealed');
                }
            } else {
                navItem.classList.add('nav-hidden');
                navItem.classList.remove('nav-revealed');
            }
        });

        const badge = document.getElementById('card-badge');
        if (badge) {
            badge.textContent = `${completedLessons.length}/${totalLessons}`;
        }

        document.querySelectorAll('.card-item').forEach((item) => {
            const lessonNum = parseInt(item.dataset.lesson, 10);
            if (completedLessons.includes(lessonNum)) {
                if (item.classList.contains('card-locked')) {
                    item.classList.remove('card-locked');
                    item.classList.add('card-unlocked-flip');
                }
            } else {
                item.classList.add('card-locked');
            }
        });

        const card9 = document.getElementById('card-lesson9');
        if (card9) {
            card9.style.display = hasCompletedAll([1, 2, 3, 4, 5, 6, 7, 8]) ? 'block' : 'none';
        }
    } finally {
        unlockCheckPending = false;
    }
}

export function showToast(message) {
    const existing = document.querySelector('.unlock-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'unlock-toast';
    toast.innerHTML = `
        <div class="toast-icon">🔓</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

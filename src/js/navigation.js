import { getCompletedLessons, validateLesson, markLessonCompleted } from './progress.js';
import {
    getNextAccessibleSectionId,
    getPreviousAccessibleSectionId,
    getSectionMeta,
    getSectionOrder,
    getSectionTitle,
    isSectionUnlocked,
    usesFooterNavigation
} from './course-manifest.js';

export const sectionOrder = getSectionOrder();
const CURRENT_SECTION_KEY = 'currentSection';

export function showSection(sectionId) {
    const completedLessons = getCompletedLessons();

    if (!isSectionUnlocked(sectionId, completedLessons)) {
        if (sectionId.startsWith('lesson')) {
            const lessonNum = getSectionMeta(sectionId)?.lessonNumber;
            if (lessonNum > 1 && lessonNum <= 8) {
                showLockedMessage(`第 ${lessonNum} 课还没有解锁。请先完成前面的课程。`);
            } else if (lessonNum === 9) {
                showLockedMessage('这一课还没有解锁。完成前八课后，它会自己出现。');
            }
        } else if (sectionId === 'capstone') {
            showLockedMessage('毕业项目还没有解锁。完成全部九课后再来。');
        }
        return;
    }

    document.querySelectorAll('.lesson-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        sessionStorage.setItem(CURRENT_SECTION_KEY, sectionId);
        const nextHash = sectionId === 'home' ? '' : `#${sectionId}`;
        const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
        window.history.replaceState(null, '', nextUrl);
        window.scrollTo(0, 0);
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.textContent = getSectionTitle(sectionId);
    }

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }

    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');
    const footer = document.getElementById('content-footer');
    const previousSectionId = getPreviousAccessibleSectionId(sectionId, completedLessons);
    const nextSectionId = getNextAccessibleSectionId(sectionId, completedLessons);
    const showFooterNavigation = usesFooterNavigation(sectionId);

    if (prevBtn) {
        prevBtn.style.display = showFooterNavigation && previousSectionId ? 'inline-block' : 'none';
    }
    
    if (nextBtn && footer) {
        if (showFooterNavigation && nextSectionId) {
            footer.style.display = 'block';
            nextBtn.textContent = sectionId === 'home' ? '开始学习 →' : '下一课 →';
        } else {
            footer.style.display = 'none';
        }
    }
}

function showLockedMessage(msg) {
    const existing = document.querySelector('.locked-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'unlock-toast locked-toast';
    toast.innerHTML = `
        <div class="toast-icon">🔒</div>
        <div class="toast-message">${msg}</div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

export function nextLesson() {
    const currentSection = document.querySelector('.lesson-section.active');
    if (!currentSection) return;

    const currentId = currentSection.id;
    if (!usesFooterNavigation(currentId)) {
        return;
    }
    
    if (currentId.startsWith('lesson')) {
        const lessonNum = parseInt(currentId.replace('lesson', ''));
        if (!getCompletedLessons().includes(lessonNum)) {
            if (validateLesson(lessonNum)) {
                markLessonCompleted(lessonNum);
                proceedToNext(currentId);
            } else {
                showLockedMessage('请先完成本课的练习，再进入下一课。');
            }
            return;
        }
    }

    proceedToNext(currentId);
}

function proceedToNext(currentId) {
    const nextSectionId = getNextAccessibleSectionId(currentId, getCompletedLessons());
    if (nextSectionId) {
        showSection(nextSectionId);
    }
}

export function prevLesson() {
    const currentSection = document.querySelector('.lesson-section.active');
    if (!currentSection) return;

    const currentId = currentSection.id;
    const previousSectionId = getPreviousAccessibleSectionId(currentId, getCompletedLessons());
    if (!usesFooterNavigation(currentId)) {
        return;
    }

    if (previousSectionId) {
        showSection(previousSectionId);
    }
}

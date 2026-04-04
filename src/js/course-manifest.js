import courseStructure from '../data/course-structure.json';

import homeHtml from '../lessons/home.html?raw';
import lesson1Html from '../lessons/lesson1.html?raw';
import lesson2Html from '../lessons/lesson2.html?raw';
import lesson3Html from '../lessons/lesson3.html?raw';
import lesson4Html from '../lessons/lesson4.html?raw';
import lesson5Html from '../lessons/lesson5.html?raw';
import lesson6Html from '../lessons/lesson6.html?raw';
import lesson7Html from '../lessons/lesson7.html?raw';
import lesson8Html from '../lessons/lesson8.html?raw';
import lesson9Html from '../lessons/lesson9.html?raw';
import electivesHtml from '../lessons/electives.html?raw';
import capstoneHtml from '../lessons/capstone.html?raw';
import cardsHtml from '../lessons/cards.html?raw';

const sectionContentMap = {
    home: homeHtml,
    lesson1: lesson1Html,
    lesson2: lesson2Html,
    lesson3: lesson3Html,
    lesson4: lesson4Html,
    lesson5: lesson5Html,
    lesson6: lesson6Html,
    lesson7: lesson7Html,
    lesson8: lesson8Html,
    lesson9: lesson9Html,
    electives: electivesHtml,
    capstone: capstoneHtml,
    cards: cardsHtml
};

export const courseSections = courseStructure.sections.map((section) => ({
    ...section,
    content: sectionContentMap[section.id] || ''
}));

export const courseCards = courseStructure.cards;
export const exerciseManifest = courseStructure.exercises;

function satisfiesUnlockRule(rule, completedLessons = []) {
    if (!rule || rule.type === 'always') {
        return true;
    }

    if (rule.type === 'completedLessons') {
        return (rule.lessons || []).every((lessonNum) => completedLessons.includes(lessonNum));
    }

    return true;
}

export function getRenderedSectionsHtml() {
    return courseSections.map((section) => section.content).join('');
}

export function getSectionOrder() {
    return courseSections.map((section) => section.id);
}

export function getSectionMeta(sectionId) {
    return courseSections.find((section) => section.id === sectionId) || null;
}

export function getSectionTitle(sectionId) {
    return getSectionMeta(sectionId)?.title || '叽乖技能课';
}

export function usesFooterNavigation(sectionId) {
    const section = getSectionMeta(sectionId);
    return section?.footerNavigation !== false;
}

export function getLessonNumber(sectionId) {
    return getSectionMeta(sectionId)?.lessonNumber || null;
}

export function isSectionUnlocked(sectionId, completedLessons = []) {
    const section = getSectionMeta(sectionId);
    return section ? satisfiesUnlockRule(section.unlock, completedLessons) : true;
}

export function isNavItemVisible(sectionId, completedLessons = []) {
    const section = getSectionMeta(sectionId);
    if (!section?.nav) {
        return false;
    }

    if (!section.nav.hiddenUntilUnlocked) {
        return true;
    }

    return isSectionUnlocked(sectionId, completedLessons);
}

export function getExercisesForLesson(sectionId) {
    return exerciseManifest[sectionId] || [];
}

export function getCardMeta(lessonNum) {
    return courseCards.find((card) => card.lesson === lessonNum) || null;
}

export function getNextAccessibleSectionId(currentId, completedLessons = []) {
    const sectionIds = getSectionOrder();
    const currentIndex = sectionIds.indexOf(currentId);

    for (let index = currentIndex + 1; index < sectionIds.length; index += 1) {
        const candidateId = sectionIds[index];
        if (isSectionUnlocked(candidateId, completedLessons)) {
            return candidateId;
        }
    }

    return null;
}

export function getPreviousAccessibleSectionId(currentId, completedLessons = []) {
    const sectionIds = getSectionOrder();
    const currentIndex = sectionIds.indexOf(currentId);

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
        const candidateId = sectionIds[index];
        if (isSectionUnlocked(candidateId, completedLessons)) {
            return candidateId;
        }
    }

    return null;
}

export function applyExerciseManifestToDom(root = document) {
    Object.entries(exerciseManifest).forEach(([lessonId, exercises]) => {
        const section = root.getElementById(lessonId);
        if (!section) {
            return;
        }

        const cards = section.querySelectorAll('.question-card');
        if (cards.length !== exercises.length) {
            console.warn(`Exercise manifest mismatch for ${lessonId}: expected ${exercises.length}, found ${cards.length}`);
        }

        cards.forEach((card, index) => {
            const exercise = exercises[index];
            if (!exercise) {
                return;
            }

            card.dataset.exerciseId = exercise.id;
            card.dataset.exerciseType = exercise.type;
            card.dataset.lessonId = lessonId;
        });
    });
}

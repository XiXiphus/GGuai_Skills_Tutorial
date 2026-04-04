import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const structurePath = path.join(projectRoot, 'src/data/course-structure.json');

const structure = JSON.parse(await readFile(structurePath, 'utf8'));
const sectionIds = structure.sections.map((section) => section.id);
const electives = structure.sections.find((section) => section.id === 'electives');
const cards = structure.sections.find((section) => section.id === 'cards');

function isSectionUnlocked(sectionId, completedLessons = []) {
    const section = structure.sections.find((entry) => entry.id === sectionId);
    if (!section || !section.unlock || section.unlock.type === 'always') {
        return true;
    }

    if (section.unlock.type === 'completedLessons') {
        return section.unlock.lessons.every((lessonNum) => completedLessons.includes(lessonNum));
    }

    return true;
}

function getNextAccessibleSectionId(currentId, completedLessons = []) {
    const currentIndex = sectionIds.indexOf(currentId);
    for (let index = currentIndex + 1; index < sectionIds.length; index += 1) {
        if (isSectionUnlocked(sectionIds[index], completedLessons)) {
            return sectionIds[index];
        }
    }

    return null;
}

function getPreviousAccessibleSectionId(currentId, completedLessons = []) {
    const currentIndex = sectionIds.indexOf(currentId);
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
        if (isSectionUnlocked(sectionIds[index], completedLessons)) {
            return sectionIds[index];
        }
    }

    return null;
}

assert.equal(getNextAccessibleSectionId('lesson8', []), 'electives');
assert.equal(getNextAccessibleSectionId('electives', []), 'cards');
assert.equal(getPreviousAccessibleSectionId('cards', []), 'electives');
assert.equal(getPreviousAccessibleSectionId('electives', [1, 2]), 'lesson3');
assert.equal(getNextAccessibleSectionId('lesson8', [1, 2, 3, 4, 5, 6, 7, 8]), 'lesson9');
assert.equal(getPreviousAccessibleSectionId('capstone', [1, 2, 3, 4, 5, 6, 7, 8, 9]), 'electives');
assert.equal(isSectionUnlocked('lesson9', [1, 2, 3, 4, 5, 6, 7]), false);
assert.equal(isSectionUnlocked('lesson9', [1, 2, 3, 4, 5, 6, 7, 8]), true);
assert.equal(isSectionUnlocked('capstone', [1, 2, 3, 4, 5, 6, 7, 8]), false);
assert.equal(isSectionUnlocked('capstone', [1, 2, 3, 4, 5, 6, 7, 8, 9]), true);
assert.equal(electives?.footerNavigation, false);
assert.equal(cards?.footerNavigation, false);

console.log('Course logic smoke tests passed.');

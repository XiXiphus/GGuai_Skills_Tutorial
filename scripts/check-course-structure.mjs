import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const structurePath = path.join(projectRoot, 'src/data/course-structure.json');
const indexPath = path.join(projectRoot, 'index.html');
const cardsPath = path.join(projectRoot, 'src/lessons/cards.html');

const structure = JSON.parse(await readFile(structurePath, 'utf8'));
const indexHtml = await readFile(indexPath, 'utf8');
const cardsHtml = await readFile(cardsPath, 'utf8');

const errors = [];

const sectionIds = structure.sections.map((section) => section.id);
if (new Set(sectionIds).size !== sectionIds.length) {
    errors.push('Section ids in course-structure.json must be unique.');
}

const exerciseTypeMatchers = {
    subjective: /class="text-answer"/g,
    choice: /onclick="gradeChoice\(this\)"/g,
    'details-read': /<details\b/g
};

for (const section of structure.sections) {
    const lessonPath = path.join(projectRoot, `src/lessons/${section.id}.html`);
    const lessonHtml = await readFile(lessonPath, 'utf8');

    if (!lessonHtml.includes(`id="${section.id}"`)) {
        errors.push(`${section.id}.html is missing section id "${section.id}".`);
    }

    if (section.nav?.itemId) {
        if (!indexHtml.includes(`id="${section.nav.itemId}"`)) {
            errors.push(`index.html is missing nav item "${section.nav.itemId}" for section "${section.id}".`);
        }

        if (!indexHtml.includes(`data-section="${section.id}"`)) {
            errors.push(`index.html is missing data-section="${section.id}" for nav routing.`);
        }

        if (section.nav.hiddenUntilUnlocked) {
            const navBlock = indexHtml.match(new RegExp(`<li[^>]*id="${section.nav.itemId}"[\\s\\S]*?<\\/li>`));
            if (!navBlock?.[0]?.includes('nav-hidden')) {
                errors.push(`Nav item "${section.nav.itemId}" should start hidden.`);
            }
        }
    }

    if (section.lessonNumber) {
        const manifestExercises = structure.exercises[section.id] || [];
        const questionCardCount = (lessonHtml.match(/class="question-card"/g) || []).length;
        if (questionCardCount !== manifestExercises.length) {
            errors.push(`${section.id}.html has ${questionCardCount} question cards, but the manifest declares ${manifestExercises.length}.`);
        }

        for (const [exerciseType, matcher] of Object.entries(exerciseTypeMatchers)) {
            const expected = manifestExercises.filter((exercise) => exercise.type === exerciseType).length;
            const actual = (lessonHtml.match(matcher) || []).length;
            if (expected !== actual) {
                errors.push(`${section.id}.html has ${actual} "${exerciseType}" markers, but the manifest expects ${expected}.`);
            }
        }
    }
}

for (const card of structure.cards) {
    if (!cardsHtml.includes(`data-lesson="${card.lesson}"`)) {
        errors.push(`cards.html is missing data-lesson="${card.lesson}".`);
    }

    if (!cardsHtml.includes(`data-modal-src="${card.image}"`)) {
        errors.push(`cards.html is missing modal target "${card.image}" for lesson ${card.lesson}.`);
    }

    if (!cardsHtml.includes(card.title)) {
        errors.push(`cards.html is missing card title "${card.title}".`);
    }
}

if (!cardsHtml.includes('id="card-lesson9"') || !cardsHtml.includes('display: none;')) {
    errors.push('Lesson 9 card should remain hidden by default in cards.html.');
}

if (errors.length > 0) {
    console.error('Course structure checks failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log('Course structure checks passed.');

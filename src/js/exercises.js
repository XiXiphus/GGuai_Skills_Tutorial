import { gradeWithKimi } from './kimi-grader.js';
import {
    markExerciseCompleted,
    markExerciseIncomplete,
    markExercisePending
} from './progress.js';

export async function gradeSubjective(btnElement, referenceAnswer) {
    const questionCard = btnElement.closest('.question-card');
    if (!questionCard) return;

    const questionText = questionCard.querySelector('.question-text').innerText;
    const textarea = questionCard.querySelector('.text-answer');
    const feedbackEl = questionCard.querySelector('.ai-feedback');
    const exerciseId = questionCard.dataset.exerciseId;
    if (!questionText || !textarea || !feedbackEl) return;
    
    const studentAnswer = textarea.value.trim();
    if (!studentAnswer) {
        alert('请先写下你的答案哦！');
        return;
    }

    btnElement.disabled = true;
    markExercisePending(exerciseId, {
        lessonId: questionCard.dataset.lessonId,
        type: questionCard.dataset.exerciseType || 'subjective',
        source: 'grader'
    });

    try {
        const result = await gradeWithKimi(questionText, referenceAnswer, studentAnswer, feedbackEl, textarea);
        if (result?.status === 'completed') {
            questionCard.classList.remove('unanswered');
            markExerciseCompleted(exerciseId, {
                lessonId: questionCard.dataset.lessonId,
                type: questionCard.dataset.exerciseType || 'subjective',
                source: result.mode || 'grader'
            });
        } else {
            markExerciseIncomplete(exerciseId, {
                lessonId: questionCard.dataset.lessonId,
                type: questionCard.dataset.exerciseType || 'subjective',
                status: result?.status || 'incomplete',
                source: result?.mode || 'grader'
            });
        }
    } catch (error) {
        console.error('Subjective grading failed:', error);
        markExerciseIncomplete(exerciseId, {
            lessonId: questionCard.dataset.lessonId,
            type: questionCard.dataset.exerciseType || 'subjective',
            status: 'error',
            source: 'grader'
        });
    } finally {
        btnElement.disabled = false;
    }
}

export function gradeChoice(btnElement) {
    const card = btnElement.closest('.question-card');
    if (!card) return;

    const options = card.querySelectorAll('input[type="radio"]');
    if (options.length === 0) return;

    const exerciseId = card.dataset.exerciseId;
    const exerciseType = card.dataset.exerciseType || 'choice';

    let answered = false;
    let isCorrect = false;

    options.forEach(opt => {
        const label = opt.closest('.option-label');
        if (!label) return;
        label.classList.remove('correct', 'incorrect', 'correct-unselected');
        
        if (opt.checked) {
            answered = true;
            if (opt.dataset.correct === 'true') {
                label.classList.add('correct');
                isCorrect = true;
            } else {
                label.classList.add('incorrect');
            }
        }
    });
    
    if (!answered) {
        card.classList.add('unanswered');
        markExerciseIncomplete(exerciseId, {
            lessonId: card.dataset.lessonId,
            type: exerciseType,
            status: 'unanswered',
            source: 'choice'
        });
        return;
    }

    // 只有答对才算完成，答错标记为未完成
    if (!isCorrect) {
        card.classList.add('unanswered');
        markExerciseIncomplete(exerciseId, {
            lessonId: card.dataset.lessonId,
            type: exerciseType,
            status: 'incorrect',
            source: 'choice'
        });
        // 显示错误反馈，但不显示正确答案（让用户自己再试）
        const scoreDisplay = card.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.innerHTML = `回答错误，请重新选择。`;
            scoreDisplay.style.color = '#d32f2f';
            scoreDisplay.style.display = 'block';
        }
        // 3秒后清除错误选择，让用户重新选择
        setTimeout(() => {
            options.forEach(opt => {
                opt.checked = false;
                const label = opt.closest('.option-label');
                if (label) {
                    label.classList.remove('correct', 'incorrect');
                }
            });
            if (scoreDisplay) {
                scoreDisplay.style.display = 'none';
            }
        }, 2000);
        return;
    }

    // 答对了，标记为完成
    card.classList.remove('unanswered');
    card.dataset.answeredCorrectly = 'true';
    markExerciseCompleted(exerciseId, {
        lessonId: card.dataset.lessonId,
        type: exerciseType,
        source: 'choice'
    });

    const scoreDisplay = card.querySelector('.score-display');
    if (scoreDisplay) {
        scoreDisplay.innerHTML = `回答正确！`;
        scoreDisplay.style.color = 'var(--success)';
        scoreDisplay.style.display = 'block';
    }
}

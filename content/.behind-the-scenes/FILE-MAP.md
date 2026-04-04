# File Map: 两堆文件

这套课程的文件分成两堆。

**第一堆**是上课过程中直接呈现给学员的。她从第 1 课看到第 8 课，只接触这些文件。

**第二堆**是用来生成第一堆的。它们是幕后工法、prompt 模板、生成日志、源文案和 HTML 源码。学员在前 8 课完全不知道这些文件的存在。

**直到第 9 课**，才把第二堆的存在揭示出来——让她意识到自己一直在 skills 生成的世界里学习 skills。

---

## 第一堆：上课呈现（她看到的）

### 每课的讲义、讲法、练习、卡片

| 课次                         | lesson.md | talk-track.md | exercise.md | card.png            |
| ---------------------------- | --------- | ------------- | ----------- | ------------------- |
| 01-what-is-a-skill           | ✓         | ✓             | ✓           | ✓                   |
| 02-ask-well                  | ✓         | ✓             | ✓           | ✓                   |
| 03-first-three-skills        | ✓         | ✓             | ✓           | ✓                   |
| 04-material-to-understanding | ✓         | ✓             | ✓           | ✓                   |
| 05-writing-for-someone       | ✓         | ✓             | ✓           | ✓                   |
| 06-card-and-delivery         | ✓         | ✓             | ✓           | ✓                   |
| 07-workflows                 | ✓         | ✓             | ✓           | ✓                   |
| 08-capstone-and-electives    | ✓         | ✓             | ✓           | ✓                   |
| 09-final-reveal              | ✓         | ✓             | —           | ✓ (card-manual.png) |

### 第 8 课额外文件（也呈现）

- `08-capstone-and-electives/capstone.md` — 毕业项目说明书
- `08-capstone-and-electives/electives-map.md` — 选修技能导航图

### 第 9 课额外文件（也呈现）

- `09-final-reveal/reflection.md` — 给设计者的备注（揭示后才看）

### 根目录（呈现）

- `README.md` — 课程说明
- `01-course-map.md` — 课程大纲与排序逻辑

---

## 第二堆：生成它们的（幕后工法）

这些文件在前 8 课对学员完全隐藏。第 9 课揭示后，可以选择性展示。

### Prompt 模板（驱动 Claude 生成每课内容的指令）

- `00-global-style.md` — 全课程统一教师设定
- `00-master-prompt.md` — 给 Claude 的总控 prompt
- `01-what-is-a-skill/PROMPT.md`
- `02-ask-well/PROMPT.md`
- `03-first-three-skills/PROMPT.md`
- `04-material-to-understanding/PROMPT.md`
- `05-writing-for-someone/PROMPT.md`
- `06-card-and-delivery/PROMPT.md`
- `07-workflows/PROMPT.md`
- `08-capstone-and-electives/PROMPT.md`

### 卡片源文案（喂给 ljg-card 的原矿）

- `01-what-is-a-skill/card-input.md`
- `02-ask-well/card-input.md`
- `03-first-three-skills/card-input.md`
- `04-material-to-understanding/card-input.md`
- `05-writing-for-someone/card-input.md`
- `06-card-and-delivery/card-input.md`
- `07-workflows/card-input.md`
- `09-final-reveal/card-input.md`

### 卡片 HTML 源码（手工铸卡的版式源文件）

- `01-what-is-a-skill/card.html`
- `02-ask-well/card.html`
- `03-first-three-skills/card.html`
- `04-material-to-understanding/card.html`
- `05-writing-for-someone/card.html`
- `06-card-and-delivery/card.html`
- `07-workflows/card.html`
- `08-capstone-and-electives/card.html`
- `09-final-reveal/card-manual.html`

### 生成日志（Claude 批量生成课程内容的运行记录）

- `.runlogs/01-what-is-a-skill.log`
- `.runlogs/02-ask-well.log`
- `.runlogs/03-first-three-skills.log`
- `.runlogs/04-material-to-understanding.log`
- `.runlogs/05-writing-for-someone.log`
- `.runlogs/06-card-and-delivery.log`
- `.runlogs/07-workflows.log`
- `.runlogs/08-capstone-and-electives.log`
- `.runlogs/99-editorial-review.log`
- `.runlogs/cards/*.log`

### 审校笔记（总审校 Claude 的修改记录）

- `99-editorial-notes.md`

---

## 揭示逻辑

前 8 课：学员只接触第一堆。她以为这些讲义、练习和卡片是"某个人写的"。

第 9 课（看见布线）：点破第二堆的存在。让她意识到：

- 课程骨架是用 `ljg-rank` 砍出来的
- 概念解释是用 `ljg-plain` 过的
- 口语讲法是用 `ljg-writes` 调的
- 卡片是用 `ljg-card` 铸的
- 每课的生成都有一个 `PROMPT.md` 在驱动

她不是只在学 skills。她是在 skills 生成的世界里，被 skills 教会怎么使用 skills。

如果她想更深地看，可以打开第二堆里的任何一个文件，亲眼看到"布线图"。

# Girlfriend Skills Course

这是一套给零基础伴侣使用的 `Claude Code + ljg-skills` 课程骨架。

它不讲插件内部原理，不追求“把所有 skill 一次学完”，而是追求三件事：

1. 先建立正确的心智模型，知道 skill 到底是什么。
2. 再学会几把最有杠杆的工具：`ljg-rank`、`ljg-plain`、`ljg-learn`、`ljg-writes`、`ljg-card`。
3. 最后能把它们串成自己的小工作流，用来理解、表达、做卡片、准备分享。

## How To Use

1. 用普通 `claude` 打开这个目录。
2. 不要用 `claude --bare`，否则本地 skills 可能会失效。
3. 如果想整套课程一次性填充，先把 `00-master-prompt.md` 发给 Claude。
4. 如果想只做某一课，进入对应课次目录，把里面的 `PROMPT.md` 发给 Claude。
5. 每个课次的 prompt 都会要求 Claude 在当前目录里直接写出课程文件。

## Root Files

- `00-global-style.md`: 全课程统一教师设定
- `00-master-prompt.md`: 给 Claude 的总控 prompt
- `01-course-map.md`: 课程大纲与排序逻辑

## Lesson Folders

- `01-what-is-a-skill`
- `02-ask-well`
- `03-first-three-skills`
- `04-material-to-understanding`
- `05-writing-for-someone`
- `06-card-and-delivery`
- `07-workflows`
- `08-capstone-and-electives`
- `09-final-reveal`

## Default Outputs For Most Lessons

除非某课另有说明，否则每课默认生成：

- `lesson.md`: 讲义版
- `talk-track.md`: 口语讲法版
- `exercise.md`: 练习和提问
- `card-input.md`: 后续可交给 `ljg-card` 的卡片文案源

## Teaching Goal

这套课默认面向：

- 聪明但零基础的人
- 想先会用，再慢慢懂原理的人
- 不喜欢技术腔、命令腔、说教腔的人

这套课最终想达成的是：

- 她知道什么时候该用 skill，什么时候不用
- 她会把模糊想法变成清晰请求
- 她会把材料变成理解，再把理解变成能说给别人听的话
- 她能做出一张不尴尬、看得懂、愿意发给朋友的卡片

// 等距分配分數
function distributeScores(min, max, numberOfPeople) {
    const scores = [];
    const step = (max - min) / (numberOfPeople - 1); // 每個人之間的分數差

    for (let i = 0; i < numberOfPeople; i++) {
        const score = max - i * step; // 根據順序，從高到低分配
        scores.push(score.toFixed(2)); // 保存分數，保留兩位小數(轉換字串)
    }

    return scores;
}
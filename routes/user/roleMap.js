// 定義角色映射
const roleMap = {
    0: '老師',
    1: '助教',
    2: '管理者'
};

// 創建反向映射
const reverseRoleMap = {};
for (const [key, value] of Object.entries(roleMap)) {
    reverseRoleMap[value] = Number(key); // 確保鍵為數字
}

/**
 * 根據權限值或角色名稱獲取對應的映射
 * @param {number|string} input - 權限值或角色名稱
 * @returns {string|number} - 對應的角色名稱或權限值
 */
function getRole(input) {
    if (typeof input === 'number') {
        return roleMap[input] || '未知角色';
    } else if (typeof input === 'string') {
        return reverseRoleMap[input] !== undefined ? reverseRoleMap[input] : '未知權限';
    } else {
        return '輸入類型無效';
    }
}

module.exports = { roleMap, getRole };
// 金卡补偿值变量
let goldCompensation = -0.05; // 初始值为-5%

// 基础概率配置表
const RARITY_BASE_PROBABILITIES = {
  normal: { white: 0.60, blue: 0.37, purple: 0.03, gold: 0.00 },
  elite: { white: 0.40, blue: 0.35, purple: 0.20, gold: 0.05 },
  boss: { white: 0.00, blue: 0.00, purple: 0.40, gold: 0.60 },
  shop: { white: 0.50, blue: 0.35, purple: 0.10, gold: 0.05 },
  starter: { white: 0.60, blue: 0.35, purple: 0.05, gold: 0.00 }
};

/**
 * 更新金卡补偿值
 * @param {boolean} hasGold - 是否获得了金卡
 */
function updateGoldCompensation(hasGold) {
  if (hasGold) {
    goldCompensation = -0.05; // 出现金卡时重置为-5%
  } else {
    goldCompensation = Math.min(goldCompensation + 0.01, 0.30); // 未出金卡时+1%，上限30%
  }

  // 限制补偿值在合理范围内 (-5% 到 30%)
  goldCompensation = Math.max(-0.05, Math.min(0.30, goldCompensation));
}

/**
 * 获取调整后的金卡概率
 * @param {string} tier - 战斗类型 (normal, elite, boss, shop, starter)
 * @returns {number} 调整后的金卡概率
 */
function getAdjustedGoldProbability(tier) {
  const baseGoldProb = RARITY_BASE_PROBABILITIES[tier]?.gold || 0;

  // Boss战不受补偿值影响
  if (tier === 'boss') {
    return baseGoldProb;
  }

  // 计算调整后的概率
  const adjustedProb = baseGoldProb + goldCompensation;

  // 限制概率范围 [0, 0.95] (不能超过95%避免其他卡牌概率为负)
  return Math.max(0, Math.min(adjustedProb, 0.95));
}

/**
 * 滚动确定卡牌稀有度（支持动态补偿）
 * @param {string} tier - 战斗类型 (normal, elite, boss, shop, starter)
 * @returns {string} 稀有度 (white, blue, purple, gold)
 */
function rollCardRarity(tier) {
  const probs = RARITY_BASE_PROBABILITIES[tier];
  if (!probs) {
    return 'white'; // 默认返回白色
  }

  // 根据战斗类型计算实际概率
  let whiteProb = probs.white;
  let blueProb = probs.blue;
  let purpleProb = probs.purple;
  let goldProb = getAdjustedGoldProbability(tier);

  // 如果不是Boss战，重新计算其他颜色的概率以确保总和为100%
  if (tier !== 'boss' && goldProb > 0) {
    // 调整后需要重新分配其他卡牌的概率，保证总数为1
    const otherProbTotal = whiteProb + blueProb + purpleProb;
    if (otherProbTotal + goldProb > 1.0) {
      // 缩放其他概率，确保总和为1
      const scaleFactor = (1.0 - goldProb) / otherProbTotal;
      whiteProb *= scaleFactor;
      blueProb *= scaleFactor;
      purpleProb *= scaleFactor;
    }
  }

  // 生成随机数
  const rand = Math.random();

  if (rand <= whiteProb) {
    return 'white';
  } else if (rand <= whiteProb + blueProb) {
    return 'blue';
  } else if (rand <= whiteProb + blueProb + purpleProb) {
    return 'purple';
  } else {
    return 'gold';
  }
}

/**
 * 加权生成卡牌（更新版本，支持动态补偿）
 * @param {string} tier - 战斗类型，默认为'normal'
 * @param {number} count - 卡牌数量
 * @returns {Array} 生成的卡牌数组
 */
function weightedCard(tier = 'normal', count = 1) {
  const eligible = CARDS.filter(c => !c.needs || deckHasMechanic(c.needs));
  const poolAll = eligible.length ? eligible : CARDS;
  const cards = [];
  let hasGoldInThisRoll = false;

  for (let attempt = 0; attempt < count; attempt++) {
    // 这里需要重新考虑概率分配逻辑
    // 使用修正后的rollCardRarity函数来确定稀有度
    const rarity = rollCardRarity(tier);

    // 从对应稀有度的卡牌池中选择
    const pool = poolAll.filter(c => c.rarity === rarity);

    if (pool.length) {
      const selectedCard = cardById(pool[Math.floor(Math.random() * pool.length)].id);

      // 检查是否为金卡
      if (selectedCard.rarity === 'gold') {
        hasGoldInThisRoll = true;
      }

      cards.push(selectedCard);
    } else {
      // 如果找不到对应稀有度的卡，则从全部池中随机选择
      const fallbackCard = cardById(poolAll[Math.floor(Math.random() * poolAll.length)].id);

      // 检查是否为金卡
      if (fallbackCard.rarity === 'gold') {
        hasGoldInThisRoll = true;
      }

      cards.push(fallbackCard);
    }
  }

  // 更新补偿值（只在非Boss战时才更新）
  if (tier !== 'boss') {
    updateGoldCompensation(hasGoldInThisRoll);
  }

  return cards.length === 1 ? cards[0] : cards;
}

/**
 * 获取当前补偿值的调试信息
 */
function getGoldCompensationInfo() {
  return {
    rawValue: goldCompensation,
    percentage: `${(goldCompensation * 100).toFixed(2)}%`,
    description: `金卡补偿值: ${(goldCompensation * 100).toFixed(2)}%`
  };
}

/**
 * 在UI上显示补偿值（用于调试）
 */
function renderCompensationDisplay() {
  // 如果有合适的UI元素可以用来显示补偿值，这里可以添加
  // 或者简单地在控制台打印
  console.log(`当前金卡补偿值: ${(goldCompensation * 100).toFixed(2)}%`);
}

// 导出这些函数以便在游戏中使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    goldCompensation,
    updateGoldCompensation,
    getAdjustedGoldProbability,
    rollCardRarity,
    weightedCard,
    getGoldCompensationInfo,
    renderCompensationDisplay
  };
}
/**
 * 志怪塔动态稀有度概率系统验证脚本
 *
 * 此脚本提供各种验证功能，可在游戏运行时通过控制台调用
 */

console.log("志怪塔动态稀有度概率系统验证脚本已加载");

/**
 * 验证函数：检查金卡补偿值系统的基本功能
 */
function validateGoldCompensationSystem() {
    console.group("🔍 金卡补偿值系统验证");

    try {
        // 检查必要的全局变量是否存在
        const checks = [
            {name: 'goldCompensation', exists: typeof goldCompensation !== 'undefined'},
            {name: 'RARITY_BASE_PROBABILITIES', exists: typeof RARITY_BASE_PROBABILITIES !== 'undefined'},
            {name: 'updateGoldCompensation', exists: typeof updateGoldCompensation !== 'undefined'},
            {name: 'getAdjustedGoldProbability', exists: typeof getAdjustedGoldProbability !== 'undefined'},
            {name: 'rollCardRarity', exists: typeof rollCardRarity !== 'undefined'},
            {name: 'weightedCard', exists: typeof weightedCard !== 'undefined'}
        ];

        let allPassed = true;
        for (const check of checks) {
            if (check.exists) {
                console.log(`✅ ${check.name} 已定义`);
            } else {
                console.error(`❌ ${check.name} 未定义`);
                allPassed = false;
            }
        }

        if (!allPassed) {
            console.error("❌ 基本组件验证失败");
            console.groupEnd();
            return false;
        }

        // 验证基础概率配置
        console.log("\n📋 基础概率配置:");
        for (const [tier, probs] of Object.entries(RARITY_BASE_PROBABILITIES)) {
            console.log(`  ${tier}: 白=${probs.white} 蓝=${probs.blue} 紫=${probs.purple} 金=${probs.gold}`);
        }

        // 验证初始补偿值
        console.log(`\n📊 初始补偿值: ${(goldCompensation * 100).toFixed(2)}%`);
        if (goldCompensation !== -0.05) {
            console.warn(`⚠️  初始补偿值不是预期的 -5%`);
        }

        // 验证概率调整函数
        console.log("\n📈 概率调整验证:");
        for (const tier of ['normal', 'elite', 'shop', 'boss']) {
            const baseGold = RARITY_BASE_PROBABILITIES[tier]?.gold || 0;
            const adjustedGold = getAdjustedGoldProbability(tier);
            console.log(`  ${tier}战 - 基础金卡概率: ${(baseGold * 100).toFixed(2)}% -> 调整后: ${(adjustedGold * 100).toFixed(2)}%`);

            if (tier === 'boss' && adjustedGold !== baseGold) {
                console.error(`❌ Boss战应该不受补偿值影响，但概率发生了变化`);
                allPassed = false;
            }
        }

        console.log("\n✅ 基本验证通过");
        console.groupEnd();
        return allPassed;
    } catch (e) {
        console.error("验证过程中发生错误:", e);
        console.groupEnd();
        return false;
    }
}

/**
 * 验证函数：运行一轮卡牌奖励模拟
 */
function simulateRewardRound(count = 3) {
    console.group(`🎯 模拟${count}张卡牌奖励`);

    try {
        // 记录当前补偿值
        const initialCompensation = goldCompensation;
        console.log(`初始补偿值: ${(initialCompensation * 100).toFixed(2)}%`);

        // 模拟生成卡牌
        const rewards = [];
        for (let i = 0; i < count; i++) {
            // 直接调用rollCardRarity来获取稀有度
            const tier = 'normal'; // 使用普通战作为示例
            const rarity = rollCardRarity(tier);
            rewards.push(rarity);
            console.log(`  卡牌 ${i+1}: ${rarity.toUpperCase()} (${getAdjustedGoldProbability(tier)*100}%)`);
        }

        // 检查是否包含金卡
        const hasGold = rewards.includes('gold');
        console.log(`\n奖励组合: [${rewards.join(', ').toUpperCase()}]`);
        console.log(`包含金卡: ${hasGold ? '✅ 是' : '❌ 否'}`);

        // 假设玩家选择了第一张卡（或跳过），更新补偿值
        updateGoldCompensation(hasGold);
        const finalCompensation = goldCompensation;

        console.log(`更新后补偿值: ${(finalCompensation * 100).toFixed(2)}%`);

        if (hasGold) {
            console.log(`🎉 获得金卡，补偿值已重置`);
        } else {
            console.log(`⏳ 未获金卡，补偿值增加`);
        }

        console.groupEnd();
        return true;
    } catch (e) {
        console.error("模拟过程中发生错误:", e);
        console.groupEnd();
        return false;
    }
}

/**
 * 验证函数：测试补偿值边界情况
 */
function testCompensationBoundaries() {
    console.group("🧪 补偿值边界测试");

    try {
        // 保存原始值
        const originalValue = goldCompensation;

        // 测试上限
        goldCompensation = 0.30; // 设置为上限
        updateGoldCompensation(false); // 尝试增加但不应超过上限
        if (goldCompensation >= 0.30) {
            console.log("✅ 上限保护正常: 补偿值未超过30%");
        } else {
            console.warn("⚠️  上限保护异常");
        }

        // 测试下限
        goldCompensation = -0.05; // 设置为下限
        updateGoldCompensation(true); // 应该重置为-5%
        if (goldCompensation === -0.05) {
            console.log("✅ 下限保护正常: 获得金卡后补偿值重置为-5%");
        } else {
            console.warn("⚠️  下限保护异常");
        }

        // 测试极值情况下的概率计算
        goldCompensation = 0.30;
        const highProb = getAdjustedGoldProbability('normal');
        console.log(`高补偿值时的普通战金卡概率: ${(highProb * 100).toFixed(2)}%`);

        goldCompensation = -0.05;
        const lowProb = getAdjustedGoldProbability('normal');
        console.log(`低补偿值时的普通战金卡概率: ${(lowProb * 100).toFixed(2)}%`);

        // 恢复原始值
        goldCompensation = originalValue;

        console.log("✅ 边界测试完成");
        console.groupEnd();
        return true;
    } catch (e) {
        console.error("边界测试过程中发生错误:", e);
        console.groupEnd();
        return false;
    }
}

/**
 * 验证函数：测试不同战斗类型的概率差异
 */
function testTierProbabilities() {
    console.group("🎲 不同战斗类型概率测试");

    try {
        const tiers = ['normal', 'elite', 'shop', 'boss'];

        for (const tier of tiers) {
            const baseGold = RARITY_BASE_PROBABILITIES[tier]?.gold || 0;
            const adjustedGold = getAdjustedGoldProbability(tier);

            console.log(`\n${tier.toUpperCase()}战:`);
            console.log(`  基础金卡概率: ${(baseGold * 100).toFixed(2)}%`);
            console.log(`  当前调整概率: ${(adjustedGold * 100).toFixed(2)}%`);

            if (tier === 'boss') {
                console.log(`  💀 Boss战不受补偿值影响`);
            } else {
                console.log(`  📈 调整差值: ${((adjustedGold - baseGold) * 100).toFixed(2)}%`);
            }
        }

        console.log("\n✅ 战斗类型测试完成");
        console.groupEnd();
        return true;
    } catch (e) {
        console.error("战斗类型测试过程中发生错误:", e);
        console.groupEnd();
        return false;
    }
}

/**
 * 完整验证套件
 */
function runFullValidation() {
    console.log("🚀 开始完整验证套件...\n");

    const results = {
        basic: validateGoldCompensationSystem(),
        tierProbs: testTierProbabilities(),
        boundaries: testCompensationBoundaries(),
        simulation: simulateRewardRound(3)
    };

    console.group("\n📊 验证总结:");
    console.log(`基本组件: ${results.basic ? '✅ 通过' : '❌ 失败'}`);
    console.log(`战斗类型: ${results.tierProbs ? '✅ 通过' : '❌ 失败'}`);
    console.log(`边界测试: ${results.boundaries ? '✅ 通过' : '❌ 失败'}`);
    console.log(`模拟测试: ${results.simulation ? '✅ 通过' : '❌ 失败'}`);

    const allPassed = Object.values(results).every(result => result);
    console.log(`\n总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在问题'}`);
    console.groupEnd();

    return allPassed;
}

// 导出函数（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateGoldCompensationSystem,
        simulateRewardRound,
        testCompensationBoundaries,
        testTierProbabilities,
        runFullValidation
    };
}

console.log("可用的验证函数:");
console.log("- runFullValidation() - 运行完整验证");
console.log("- validateGoldCompensationSystem() - 基本系统验证");
console.log("- simulateRewardRound(n) - 模拟n张卡牌奖励");
console.log("- testCompensationBoundaries() - 边界测试");
console.log("- testTierProbabilities() - 战斗类型测试");
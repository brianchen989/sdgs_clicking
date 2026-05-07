let score = 0;
let totalScore = 0; // 用於計算總累積點數，控制背景進度

// 技能與加成狀態
let activeSkills = {
    windTurbine: {
        active: false,
        timer: 0,
        cooldown: 0,
        maxDuration: 0,
        maxCooldown: 0
    },
    researchCenter: {
        active: false,
        timer: 0,
        cooldown: 0,
        maxDuration: 15,
        maxCooldown: 90
    }
};

// 五個 SDG 升級項目
const upgrades = {
    volunteer: { name: '環保志工', baseCost: 15, costMult: 1.15, count: 0, image: 'images/volunteer.png', desc: '+1 點/點擊' },
    garden: { name: '社區菜園', baseCost: 100, costMult: 1.15, count: 0, image: 'images/garden.png', desc: '+5 IPS' },
    wind_turbine: { name: '離岸風機', baseCost: 1000, costMult: 1.25, count: 0, image: 'images/wind turbine.png', desc: '解鎖主動：點擊x2' },
    sea_saver: { name: '海洋清理船', baseCost: 5000, costMult: 1.30, count: 0, image: 'images/sea saver.png', desc: '解鎖：隨機大獎' },
    research_center: { name: '研究中心', baseCost: 20000, costMult: 1.40, count: 0, image: 'images/research center.png', desc: '解鎖主動：IPS加倍' }
};

const upgradeKeys = Object.keys(upgrades);

const scoreEl = document.getElementById('score');
const ipsEl = document.getElementById('ips');
const earthBtn = document.getElementById('earth-btn');
const earthImg = document.getElementById('earth-img');
const upgradesContainer = document.getElementById('upgrades-container');
const progressBackground = document.getElementById('progress-background');
const skillsSection = document.getElementById('skills-section');

// 計算每次點擊的威力
function getClickingPower() {
    let power = 1 + upgrades.volunteer.count;
    // 等級 25 里程碑：額外 +10%
    if (upgrades.volunteer.count >= 25) {
        power *= 1.1;
    }
    // 風機主動技能加成
    if (activeSkills.windTurbine.active) {
        power *= 2;
    }
    return Math.max(1, Math.floor(power));
}

// 計算每秒產出 (IPS)
function getIPS() {
    let currentIps = upgrades.garden.count * 5;
    // 等級 50 里程碑：IPS 永久 2 倍
    if (upgrades.garden.count >= 50) {
        currentIps *= 2;
    }
    // 研究中心主動技能加成
    if (activeSkills.researchCenter.active) {
        // 高等級效果 (例如 10 級以上變 3 倍)
        let multiplier = (upgrades.research_center.count >= 10) ? 3 : 2;
        currentIps *= multiplier;
    }
    return currentIps;
}

// 初始化商店
function initStore() {
    upgradesContainer.innerHTML = '';
    upgradeKeys.forEach((key) => {
        const upgrade = upgrades[key];
        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
        const card = document.createElement('div');
        card.className = `upgrade-card ${score >= cost ? '' : 'disabled'}`;
        card.id = `upgrade-${key}`;
        card.onclick = () => buyUpgrade(key);

        card.innerHTML = `
            <img src="${upgrade.image}" alt="${upgrade.name}" class="upgrade-icon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMzMzMiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRA==';">
            <div class="upgrade-info">
                <p class="upgrade-name">${upgrade.name}</p>
                <p class="upgrade-cost" id="cost-${key}">💰 ${cost}</p>
                <p class="upgrade-ips">${upgrade.desc}</p>
            </div>
            <div class="upgrade-count" id="count-${key}">${upgrade.count}</div>
        `;
        upgradesContainer.appendChild(card);
    });
}

// 初始化技能區
function initSkills() {
    skillsSection.innerHTML = `
        <div id="skill-wind" class="skill-btn locked" onclick="activateWindTurbine()">
            <img src="images/wind turbine.png" class="skill-icon">
            <div id="skill-wind-cd" class="skill-cooldown-overlay"></div>
            <div id="skill-wind-text" class="skill-timer-text"></div>
        </div>
        <div id="skill-research" class="skill-btn locked" onclick="activateResearchCenter()">
            <img src="images/research center.png" class="skill-icon">
            <div id="skill-research-cd" class="skill-cooldown-overlay"></div>
            <div id="skill-research-text" class="skill-timer-text"></div>
        </div>
    `;
}

// 更新畫面
function updateDisplay() {
    scoreEl.innerText = Math.floor(score);
    ipsEl.innerText = getIPS().toFixed(1);

    // 更新商店按鈕狀態與價格
    upgradeKeys.forEach((key) => {
        const upgrade = upgrades[key];
        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
        const card = document.getElementById(`upgrade-${key}`);
        const costEl = document.getElementById(`cost-${key}`);
        const countEl = document.getElementById(`count-${key}`);

        if (card && costEl && countEl) {
            costEl.innerText = `💰 ${cost}`;
            countEl.innerText = upgrade.count;
            if (score >= cost) {
                card.classList.remove('disabled');
            } else {
                card.classList.add('disabled');
            }
        }
    });

    updateSkillsDisplay();
    updateBackground();
}

// 技能顯示更新
function updateSkillsDisplay() {
    // 風機技能
    const windBtn = document.getElementById('skill-wind');
    const windCd = document.getElementById('skill-wind-cd');
    const windText = document.getElementById('skill-wind-text');
    if (upgrades.wind_turbine.count > 0 && windBtn) {
        windBtn.classList.remove('locked');
        if (activeSkills.windTurbine.active) {
            windBtn.classList.add('active');
            windBtn.classList.remove('disabled');
            windCd.style.height = '0%';
            windText.innerText = Math.ceil(activeSkills.windTurbine.timer) + 's';
        } else if (activeSkills.windTurbine.cooldown > 0) {
            windBtn.classList.remove('active');
            windBtn.classList.add('disabled');
            windCd.style.height = (activeSkills.windTurbine.cooldown / activeSkills.windTurbine.maxCooldown * 100) + '%';
            windText.innerText = Math.ceil(activeSkills.windTurbine.cooldown);
        } else {
            windBtn.classList.remove('active', 'disabled');
            windCd.style.height = '0%';
            windText.innerText = '就緒';
        }
    }

    // 研究中心技能
    const resBtn = document.getElementById('skill-research');
    const resCd = document.getElementById('skill-research-cd');
    const resText = document.getElementById('skill-research-text');
    if (upgrades.research_center.count > 0 && resBtn) {
        resBtn.classList.remove('locked');
        if (activeSkills.researchCenter.active) {
            resBtn.classList.add('active');
            resBtn.classList.remove('disabled');
            resCd.style.height = '0%';
            resText.innerText = Math.ceil(activeSkills.researchCenter.timer) + 's';
        } else if (activeSkills.researchCenter.cooldown > 0) {
            resBtn.classList.remove('active');
            resBtn.classList.add('disabled');
            resCd.style.height = (activeSkills.researchCenter.cooldown / activeSkills.researchCenter.maxCooldown * 100) + '%';
            resText.innerText = Math.ceil(activeSkills.researchCenter.cooldown);
        } else {
            resBtn.classList.remove('active', 'disabled');
            resCd.style.height = '0%';
            resText.innerText = '就緒';
        }
    }
}

// 購買升級
function buyUpgrade(key) {
    const upgrade = upgrades[key];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));

    if (score >= cost) {
        score -= cost;
        upgrade.count++;

        // 點擊購買時的特效
        const card = document.getElementById(`upgrade-${key}`);
        if (card) {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.style.transform = '', 150);
        }

        updateDisplay();
    }
}

// 主動技能：離岸風機
function activateWindTurbine() {
    if (upgrades.wind_turbine.count > 0 && !activeSkills.windTurbine.active && activeSkills.windTurbine.cooldown <= 0) {
        activeSkills.windTurbine.active = true;
        // Lv 1: 持續 20s / 冷卻 60s
        let level = upgrades.wind_turbine.count;
        let duration = 20 + (level - 1) * 1.1; // Lv10 約 30s
        let cd = 60 - (level - 1) * 1.66; // Lv10 約 45s

        activeSkills.windTurbine.maxDuration = duration;
        activeSkills.windTurbine.timer = duration;
        activeSkills.windTurbine.maxCooldown = Math.max(10, cd); // 最小冷卻 10s
        updateSkillsDisplay();
    }
}

// 主動技能：研究中心
function activateResearchCenter() {
    if (upgrades.research_center.count > 0 && !activeSkills.researchCenter.active && activeSkills.researchCenter.cooldown <= 0) {
        activeSkills.researchCenter.active = true;
        activeSkills.researchCenter.maxDuration = 15;
        activeSkills.researchCenter.timer = 15;
        activeSkills.researchCenter.maxCooldown = 90;
        updateSkillsDisplay();
    }
}

// 隨機事件：海洋清理船
function trySpawnSeaSaver() {
    if (upgrades.sea_saver.count > 0) {
        // 出現頻率受等級影響：每秒基礎 1% 機率，每級增加 0.5% (每次迴圈是 0.1s，所以機率除以 10)
        const chance = (0.01 + (upgrades.sea_saver.count * 0.005)) / 10;
        if (Math.random() < chance && !document.querySelector('.sea-saver-ship')) {
            spawnSeaSaver();
        }
    }
}

function spawnSeaSaver() {
    const ship = document.createElement('img');
    ship.src = 'images/sea saver no background.png';
    ship.className = 'sea-saver-ship';

    // 隨機垂直位置 (20vh ~ 80vh)
    ship.style.top = (20 + Math.random() * 60) + 'vh';

    ship.onclick = (e) => {
        // 點擊後獲得獎勵： Math.max(100, IPS * 180)
        let reward = Math.floor(Math.max(100, getIPS() * 180));
        score += reward;
        totalScore += reward;

        // 顯示獎勵文字
        showFloatingText(e, `+${reward} 💰大豐收!`, '#ffb74d');

        // 移除船隻
        ship.remove();
        updateDisplay();
    };

    document.body.appendChild(ship);

    // 動畫結束後自動移除 (設定 15s)
    setTimeout(() => {
        if (ship.parentElement) ship.remove();
    }, 15000);
}

// 點擊地球
earthBtn.addEventListener('click', (e) => {
    let power = getClickingPower();
    score += power;
    totalScore += power;
    updateDisplay();
    showFloatingText(e, `+${power}`, '#fff');
});

// 遊戲迴圈 (每 100ms)
setInterval(() => {
    // 處理自動產量
    const currentIps = getIPS();
    if (currentIps > 0) {
        score += currentIps / 10;
        totalScore += currentIps / 10;
    }

    // 處理技能倒數 - 風機
    if (activeSkills.windTurbine.active) {
        activeSkills.windTurbine.timer -= 0.1;
        if (activeSkills.windTurbine.timer <= 0) {
            activeSkills.windTurbine.active = false;
            activeSkills.windTurbine.cooldown = activeSkills.windTurbine.maxCooldown;
        }
    } else if (activeSkills.windTurbine.cooldown > 0) {
        activeSkills.windTurbine.cooldown -= 0.1;
    }

    // 處理技能倒數 - 研究中心
    if (activeSkills.researchCenter.active) {
        activeSkills.researchCenter.timer -= 0.1;
        if (activeSkills.researchCenter.timer <= 0) {
            activeSkills.researchCenter.active = false;
            activeSkills.researchCenter.cooldown = activeSkills.researchCenter.maxCooldown;
        }
    } else if (activeSkills.researchCenter.cooldown > 0) {
        activeSkills.researchCenter.cooldown -= 0.1;
    }

    trySpawnSeaSaver();
    updateDisplay();
}, 100);

// 漂浮文字特效
function showFloatingText(e, msg, color) {
    const text = document.createElement('div');
    text.className = 'floating-text';
    text.innerText = msg;
    text.style.color = color || '#fff';

    // 隨機在點擊位置附近產生
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 60;

    text.style.left = `${e.clientX + offsetX}px`;
    text.style.top = `${e.clientY + offsetY}px`;

    document.body.appendChild(text);

    setTimeout(() => {
        text.remove();
    }, 1000);
}

// 更新背景進度與地球圖片
function updateBackground() {
    const maxScore = 50000;
    let progress = Math.min(totalScore / maxScore, 1);

    const skyR = Math.floor(74 + (135 - 74) * progress);
    const skyG = Math.floor(74 + (206 - 74) * progress);
    const skyB = Math.floor(74 + (235 - 74) * progress);

    const groundR = Math.floor(43 + (129 - 43) * progress);
    const groundG = Math.floor(43 + (199 - 43) * progress);
    const groundB = Math.floor(43 + (132 - 43) * progress);

    progressBackground.style.background = `linear-gradient(to bottom, rgb(${skyR}, ${skyG}, ${skyB}), rgb(${groundR}, ${groundG}, ${groundB}))`;

    if (progress < 0.33) {
        earthImg.src = 'images/earth1.png';
    } else if (progress < 0.66) {
        earthImg.src = 'images/earth2.png';
    } else {
        earthImg.src = 'images/earth3.png';
    }
}

// 啟動遊戲
initStore();
initSkills();
updateDisplay();

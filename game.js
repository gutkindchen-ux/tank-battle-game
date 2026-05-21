// 游戏配置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// 游戏状态
let gameState = 'waiting'; // waiting, playing, paused, gameOver
let playerScore = 0;
let currentLevel = 1;
let enemyTankCount = 5;
let animationId = null;
let baseHealth = 5; // 老家生命值

// 游戏对象类
class Tank {
    constructor(x, y, color, direction = 'up', isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.color = color;
        this.direction = direction;
        this.speed = isPlayer ? 3 : 1.5;
        this.isPlayer = isPlayer;
        this.health = isPlayer ? 3 : 1;
        this.bullets = [];
        this.lastShot = 0;
        this.shootCooldown = isPlayer ? 300 : 2000;
        this.moving = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 根据方向旋转
        let rotation = 0;
        switch(this.direction) {
            case 'up': rotation = 0; break;
            case 'right': rotation = Math.PI / 2; break;
            case 'down': rotation = Math.PI; break;
            case 'left': rotation = -Math.PI / 2; break;
        }
        ctx.rotate(rotation);

        // 绘制坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 绘制坦克炮管
        ctx.fillStyle = this.isPlayer ? '#4a4a4a' : '#8b4513';
        ctx.fillRect(-3, -this.height / 2 - 10, 6, 15);

        // 绘制坦克履带
        ctx.fillStyle = this.isPlayer ? '#2a2a2a' : '#654321';
        ctx.fillRect(-this.width / 2 - 2, -this.height / 2, 4, this.height);
        ctx.fillRect(this.width / 2 - 2, -this.height / 2, 4, this.height);

        // 如果是玩家坦克，显示生命值
        if (this.isPlayer) {
            ctx.restore();
            ctx.fillStyle = '#00ff00';
            for (let i = 0; i < this.health; i++) {
                ctx.fillRect(this.x + i * 12, this.y - 10, 10, 5);
            }
        } else {
            ctx.restore();
        }
    }

    move(dx, dy) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        // 边界检测
        if (newX >= 0 && newX <= CANVAS_WIDTH - this.width &&
            newY >= 0 && newY <= CANVAS_HEIGHT - this.height) {

            // 墙壁碰撞检测
            let canMove = true;
            for (let wall of walls) {
                if (wall.active && this.checkWallCollision(newX, newY, wall)) {
                    canMove = false;
                    break;
                }
            }

            // 坦克之间的碰撞检测
            if (canMove) {
                for (let tank of [playerTank, ...enemyTanks]) {
                    if (tank !== this && this.checkTankCollision(newX, newY, tank)) {
                        canMove = false;
                        break;
                    }
                }
            }

            // 与老家碰撞检测（只有敌方坦克会碰撞）
            if (canMove && !this.isPlayer && base && base.active) {
                if (this.checkBaseCollision(newX, newY)) {
                    canMove = false;
                }
            }

            if (canMove) {
                this.x = newX;
                this.y = newY;
            }
        }
    }

    checkWallCollision(newX, newY, wall) {
        return newX < wall.x + wall.width &&
               newX + this.width > wall.x &&
               newY < wall.y + wall.height &&
               newY + this.height > wall.y;
    }

    checkTankCollision(newX, newY, otherTank) {
        return newX < otherTank.x + otherTank.width &&
               newX + this.width > otherTank.x &&
               newY < otherTank.y + otherTank.height &&
               newY + this.height > otherTank.y;
    }

    checkBaseCollision(newX, newY) {
        if (!base || !base.active) return false;
        return newX < base.x + base.width &&
               newX + this.width > base.x &&
               newY < base.y + base.height &&
               newY + this.height > base.y;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            let bulletX = this.x + this.width / 2 - 3;
            let bulletY = this.y;
            let bulletDx = 0, bulletDy = 0;

            switch(this.direction) {
                case 'up':
                    bulletY = this.y - 10;
                    bulletDy = -1;
                    break;
                case 'down':
                    bulletY = this.y + this.height + 10;
                    bulletDy = 1;
                    break;
                case 'left':
                    bulletX = this.x - 10;
                    bulletDx = -1;
                    break;
                case 'right':
                    bulletX = this.x + this.width + 10;
                    bulletDx = 1;
                    break;
            }

            this.bullets.push(new Bullet(bulletX, bulletY, bulletDx, bulletDy, this.isPlayer));
            this.lastShot = now;
        }
    }

    update() {
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });

        // AI 坦克自动移动和射击
        if (!this.isPlayer && gameState === 'playing') {
            this.aiMove();
            if (Math.random() < 0.02) {
                this.shoot();
            }
        }
    }

    aiMove() {
        // 简单的 AI：随机改变方向和移动
        if (Math.random() < 0.02) {
            const directions = ['up', 'down', 'left', 'right'];
            this.direction = directions[Math.floor(Math.random() * directions.length)];
        }

        let dx = 0, dy = 0;
        switch(this.direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }

        this.move(dx, dy);
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            return true; // 坦克被摧毁
        }
        return false;
    }
}

class Bullet {
    constructor(x, y, dx, dy, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 6;
        this.dx = dx;
        this.dy = dy;
        this.speed = 5;
        this.active = true;
        this.isPlayerBullet = isPlayerBullet;
    }

    draw() {
        ctx.fillStyle = this.isPlayerBullet ? '#ffff00' : '#ff4500';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        // 边界检测
        if (this.x < 0 || this.x > CANVAS_WIDTH ||
            this.y < 0 || this.y > CANVAS_HEIGHT) {
            this.active = false;
        }

        // 墙壁碰撞检测
        for (let wall of walls) {
            if (wall.active && this.checkWallCollision(wall)) {
                wall.takeDamage();
                this.active = false;
                if (!wall.active) {
                    explosions.push(new Explosion(wall.x + wall.width/2, wall.y + wall.height/2));
                }
                break;
            }
        }

        // 老家碰撞检测
        if (base && base.active && this.checkBaseCollision()) {
            if (base.takeDamage()) {
                explosions.push(new Explosion(base.x + base.width/2, base.y + base.height/2));
            }
            this.active = false;
        }
    }

    checkWallCollision(wall) {
        return this.x < wall.x + wall.width &&
               this.x + this.width > wall.x &&
               this.y < wall.y + wall.height &&
               this.y + this.height > wall.y;
    }

    checkBaseCollision() {
        return this.x < base.x + base.width &&
               this.x + this.width > base.x &&
               this.y < base.y + base.height &&
               this.y + this.height > base.y;
    }

    checkCollision(tank) {
        return this.x < tank.x + tank.width &&
               this.x + this.width > tank.x &&
               this.y < tank.y + tank.height &&
               this.y + this.height > tank.y;
    }
}

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 30;
        this.active = true;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 100, 0, ${1 - (this.radius / this.maxRadius)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.radius += 2;
        if (this.radius >= this.maxRadius) {
            this.active = false;
        }
    }
}

class Wall {
    constructor(x, y, width = 40, height = 40, type = 'brick') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // brick, steel, water
        this.health = type === 'steel' ? 3 : 1;
        this.active = true;
    }

    draw() {
        if (!this.active) return;

        switch(this.type) {
            case 'brick':
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 绘制砖块纹理
                ctx.strokeStyle = '#654321';
                ctx.strokeRect(this.x, this.y, this.width, this.height);
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, this.y);
                ctx.lineTo(this.x + this.width/2, this.y + this.height);
                ctx.moveTo(this.x, this.y + this.height/2);
                ctx.lineTo(this.x + this.width, this.y + this.height/2);
                ctx.stroke();
                break;
            case 'steel':
                ctx.fillStyle = '#708090';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeStyle = '#2F4F4F';
                ctx.strokeRect(this.x, this.y, this.width, this.height);
                break;
            case 'water':
                ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                break;
        }
    }

    takeDamage() {
        if (this.type === 'steel') {
            this.health--;
            if (this.health <= 0) {
                this.active = false;
            }
        } else if (this.type === 'brick') {
            this.active = false;
        }
    }
}

class Base {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.health = baseHealth;
        this.maxHealth = baseHealth;
        this.active = true;
    }

    draw() {
        if (!this.active) return;

        // 绘制基地
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 绘制基地中心
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, 15, 0, Math.PI * 2);
        ctx.fill();

        // 绘制生命值条
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 10;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.active = false;
            gameState = 'gameOver';
            showGameOver();
            return true;
        }
        return false;
    }
}

// 游戏变量
let playerTank = null;
let enemyTanks = [];
let explosions = [];
let walls = [];
let base = null;
let keys = {};

// 初始化游戏
function initGame() {
    playerTank = new Tank(CANVAS_WIDTH / 2 - 15, CANVAS_HEIGHT - 120, '#00ff00', 'up', true);
    enemyTanks = [];
    explosions = [];
    walls = [];
    playerScore = 0;
    currentLevel = 1;
    enemyTankCount = 5;
    baseHealth = 5;

    // 创建老家
    base = new Base(CANVAS_WIDTH/2 - 30, CANVAS_HEIGHT - 60);

    // 创建随机地图
    createRandomMap();

    createEnemyTanks();
    updateUI();
}

// 创建随机地图
function createRandomMap() {
    walls = [];

    // 在地图上随机生成墙壁
    for (let i = 0; i < 15; i++) {
        let x = Math.floor(Math.random() * 18) * 40 + 40;
        let y = Math.floor(Math.random() * 12) * 40 + 40;

        // 避免在老家附近生成墙壁
        if (x < CANVAS_WIDTH/2 - 100 && x > CANVAS_WIDTH/2 + 100 &&
            y < CANVAS_HEIGHT - 120 && y > CANVAS_HEIGHT - 40) {
            continue;
        }

        // 避免在玩家起始位置生成墙壁
        if (y > CANVAS_HEIGHT - 100) {
            continue;
        }

        const type = Math.random() < 0.7 ? 'brick' : 'steel';
        walls.push(new Wall(x, y, 40, 40, type));
    }

    // 创建老家周围的防护墙
    const baseX = CANVAS_WIDTH/2 - 30;
    const baseY = CANVAS_HEIGHT - 60;

    // 老家周围的钢墙
    walls.push(new Wall(baseX - 40, baseY, 40, 40, 'steel'));
    walls.push(new Wall(baseX + 60, baseY, 40, 40, 'steel'));
    walls.push(new Wall(baseX - 40, baseY - 40, 40, 40, 'steel'));
    walls.push(new Wall(baseX, baseY - 40, 40, 40, 'steel'));
    walls.push(new Wall(baseX + 20, baseY - 40, 40, 40, 'steel'));
    walls.push(new Wall(baseX + 60, baseY - 40, 40, 40, 'steel'));
}

// 创建敌方坦克
function createEnemyTanks() {
    for (let i = 0; i < enemyTankCount; i++) {
        const x = Math.random() * (CANVAS_WIDTH - 30);
        const y = Math.random() * 200;
        const directions = ['up', 'down', 'left', 'right'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        enemyTanks.push(new Tank(x, y, '#ff0000', direction, false));
    }
}

// 游戏主循环
function gameLoop() {
    if (gameState !== 'playing') return;

    // 清空画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制游戏区域网格背景
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
    }

    // 绘制墙壁
    walls.forEach(wall => {
        wall.draw();
    });

    // 绘制老家
    if (base && base.active) {
        base.draw();
    }

    // 处理玩家输入
    handlePlayerInput();

    // 更新玩家坦克
    playerTank.update();
    playerTank.draw();

    // 更新和绘制玩家子弹
    playerTank.bullets.forEach(bullet => {
        bullet.draw();

        // 检测子弹与敌方坦克的碰撞
        enemyTanks = enemyTanks.filter(enemy => {
            if (bullet.checkCollision(enemy) && bullet.isPlayerBullet) {
                explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
                playerScore += 100;
                bullet.active = false;
                return false;
            }
            return true;
        });
    });

    // 更新和绘制敌方坦克
    enemyTanks.forEach(enemy => {
        enemy.update();
        enemy.draw();

        // 绘制敌方子弹
        enemy.bullets.forEach(bullet => {
            bullet.draw();

            // 检测子弹与玩家的碰撞
            if (bullet.checkCollision(playerTank) && !bullet.isPlayerBullet) {
                if (playerTank.takeDamage()) {
                    gameState = 'gameOver';
                    showGameOver();
                }
                bullet.active = false;
                explosions.push(new Explosion(playerTank.x + playerTank.width / 2, playerTank.y + playerTank.height / 2));
            }
        });
    });

    // 更新和绘制爆炸效果
    explosions = explosions.filter(explosion => {
        explosion.update();
        explosion.draw();
        return explosion.active;
    });

    // 检查是否所有敌方坦克被消灭
    if (enemyTanks.length === 0) {
        nextLevel();
    }

    // 更新UI
    updateUI();

    animationId = requestAnimationFrame(gameLoop);
}

// 处理玩家输入
function handlePlayerInput() {
    let dx = 0, dy = 0;

    if (keys['ArrowUp'] || keys['w']) {
        dy = -1;
        playerTank.direction = 'up';
    }
    if (keys['ArrowDown'] || keys['s']) {
        dy = 1;
        playerTank.direction = 'down';
    }
    if (keys['ArrowLeft'] || keys['a']) {
        dx = -1;
        playerTank.direction = 'left';
    }
    if (keys['ArrowRight'] || keys['d']) {
        dx = 1;
        playerTank.direction = 'right';
    }

    if (dx !== 0 || dy !== 0) {
        playerTank.move(dx, dy);
    }

    if (keys[' ']) {
        playerTank.shoot();
    }
}

// 下一关
function nextLevel() {
    currentLevel++;
    enemyTankCount = Math.min(enemyTankCount + 2, 10);
    playerScore += 500; // 过关奖励

    // 重新生成地图
    createRandomMap();

    // 恢复老家生命值
    base.health = Math.min(base.health + 2, base.maxHealth);

    createEnemyTanks();

    // 恢复玩家生命值
    if (playerTank.health < 3) {
        playerTank.health = Math.min(playerTank.health + 1, 3);
    }
}

// 更新UI
function updateUI() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('enemy-count').textContent = enemyTanks.length;
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('base-health').textContent = base ? base.health : 0;
}

// 显示游戏结束
function showGameOver() {
    cancelAnimationFrame(animationId);

    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
        <div class="game-over-content">
            <h2>游戏结束</h2>
            <p>最终得分: ${playerScore}</p>
            <p>达到等级: ${currentLevel}</p>
            <button onclick="restartGame()">重新开始</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// 重新开始游戏
function restartGame() {
    const overlay = document.querySelector('.game-over-overlay');
    if (overlay) {
        overlay.remove();
    }

    gameState = 'playing';
    initGame();
    gameLoop();
}

// 事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // R键重新开始
    if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }

    // P键暂停/继续
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 按钮事件
document.getElementById('startBtn').addEventListener('click', () => {
    if (gameState === 'waiting') {
        gameState = 'playing';
        initGame();
        gameLoop();
        document.getElementById('startBtn').disabled = true;
    }
});

document.getElementById('pauseBtn').addEventListener('click', togglePause);

document.getElementById('restartBtn').addEventListener('click', restartGame);

// 暂停/继续游戏
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        cancelAnimationFrame(animationId);
        document.getElementById('pauseBtn').textContent = '继续';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        gameLoop();
        document.getElementById('pauseBtn').textContent = '暂停';
    }
}

// 防止空格键滚动页面
window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
    }
});

// 初始化
window.addEventListener('load', () => {
    // 绘制初始画面
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('点击"开始游戏"开始战斗！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
});
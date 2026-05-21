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

        // 绘制坦克主体装饰线
        ctx.strokeStyle = this.isPlayer ? '#004400' : '#880000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width - 4, this.height - 4);

        // 绘制坦克炮管
        ctx.fillStyle = this.isPlayer ? '#4a4a4a' : '#8b4513';
        ctx.fillRect(-4, -this.height / 2 - 12, 8, 16);

        // 炮管装饰
        ctx.fillStyle = '#333';
        ctx.fillRect(-5, -this.height / 2 - 10, 10, 4);

        // 绘制坦克履带
        ctx.fillStyle = this.isPlayer ? '#2a2a2a' : '#654321';
        // 左履带
        ctx.fillRect(-this.width / 2 - 3, -this.height / 2, 5, this.height);
        // 右履带
        ctx.fillRect(this.width / 2 - 2, -this.height / 2, 5, this.height);

        // 绘制履带轮子
        ctx.fillStyle = '#444';
        for (let i = -this.height/2 + 6; i < this.height/2; i += 12) {
            ctx.beginPath();
            ctx.arc(-this.width/2 - 0.5, i, 3, 0, Math.PI * 2);
            ctx.arc(this.width/2 + 0.5, i, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制坦克舱盖
        ctx.fillStyle = this.isPlayer ? '#006600' : '#aa0000';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // 绘制舱盖高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        // 如果是强化敌方坦克，添加标记
        if (!this.isPlayer && this.health > 1) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(10, 10);
            ctx.moveTo(10, -10);
            ctx.lineTo(-10, 10);
            ctx.stroke();
        }

        ctx.restore();

        // 如果是玩家坦克，显示生命值
        if (this.isPlayer) {
            ctx.fillStyle = '#00ff00';
            for (let i = 0; i < this.health; i++) {
                ctx.fillRect(this.x + i * 12, this.y - 10, 10, 5);
            }
        } else if (this.health > 1) {
            // 显示强化坦克的生命值
            ctx.fillStyle = '#ff00ff';
            for (let i = 0; i < this.health; i++) {
                ctx.fillRect(this.x + i * 8, this.y - 8, 6, 4);
            }
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
        // 绘制子弹光晕效果
        const gradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y + this.height/2, 0,
            this.x + this.width/2, this.y + this.height/2, this.width
        );

        if (this.isPlayerBullet) {
            gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 69, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0.3)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width, 0, Math.PI * 2);
        ctx.fill();

        // 绘制子弹核心
        ctx.fillStyle = this.isPlayerBullet ? '#FFFF00' : '#FF4500';
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);

        // 添加拖尾效果
        const tailLength = 15;
        const tailGradient = ctx.createLinearGradient(
            this.x + this.width/2 - this.dx * tailLength,
            this.y + this.height/2 - this.dy * tailLength,
            this.x + this.width/2,
            this.y + this.height/2
        );

        tailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        tailGradient.addColorStop(1, this.isPlayerBullet ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 69, 0, 0.6)');

        ctx.strokeStyle = tailGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + this.height/2);
        ctx.lineTo(this.x + this.width/2 - this.dx * tailLength, this.y + this.height/2 - this.dy * tailLength);
        ctx.stroke();
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
        this.maxRadius = 35;
        this.active = true;
        this.particles = this.createParticles();
    }

    createParticles() {
        const particles = [];
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 5 + 2,
                life: 1,
                color: Math.random() < 0.5 ? '#FF4500' : '#FFD700'
            });
        }
        return particles;
    }

    draw() {
        // 绘制主爆炸圈
        const alpha = 1 - (this.radius / this.maxRadius);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 140, 0, ${alpha * 0.8})`);
        gradient.addColorStop(0.7, `rgba(255, 69, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制爆炸粒子
        this.particles.forEach(particle => {
            if (particle.life > 0) {
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.life;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // 绘制闪光效果
        if (this.radius < this.maxRadius * 0.3) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    update() {
        this.radius += 2;

        // 更新粒子
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life -= 0.05;
            particle.size *= 0.95;
        });

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
                // 绘制砖块主体
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(this.x, this.y, this.width, this.height);

                // 绘制砖块纹理
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 1;

                // 水平分割线
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.height/2);
                ctx.lineTo(this.x + this.width, this.y + this.height/2);
                ctx.stroke();

                // 垂直分割线（交错）
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, this.y);
                ctx.lineTo(this.x + this.width/2, this.y + this.height/2);
                ctx.moveTo(this.x + this.width/4, this.y + this.height/2);
                ctx.lineTo(this.x + this.width/4, this.y + this.height);
                ctx.moveTo(this.x + this.width*3/4, this.y + this.height/2);
                ctx.lineTo(this.x + this.width*3/4, this.y + this.height);
                ctx.stroke();

                // 添加阴影效果
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(this.x + this.width - 3, this.y + 3, 3, this.height - 3);
                break;

            case 'steel':
                // 绘制钢块主体
                const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
                gradient.addColorStop(0, '#B0C4DE');
                gradient.addColorStop(0.5, '#778899');
                gradient.addColorStop(1, '#696969');
                ctx.fillStyle = gradient;
                ctx.fillRect(this.x, this.y, this.width, this.height);

                // 绘制钢块边框
                ctx.strokeStyle = '#2F4F4F';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.width, this.height);

                // 添加铆钉效果
                ctx.fillStyle = '#696969';
                const rivetSize = 3;
                const rivetOffset = 6;
                ctx.beginPath();
                ctx.arc(this.x + rivetOffset, this.y + rivetOffset, rivetSize, 0, Math.PI * 2);
                ctx.arc(this.x + this.width - rivetOffset, this.y + rivetOffset, rivetSize, 0, Math.PI * 2);
                ctx.arc(this.x + rivetOffset, this.y + this.height - rivetOffset, rivetSize, 0, Math.PI * 2);
                ctx.arc(this.x + this.width - rivetOffset, this.y + this.height - rivetOffset, rivetSize, 0, Math.PI * 2);
                ctx.fill();

                // 高光效果
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);
                break;

            case 'water':
                // 绘制水体
                ctx.fillStyle = '#4682B4';
                ctx.fillRect(this.x, this.y, this.width, this.height);

                // 添加水波纹效果
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                const waveOffset = (Date.now() / 100) % 20;

                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y + i * 15 + waveOffset);
                    for (let j = 0; j < this.width; j += 10) {
                        ctx.quadraticCurveTo(
                            this.x + j + 5, this.y + i * 15 + waveOffset - 3,
                            this.x + j + 10, this.y + i * 15 + waveOffset
                        );
                    }
                    ctx.stroke();
                }

                // 添加深色底部
                ctx.fillStyle = 'rgba(0, 0, 139, 0.3)';
                ctx.fillRect(this.x, this.y + this.height - 8, this.width, 8);
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

        // 绘制基地平台
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);

        // 绘制基地主体
        ctx.fillStyle = this.health > 2 ? '#FFD700' : '#FFA500';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 绘制基地主体装饰
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);

        // 绘制基地中心建筑（指挥中心）
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        // 主体建筑
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(centerX - 15, centerY - 15, 30, 30);

        // 建筑窗户
        ctx.fillStyle = this.health > 3 ? '#87CEEB' : '#FF6B6B';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i === 1 && j === 1) continue; // 中心是天线
                ctx.fillRect(centerX - 12 + i * 10, centerY - 12 + j * 10, 6, 6);
            }
        }

        // 绘制天线
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 15);
        ctx.lineTo(centerX, centerY - 25);
        ctx.stroke();

        // 天线顶部
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 25, 3, 0, Math.PI * 2);
        ctx.fill();

        // 绘制雷达
        if (this.health > 1) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20 + Math.sin(Date.now() / 500) * 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 绘制生命值条
        const barWidth = 50;
        const barHeight = 6;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 15;

        // 生命值条背景
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 生命值条边框
        ctx.strokeStyle = '#666';
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 当前生命值
        const healthColor = this.health > 3 ? '#00ff00' :
                           this.health > 1 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = healthColor;
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
    // 玩家坦克初始位置改为左下角
    playerTank = new Tank(60, CANVAS_HEIGHT - 120, '#00ff00', 'up', true);
    enemyTanks = [];
    explosions = [];
    walls = [];
    playerScore = 0;
    currentLevel = 1;
    enemyTankCount = 5;
    baseHealth = 5;

    // 创建老家 - 保持在底部中央
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
        let x, y;

        // 随机选择生成位置：上方40%区域或右侧20%区域
        if (Math.random() < 0.4) {
            // 从上方生成
            x = Math.random() * (CANVAS_WIDTH - 60) + 30;
            y = Math.random() * 150;
        } else {
            // 从右侧生成
            x = CANVAS_WIDTH - 100 + Math.random() * 70;
            y = 100 + Math.random() * (CANVAS_HEIGHT - 300);
        }

        const directions = ['down', 'left']; // 初始方向朝向地图中央
        const direction = directions[Math.floor(Math.random() * directions.length)];

        // 根据等级设置不同的坦克类型
        let color = '#ff0000';
        let health = 1;

        if (currentLevel >= 3 && Math.random() < 0.3) {
            // 3级以上有30%概率出现强化坦克
            color = '#ff00ff';
            health = 2;
        }

        const enemy = new Tank(x, y, color, direction, false);
        enemy.health = health;
        enemyTanks.push(enemy);
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
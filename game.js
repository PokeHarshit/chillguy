class ChillGuyImposterEscapeMD3 {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score-value');
        this.livesElement = document.getElementById('lives-value');
        this.levelElement = document.getElementById('level-value');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartButton = document.getElementById('restart-button');
        this.changePlayerButton = document.getElementById('change-player');
        this.changeImposterButton = document.getElementById('change-imposter');
        this.levelButtons = document.querySelectorAll('#level-select button');

        this.canvasWidth = 700;
        this.canvasHeight = 370;
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        this.player = {
            x: 50,
            y: this.canvasHeight - 70,
            width: 40,
            height: 60,
            speed: 5,
            jumpForce:20,
            velocityY: 0,
            isJumping: false
        };

        this.imposter = {
            x: this.canvasWidth - 100,
            y: this.canvasHeight - 70,
            width: 40,
            height: 60,
            speed: 0.5,
            dx: 0,
            dy: 0
        };

        this.platforms = [];
        this.coins = [];

        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.gravity = 0.8;
        this.keys = {};

        this.isDarkMode = true;
        this.isMusicEnabled = true;
        this.isSfxEnabled = true;
        
        // fucking solved
        this.backgroundMusic = new Audio('assets/background-music.mp3');
        this.backgroundMusic.loop = true;
        this.coinSound = new Audio('assets/coin-collect.mp3');
        
        // Initialize audio here
        this.audioContext = null;
        this.isAudioInitialized = false;

        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.initializeAudio = this.initializeAudio.bind(this);

        // Added click listener to initialize audio remember
        document.addEventListener('click', this.initializeAudio, { once: true });
        
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.restartButton.addEventListener('click', () => this.restartGame());
        this.changePlayerButton.addEventListener('click', () => this.changePlayerIcon());
        this.changeImposterButton.addEventListener('click', () => this.changeImposterIcon());
        this.levelButtons.forEach(button => {
            button.addEventListener('click', () => this.setLevel(parseInt(button.dataset.level)));
        });
        document.getElementById('toggle-theme').addEventListener('click', () => this.toggleTheme());
        document.getElementById('toggle-music').addEventListener('click', () => this.toggleMusic());
        document.getElementById('toggle-sfx').addEventListener('click', () => this.toggleSfx());

        this.loadAssets();
        this.applyTheme();
    }

    async initializeAudio() {
        if (this.isAudioInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume();
            
            // Initialize audio compression with corrected values
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
            
            // Set up background music
            const musicSource = this.audioContext.createMediaElementSource(this.backgroundMusic);
            musicSource.connect(compressor);
            compressor.connect(this.audioContext.destination);
            
            // Set up coin sound
            const coinSource = this.audioContext.createMediaElementSource(this.coinSound);
            coinSource.connect(compressor);
            
            this.isAudioInitialized = true;
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
    }

    applyTheme() {
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        const themeIcon = document.querySelector('#toggle-theme .material-symbols-outlined');
        themeIcon.textContent = this.isDarkMode ? 'light_mode' : 'dark_mode';
        this.updateCanvasColors();
    }

    updateCanvasColors() {
        if (this.isDarkMode) {
            this.backgroundColor = '#1C1B1F';
            this.platformColor = '#49454F';
        } else {
            this.backgroundColor = '#FEF7FF';
            this.platformColor = '#E7E0EC';
        }
    }

    toggleMusic() {
        this.isMusicEnabled = !this.isMusicEnabled;
        if (this.isMusicEnabled) {
            if (this.isAudioInitialized) {
                this.backgroundMusic.play().catch(error => {
                    console.warn('Failed to play background music:', error);
                });
            }
        } else {
            this.backgroundMusic.pause();
        }
        const musicIcon = document.querySelector('#toggle-music .material-symbols-outlined');
        musicIcon.textContent = this.isMusicEnabled ? 'music_off' : 'music_note';
    }

    toggleSfx() {
        this.isSfxEnabled = !this.isSfxEnabled;
        const sfxIcon = document.querySelector('#toggle-sfx .material-symbols-outlined');
        sfxIcon.textContent = this.isSfxEnabled ? 'volume_off' : 'volume_up';
    }

    loadAssets() {
        this.playerIcons = [
            this.createSVGIcon('#6750A4', '#EADDFF', false),
            this.createSVGIcon('#7D5260', '#FFD8E4', false),
            this.createSVGIcon('#006C51', '#97F0C4', false)
        ];

        this.imposterIcons = [
            this.createSVGIcon('#B3261E', '#F9DEDC', true),
            this.createSVGIcon('#7D5260', '#FFD8E4', true),
            this.createSVGIcon('#006C51', '#97F0C4', true)
        ];

        this.playerIconIndex = 0;
        this.imposterIconIndex = 0;

        this.playerIcon = this.playerIcons[this.playerIconIndex];
        this.imposterIcon = this.imposterIcons[this.imposterIconIndex];

        this.initLevel();
        this.gameLoop();
    }

    createSVGIcon(primaryColor, secondaryColor, isVillain) {
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60">
                <rect x="5" y="0" width="30" height="20" fill="${secondaryColor}"/>
                <rect x="0" y="20" width="40" height="30" fill="${primaryColor}"/>
                <rect x="5" y="50" width="10" height="10" fill="${secondaryColor}"/>
                <rect x="25" y="50" width="10" height="10" fill="${secondaryColor}"/>
                <circle cx="15" cy="10" r="5" fill="#FFFFFF"/>
                <circle cx="25" cy="10" r="5" fill="#FFFFFF"/>
                <circle cx="15" cy="10" r="2" fill="#000000"/>
                <circle cx="25" cy="10" r="2" fill="#000000"/>
                ${isVillain ? '<path d="M10 30 Q20 20 30 30" fill="none" stroke="#FFFFFF" stroke-width="2"/>' : '<path d="M10 30 Q20 40 30 30" fill="none" stroke="#FFFFFF" stroke-width="2"/>'}
                ${isVillain ? '<path d="M5 5 L15 15 M25 15 L35 5" stroke="#FF0000" stroke-width="2"/>' : ''}
            </svg>
        `;
        const img = new Image();
        img.src = 'data:image/svg+xml,' + encodeURIComponent(svgString);
        return img;
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    initLevel() {
        this.platforms = [
            { x: 0, y: this.canvasHeight - 20, width: this.canvasWidth, height: 20, dx: 0 },
            { x: 300, y: 300, width: 200, height: 20, dx: 1 },
            { x: 600, y: 200, width: 150, height: 20, dx: -1 }
        ];

        this.coins = [
            { x: 350, y: 250, width: 20, height: 20 },
            { x: 650, y: 150, width: 20, height: 20 }
        ];

        this.player.speed = 5 + (this.currentLevel - 1) * 0.5;
        this.imposter.speed = 0.75 + (this.currentLevel - 1) * 0.15;
        this.imposter.dx = 0;
        this.imposter.dy = 0;
    }

    update() {
        if (this.keys['ArrowLeft']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight']) this.player.x += this.player.speed;

        document.querySelector('#game-container').addEventListener('click', ()=> {
            this.player.velocityY = -this.player.jumpForce;
            this.player.isJumping = true;
        });

        if ((this.keys['ArrowUp'] || this.keys['Space'] || this.mouseClicked ) && !this.player.isJumping) {
            this.player.velocityY = -this.player.jumpForce;
            this.player.isJumping = true;
        }

        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;

        this.platforms.forEach(platform => {
            if (platform.dx !== 0) {
                platform.x += platform.dx;
                if (platform.x <= 0 || platform.x + platform.width >= this.canvasWidth) {
                    platform.dx *= -1;
                }
            }
        });

        this.platforms.forEach(platform => {
            if (this.checkCollision(this.player, platform)) {
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.isJumping = false;
            }
        });

        this.coins = this.coins.filter(coin => {
            if (this.checkCollision(this.player, coin)) {
                this.score += 10;
                this.scoreElement.textContent = this.score;
                if (this.isSfxEnabled && this.isAudioInitialized) {
                    this.coinSound.play().catch(error => {
                        console.warn('Failed to play coin sound:', error);
                    });
                }
                return false;
            }
            return true;
        });

        if (Math.random() < 1) {
            const dx = this.player.x - this.imposter.x;
            const dy = this.player.y - this.imposter.y;
            const angle = Math.atan2(dy, dx);
            this.imposter.x += Math.cos(angle) * this.imposter.speed;
            this.imposter.y += Math.sin(angle) * this.imposter.speed;
        }

        if (this.checkCollision(this.player, this.imposter)) {
            this.lives--;
            this.livesElement.textContent = this.lives;
            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.resetPlayerPosition();
            }
        }

        this.player.x = Math.max(0, Math.min(this.player.x, this.canvasWidth - this.player.width));
        this.player.y = Math.min(this.player.y, this.canvasHeight - this.player.height);
        this.imposter.x = Math.max(0, Math.min(this.imposter.x, this.canvasWidth - this.imposter.width));
        this.imposter.y = Math.min(this.imposter.y, this.canvasHeight - this.imposter.height);

        if (this.coins.length === 0) {
            this.respawnCoins();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.fillStyle = this.platformColor;
        this.platforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        this.ctx.fillStyle = '#FFD700';
        this.coins.forEach(coin => {
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.drawImage(this.playerIcon, this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.drawImage(this.imposterIcon, this.imposter.x, this.imposter.y, this.imposter.width, this.imposter.height);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    gameLoop() {
        this.update();
        this.draw();
        if (this.isMusicEnabled && this.isAudioInitialized && this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(error => {
                console.warn('Failed to play background music in game loop:', error);
            });
        }
        requestAnimationFrame(this.gameLoop);
    }

    gameOver() {
        this.gameOverElement.classList.remove('hidden');
        this.finalScoreElement.textContent = this.score;
    }

    restartGame() {
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.levelElement.textContent = this.currentLevel;
        this.resetPlayerPosition();
        this.resetImposterPosition();
        this.initLevel();
        this.gameOverElement.classList.add('hidden');
    }


    resetPlayerPosition() {
        this.player.x = 50;
        this.player.y = this.canvasHeight - 70;
        this.player.velocityY = 0;
    }

    resetImposterPosition() {
        this.imposter.x = this.canvasWidth - 100;
        this.imposter.y = this.canvasHeight - 70;
    }

    respawnCoins() {
        this.coins = [
            { x: 350, y: 250, width: 20, height: 20 },
            { x: 650, y: 150, width: 20, height: 20 }
        ];
    }

    changePlayerIcon() {
        this.playerIconIndex = (this.playerIconIndex + 1) % this.playerIcons.length;
        this.playerIcon = this.playerIcons[this.playerIconIndex];
    }

    changeImposterIcon() {
        this.imposterIconIndex = (this.imposterIconIndex + 1) % this.imposterIcons.length;
        this.imposterIcon = this.imposterIcons[this.imposterIconIndex];
    }

    setLevel(level) {
        this.currentLevel = level;
        this.levelElement.textContent = this.currentLevel;
        this.initLevel();
        this.resetPlayerPosition();
        this.resetImposterPosition();
    }
}

window.onload = () => {
    new ChillGuyImposterEscapeMD3();
};

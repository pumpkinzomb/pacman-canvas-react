'use strict';
import axios from 'axios';

/*-------------------------------------------------------------------

	___________    ____   _____ _____    ____  
	\____ \__  \ _/ ___\ /     \\__  \  /    \ 
	|  |_> > __ \\  \___|  Y Y  \/ __ \|   |  \
	|   __(____  /\___  >__|_|  (____  /___|  /
	|__|       \/     \/      \/     \/     \/ .platzh1rsch.ch
	
	author: platzh1rsch		(www.platzh1rsch.ch)
	
-------------------------------------------------------------------*/

// global enums
const GHOSTS = {
    INKY: 'inky',
    BLINKY: 'blinky',
    PINKY: 'pinky',
    CLYDE: 'clyde',
};

// global constants
const FINAL_LEVEL = 10;
const PILL_POINTS = 10;
const POWERPILL_POINTS = 50;
const GHOST_POINTS = 100;

export function geronimo({
    canvas,
    context,
    handleChangeCanvasContainer,
    handleShowControl,
    setHeartCount,
    setLevel,
    setScore,
    setSubmitValidation,
}) {
    /* ----- Global Variables ---------------------------------------- */
    var game;
    var canvas_walls, context_walls;
    var inky, blinky, clyde, pinky;
    var mapConfig = 'data/map.json';

    function buildWall(context, gridX, gridY, width, height) {
        console.log('BuildWall');
        width = width * 2 - 1;
        height = height * 2 - 1;
        context.fillRect(
            pacman.radius / 2 + gridX * 2 * pacman.radius,
            pacman.radius / 2 + gridY * 2 * pacman.radius,
            width * pacman.radius,
            height * pacman.radius,
        );
    }

    function between(x, min, max) {
        return x >= min && x <= max;
    }

    // Logger
    const logger = (function () {
        let originalConsoleLog = null;
        let originalConsoleDebug = null;
        const logger = {};

        logger.enableLogger = function enableLogger() {
            if (originalConsoleLog === null) return;

            window['console']['log'] = originalConsoleLog;
            console.log('console.log enabled');

            if (originalConsoleDebug === null) return;

            window['console']['debug'] = originalConsoleDebug;
            console.log('console.debug enabled');
        };

        logger.disableLogger = function disableLogger() {
            console.log('console.log disabled');
            originalConsoleLog = console.log;
            window['console']['log'] = function () {};
            originalConsoleDebug = console.debug;
            window['console']['debug'] = function () {};
        };

        return logger;
    })();

    // stop watch to measure the time
    function Timer() {
        this.time_diff = 0;
        this.time_start = 0;
        this.time_stop = 0;
        this.start = function () {
            this.time_start = new Date().getTime();
        };
        this.stop = function () {
            this.time_stop = new Date().getTime();
            this.time_diff += this.time_stop - this.time_start;
            this.time_stop = 0;
            this.time_start = 0;
        };
        this.reset = function () {
            this.time_diff = 0;
            this.time_start = 0;
            this.time_stop = 0;
        };
        this.get_time_diff = function () {
            return this.time_diff;
        };
    }

    // Manages the whole game ("God Object")
    function Game() {
        this.timer = new Timer(); // TODO: implememnt properly, and submit with highscore
        this.refreshRate = 33; // speed of the game, will increase in higher levels

        this.started = false; // TODO: what's the purpose of this exactly?
        this.pause = true;
        this.gameOver = false;

        this.score = new Score();
        this.soundfx = 0;
        this.map = null;
        this.pillCount = 0; // number of pills
        this.level = 1;
        this.refreshLevel = function () {
            setLevel(this.level);
        };
        this.canvas = canvas;
        this.wallColor = 'Blue';
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // global pill states
        this.pillSize = 3;
        this.powerpillSizeMin = 2;
        this.powerpillSizeMax = 6;
        this.powerpillSizeCurrent = this.powerpillSizeMax;
        this.powerPillAnimationCounter = 0;

        // TODO: vibrant power pills
        this.nextPowerPillSize = function () {
            /*  
              if (this.powerPillAnimationCounter === 3) {
                this.powerPillAnimationCounter = 0;
                this.powerpillSizeCurrent = this.powerpillSizeMin + this.powerpillSizeCurrent % (this.powerpillSizeMax-this.powerpillSizeMin);
              } else {
                this.powerPillAnimationCounter++;
              } 
            */
            return this.powerpillSizeCurrent;
        };

        // global ghost states
        this.ghostFrightened = false;
        this.ghostFrightenedTimer = 240;
        this.ghostMode = 0; // 0 = Scatter, 1 = Chase
        this.ghostModeTimer = 200; // decrements each animationLoop execution
        this.ghostSpeedNormal = this.level > 4 ? 3 : 2; // global default for ghost speed
        this.ghostSpeedDazzled = 2; // global default for ghost speed when dazzled

        /* Game Functions */
        this.startGhostFrightened = function () {
            console.log('ghost frigthened');
            this.ghostFrightened = true;
            this.ghostFrightenedTimer = 240;
            inky.dazzle();
            pinky.dazzle();
            blinky.dazzle();
            clyde.dazzle();
        };

        this.endGhostFrightened = function () {
            this.ghostFrightened = false;
            inky.undazzle();
            pinky.undazzle();
            blinky.undazzle();
            clyde.undazzle();
        };

        this.checkGhostMode = function () {
            if (this.ghostFrightened) {
                this.ghostFrightenedTimer--;
                if (this.ghostFrightenedTimer === 0) {
                    this.endGhostFrightened();
                    this.ghostFrigthenedTimer = 240;
                    /*  inky.reverseDirection();
                        pinky.reverseDirection();
                        clyde.reverseDirection();
                        blinky.reverseDirection();  */
                }
            }
            // always decrement ghostMode timer
            this.ghostModeTimer--;
            if (this.ghostModeTimer === 0 && game.level > 1) {
                this.ghostMode ^= 1;
                this.ghostModeTimer = 200 + this.ghostMode * 450;
                console.log('ghostMode=' + this.ghostMode);

                game.buildWalls();

                inky.reverseDirection();
                pinky.reverseDirection();
                clyde.reverseDirection();
                blinky.reverseDirection();
            }
        };

        this.getMapContent = function (x, y) {
            var maxX = game.width / 30 - 1;
            var maxY = game.height / 30 - 1;
            if (x < 0) x = maxX + x;
            if (x > maxX) x = x - maxX;
            if (y < 0) y = maxY + y;
            if (y > maxY) y = y - maxY;
            return this.map.posY[y].posX[x].type;
        };

        this.setMapContent = function (x, y, val) {
            this.map.posY[y].posX[x].type = val;
        };

        this.toggleSound = function () {
            this.soundfx === 0 ? (this.soundfx = 1) : (this.soundfx = 0);
        };

        // TODO: test
        this.reset = function () {
            this.score.set(0);
            this.score.refresh('.score');
            pacman.lives = 3;
            game.level = 1;
            this.refreshLevel();
            this.pause = false;
            this.gameOver = false;
        };

        this.newGame = function () {
            var r = window.confirm('Are you sure you want to restart?');
            if (r) {
                console.log('new Game');
                this.init(0);
                this.forceResume();
                setSubmitValidation(null);
            }
        };

        this.nextLevel = function () {
            console.debug('nextLevel: current, final', this.level, FINAL_LEVEL);
            if (this.level === FINAL_LEVEL) {
                console.log('next level, ' + FINAL_LEVEL + ', end game');
                game.endGame(true);
                game.showHighscoreForm();
            } else {
                this.level++;
                console.log('Level ' + game.level);
                game.pauseAndShowMessage('Level ' + game.level, this.getLevelTitle() + '<br/>(Click to continue!)');
                game.refreshLevel();
                this.init(1);
            }
        };

        /* UI functions */
        this.drawHearts = function (count) {
            setHeartCount(count);
        };

        this.getLevelTitle = function () {
            switch (this.level) {
                case 2:
                    return '"The chase begins"';
                // activate chase / scatter switching
                case 3:
                    return '"Inkys awakening"';
                // Inky starts leaving the ghost house
                case 4:
                    return '"Clydes awakening"';
                // Clyde starts leaving the ghost house
                case 5:
                    return '"need for speed"';
                // All the ghosts get faster from now on
                case 6:
                    return '"hunting season 1"';
                // TODO: No scatter mood this time
                case 7:
                    return '"the big calm"';
                // TODO: Only scatter mood this time
                case 8:
                    return '"hunting season 2"';
                // TODO: No scatter mood and all ghosts leave instantly
                case 9:
                    return '"ghosts on speed"';
                // TODO: Ghosts get even faster for this level
                case FINAL_LEVEL:
                    return '"The final chase"';
                // TODO: Ghosts get even faster for this level
                default:
                    return '"nothing new"';
            }
        };

        this.showMessage = function (title, text) {
            handleChangeCanvasContainer({
                show: true,
                gameover: false,
                fakeScore: false,
                title,
                text,
            });
            handleShowControl(true);
        };

        this.showGameOverMessage = function (title, text, validation) {
            handleChangeCanvasContainer({
                show: true,
                gameover: true,
                fakeScore: validation,
                title,
                text,
            });
            handleShowControl(true);
        };

        this.pauseAndShowMessage = function (title, text, validation) {
            // validation only be transfered by title === 'game over'
            this.timer.stop();
            this.pause = true;
            if (title === 'Game over') {
                this.showGameOverMessage(title, text, validation);
            } else {
                this.showMessage(title, text);
            }
        };

        this.closeMessage = function () {
            handleChangeCanvasContainer({
                show: false,
            });
            handleShowControl(false);
        };

        this.validateScoreWithLevel = async function () {
            let scoreIsValid = false;
            if (process.env.NODE_ENV === 'production') {
                const response = await axios.post('/validatescore', {
                    score: this.score.score,
                    level: this.level,
                });
                scoreIsValid = response?.data || false;
            } else {
                scoreIsValid = true;
            }
            console.log('validate score. score: ' + this.score.score + ', level: ' + this.level);
            return scoreIsValid;
        };

        this.showHighscoreForm = function () {
            var scoreIsValid = this.validateScoreWithLevel();
            this.pauseAndShowMessage('Game over', 'Total Score: ' + this.score.score, scoreIsValid);
        };

        /* game controls */

        this.forceStartAnimationLoop = function () {
            // start timer
            this.timer.start();
            this.pause = false;
            this.started = true;
            this.closeMessage();
            animationLoop();
        };

        this.forcePause = function () {
            this.timer.stop();
            this.pauseAndShowMessage('Pause', 'Click to Resume');
        };

        this.forceResume = function () {
            this.closeMessage();
            this.pause = false;
            this.timer.start();
        };

        this.pauseResume = function () {
            if (this.gameOver) {
                console.log('Cannot pause / resume. GameOver set to true.');
                return;
            }
            if (!this.started) {
                this.forceStartAnimationLoop();
            } else if (this.pause) {
                this.forceResume();
            } else {
                this.pauseAndShowMessage('Pause', 'Click to Resume');
            }
        };

        this.loadMapConfig = async () => {
            console.log('load map config');
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await axios.get(mapConfig);
                    console.log('map config loaded');
                    game.map = response.data;
                    resolve(response.data);
                } catch (error) {
                    console.error('error fetching map config');
                    reject(error);
                }
            });
        };

        this.getPillCount = () => {
            let temp = 0;
            this.map?.posY.forEach(function (item, i) {
                item.posX?.forEach(function (item) {
                    if (item.type == 'pill') {
                        temp++;
                        //console.log("Pill Count++. temp="+temp+". PillCount="+this.pillCount+".");
                    }
                });
            });

            return temp;
        };

        this.init = async (state) => {
            console.log('init game ' + state);

            // get Level Map
            this.map = await this.loadMapConfig();
            this.pillCount = this.getPillCount();

            // TODO: why are there 2 state checks?
            if (state === 0) {
                this.timer.reset();
                game.reset();
            }
            pacman.reset();

            game.drawHearts(pacman.lives);

            this.ghostFrightened = false;
            this.ghostFrightenedTimer = 240;
            this.ghostMode = 0; // 0 = Scatter, 1 = Chase
            this.ghostModeTimer = 200; // decrements each animationLoop execution

            // initalize Ghosts, avoid memory flooding
            if (pinky === null || pinky === undefined) {
                pinky = new Ghost(GHOSTS.PINKY, 7, 5, 'images/pinky.svg', 2, 2);
                inky = new Ghost(GHOSTS.INKY, 8, 5, 'images/inky.svg', 13, 11);
                blinky = new Ghost(GHOSTS.BLINKY, 9, 5, 'images/blinky.svg', 13, 0);
                clyde = new Ghost(GHOSTS.CLYDE, 10, 5, 'images/clyde.svg', 2, 11);
            } else {
                pinky.reset();
                inky.reset();
                blinky.reset();
                clyde.reset();
            }
            blinky.start(); // blinky is the first to leave ghostHouse
            inky.start();
            pinky.start();
            clyde.start();
        };

        this.checkForLevelUp = function () {
            if (this.pillCount === 0 && game.started) {
                this.nextLevel();
            }
        };

        this.endGame = function (allLevelsCompleted = false) {
            console.log('Game Over by ' + (allLevelsCompleted ? 'WIN' : 'LOSS'));
            this.pause = true;
            this.gameOver = true;
        };

        this.toPixelPos = function (gridPos) {
            return gridPos * 30;
        };

        this.toGridPos = function (pixelPos) {
            return (pixelPos % 30) / 30;
        };

        /* ------------ Start Pre-Build Walls  ------------ */
        this.buildWalls = function () {
            if (this.ghostMode === 0) game.wallColor = 'Blue';
            else game.wallColor = 'Red';
            canvas_walls = document.createElement('canvas');
            canvas_walls.width = game.canvas.width;
            canvas_walls.height = game.canvas.height;
            context_walls = canvas_walls.getContext('2d');

            context_walls.fillStyle = game.wallColor;
            context_walls.strokeStyle = game.wallColor;

            //horizontal outer
            buildWall(context_walls, 0, 0, 18, 1);
            buildWall(context_walls, 0, 12, 18, 1);

            // vertical outer
            buildWall(context_walls, 0, 0, 1, 6);
            buildWall(context_walls, 0, 7, 1, 6);
            buildWall(context_walls, 17, 0, 1, 6);
            buildWall(context_walls, 17, 7, 1, 6);

            // ghost base
            buildWall(context_walls, 7, 4, 1, 1);
            buildWall(context_walls, 6, 5, 1, 2);
            buildWall(context_walls, 10, 4, 1, 1);
            buildWall(context_walls, 11, 5, 1, 2);
            buildWall(context_walls, 6, 6, 6, 1);

            // ghost base door
            context_walls.fillRect(
                8 * 2 * pacman.radius,
                pacman.radius / 2 + 4 * 2 * pacman.radius + 5,
                4 * pacman.radius,
                1,
            );

            // single blocks
            buildWall(context_walls, 4, 0, 1, 2);
            buildWall(context_walls, 13, 0, 1, 2);

            buildWall(context_walls, 2, 2, 1, 2);
            buildWall(context_walls, 6, 2, 2, 1);
            buildWall(context_walls, 15, 2, 1, 2);
            buildWall(context_walls, 10, 2, 2, 1);

            buildWall(context_walls, 2, 3, 2, 1);
            buildWall(context_walls, 14, 3, 2, 1);
            buildWall(context_walls, 5, 3, 1, 1);
            buildWall(context_walls, 12, 3, 1, 1);
            buildWall(context_walls, 3, 3, 1, 3);
            buildWall(context_walls, 14, 3, 1, 3);

            buildWall(context_walls, 3, 4, 1, 1);
            buildWall(context_walls, 14, 4, 1, 1);

            buildWall(context_walls, 0, 5, 2, 1);
            buildWall(context_walls, 3, 5, 2, 1);
            buildWall(context_walls, 16, 5, 2, 1);
            buildWall(context_walls, 13, 5, 2, 1);

            buildWall(context_walls, 0, 7, 2, 2);
            buildWall(context_walls, 16, 7, 2, 2);
            buildWall(context_walls, 3, 7, 2, 2);
            buildWall(context_walls, 13, 7, 2, 2);

            buildWall(context_walls, 4, 8, 2, 2);
            buildWall(context_walls, 12, 8, 2, 2);
            buildWall(context_walls, 5, 8, 3, 1);
            buildWall(context_walls, 10, 8, 3, 1);

            buildWall(context_walls, 2, 10, 1, 1);
            buildWall(context_walls, 15, 10, 1, 1);
            buildWall(context_walls, 7, 10, 4, 1);
            buildWall(context_walls, 4, 11, 2, 2);
            buildWall(context_walls, 12, 11, 2, 2);
            /* ------------ End Pre-Build Walls  ------------ */
        };
    }

    game = new Game();

    function Score() {
        this.score = 0;
        this.set = function (i) {
            this.score = i;
        };
        this.add = function (i) {
            this.score += i;
        };
        this.refresh = function () {
            setScore(this.score);
        };
    }

    // used to play sounds during the game
    var Sound = {};
    Sound.play = function (sound) {
        if (game.soundfx == 1) {
            var audio = document.getElementById(sound);
            audio !== null ? audio.play() : console.log(sound + ' not found');
        }
    };

    // Direction object in Constructor notation
    function Direction(name, angle1, angle2, dirX, dirY) {
        this.name = name;
        this.angle1 = angle1;
        this.angle2 = angle2;
        this.dirX = dirX;
        this.dirY = dirY;
        this.equals = function (dir) {
            return JSON.stringify(this) == JSON.stringify(dir);
        };
    }

    // Direction Objects
    var up = new Direction('up', 1.75, 1.25, 0, -1); // UP
    var left = new Direction('left', 1.25, 0.75, -1, 0); // LEFT
    var down = new Direction('down', 0.75, 0.25, 0, 1); // DOWN
    var right = new Direction('right', 0.25, 1.75, 1, 0); // RIGHT
    /*var directions = [{},{},{},{}];
      directions[0] = up;
      directions[1] = down;
      directions[2] = right;
      directions[3] = left;*/

    // DirectionWatcher
    function directionWatcher() {
        this.dir = null;
        this.set = function (dir) {
            this.dir = dir;
        };
        this.get = function () {
            return this.dir;
        };
    }

    //var directionWatcher = new directionWatcher();

    // Ghost object in Constructor notation
    function Ghost(name, gridPosX, gridPosY, image, gridBaseX, gridBaseY) {
        this.name = name;
        this.posX = gridPosX * 30;
        this.posY = gridPosY * 30;
        this.startPosX = gridPosX * 30;
        this.startPosY = gridPosY * 30;
        this.gridBaseX = gridBaseX;
        this.gridBaseY = gridBaseY;
        this.speed = game.ghostSpeedNormal;
        this.images = JSON.parse(
            '{"normal" : {' +
                `"${GHOSTS.INKY}" : "0",` +
                `"${GHOSTS.PINKY}" : "1",` +
                `"${GHOSTS.BLINKY}" : "2",` +
                `"${GHOSTS.CLYDE}" : "3"` +
                '},' +
                '"frightened1" : {' +
                '"left" : "", "up": "", "right" : "", "down": ""},' +
                '"frightened2" : {' +
                '"left" : "", "up": "", "right" : "", "down": ""},' +
                '"dead" : {' +
                '"left" : "", "up": "", "right" : "", "down": ""}}',
        );
        this.image = new Image();
        this.image.src = image;
        this.ghostHouse = true;
        this.dazzled = false;
        this.dead = false;
        this.dazzle = function () {
            this.changeSpeed(game.ghostSpeedDazzled);
            // ensure ghost doesnt leave grid
            if (this.posX > 0) this.posX = this.posX - (this.posX % this.speed);
            if (this.posY > 0) this.posY = this.posY - (this.posY % this.speed);
            this.dazzled = true;
        };
        this.undazzle = function () {
            // only change speed if ghost is not "dead"
            if (!this.dead) this.changeSpeed(game.ghostSpeedNormal);
            // ensure ghost doesnt leave grid
            if (this.posX > 0) this.posX = this.posX - (this.posX % this.speed);
            if (this.posY > 0) this.posY = this.posY - (this.posY % this.speed);
            this.dazzled = false;
        };
        this.dazzleImg = new Image();
        this.dazzleImg.src = 'images/dazzled.svg';
        this.dazzleImg2 = new Image();
        this.dazzleImg2.src = 'images/dazzled2.svg';
        this.deadImg = new Image();
        this.deadImg.src = 'images/dead.svg';
        this.direction = right;
        this.radius = pacman.radius;
        this.draw = function (context) {
            if (this.dead) {
                context.drawImage(this.deadImg, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
            } else if (this.dazzled) {
                if (pacman.beastModeTimer < 50 && pacman.beastModeTimer % 8 > 1) {
                    context.drawImage(this.dazzleImg2, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
                } else {
                    context.drawImage(this.dazzleImg, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
                }
            } else context.drawImage(this.image, this.posX, this.posY, 2 * this.radius, 2 * this.radius);
        };
        this.getCenterX = function () {
            return this.posX + this.radius;
        };
        this.getCenterY = function () {
            return this.posY + this.radius;
        };

        this.reset = function () {
            this.dead = false;
            this.posX = this.startPosX;
            this.posY = this.startPosY;
            this.ghostHouse = true;
            this.undazzle();
        };

        this.die = function () {
            if (!this.dead) {
                game.score.add(GHOST_POINTS);
                //this.reset();
                this.dead = true;
                this.changeSpeed(game.ghostSpeedNormal);
            }
        };
        this.changeSpeed = function (s) {
            // adjust gridPosition to new speed
            this.posX = Math.round(this.posX / s) * s;
            this.posY = Math.round(this.posY / s) * s;
            this.speed = s;
        };

        this.move = function () {
            this.checkDirectionChange();
            this.checkCollision();

            // leave Ghost House
            if (this.ghostHouse == true) {
                // Clyde does not start chasing before 2/3 of all pills are eaten and if level is < 4
                if (this.name == GHOSTS.CLYDE) {
                    if (game.level < 4 || game.pillCount > 104 / 3) this.stop = true;
                    else this.stop = false;
                }
                // Inky starts after 30 pills and only from the third level on
                if (this.name == GHOSTS.INKY) {
                    if (game.level < 3 || game.pillCount > 104 - 30) this.stop = true;
                    else this.stop = false;
                }

                if (this.getGridPosY() == 5 && this.inGrid()) {
                    if (this.getGridPosX() == 7) this.setDirection(right);
                    if (this.getGridPosX() == 8 || this.getGridPosX() == 9) this.setDirection(up);
                    if (this.getGridPosX() == 10) this.setDirection(left);
                }
                if (this.getGridPosY() == 4 && (this.getGridPosX() == 8 || this.getGridPosX() == 9) && this.inGrid()) {
                    console.log('ghosthouse -> false');
                    this.ghostHouse = false;
                }
            }

            if (!this.stop) {
                // Move
                this.posX += this.speed * this.dirX;
                this.posY += this.speed * this.dirY;

                // Check if out of canvas
                if (this.posX >= game.width - this.radius) this.posX = this.speed - this.radius;
                if (this.posX <= 0 - this.radius) this.posX = game.width - this.speed - this.radius;
                if (this.posY >= game.height - this.radius) this.posY = this.speed - this.radius;
                if (this.posY <= 0 - this.radius) this.posY = game.height - this.speed - this.radius;
            }
        };

        this.checkCollision = function () {
            /* Check Back to Home */
            if (this.dead && this.getGridPosX() == this.startPosX / 30 && this.getGridPosY() == this.startPosY / 30)
                this.reset();
            else {
                /* Check Ghost / Pacman Collision			*/
                if (
                    between(pacman.getCenterX(), this.getCenterX() - 10, this.getCenterX() + 10) &&
                    between(pacman.getCenterY(), this.getCenterY() - 10, this.getCenterY() + 10)
                ) {
                    if (!this.dazzled && !this.dead) {
                        pacman.die();
                    } else {
                        this.die();
                    }
                }
            }
        };

        /* Pathfinding */
        this.getNextDirection = function () {
            // get next field
            var pX = this.getGridPosX();
            var pY = this.getGridPosY();
            game.getMapContent(pX, pY);
            var u, d, r, l; // option up, down, right, left

            // get target
            if (this.dead) {
                // go Home
                var tX = this.startPosX / 30;
                var tY = this.startPosY / 30;
            } else if (game.ghostMode == 0) {
                // Scatter Mode
                var tX = this.gridBaseX;
                var tY = this.gridBaseY;
            } else if (game.ghostMode == 1) {
                // Chase Mode

                switch (this.name) {
                    // target: 4 ahead and 4 left of pacman
                    case GHOSTS.PINKY:
                        var pdir = pacman.direction;
                        var pdirX = pdir.dirX == 0 ? -pdir.dirY : pdir.dirX;
                        var pdirY = pdir.dirY == 0 ? -pdir.dirX : pdir.dirY;

                        var tX = (pacman.getGridPosX() + pdirX * 4) % (game.width / pacman.radius + 1);
                        var tY = (pacman.getGridPosY() + pdirY * 4) % (game.height / pacman.radius + 1);
                        break;

                    // target: pacman
                    case GHOSTS.BLINKY:
                        var tX = pacman.getGridPosX();
                        var tY = pacman.getGridPosY();
                        break;

                    // target:
                    case GHOSTS.INKY:
                        var tX = pacman.getGridPosX() + 2 * pacman.direction.dirX;
                        var tY = pacman.getGridPosY() + 2 * pacman.direction.dirY;
                        var vX = tX - blinky.getGridPosX();
                        var vY = tY - blinky.getGridPosY();
                        tX = Math.abs(blinky.getGridPosX() + vX * 2);
                        tY = Math.abs(blinky.getGridPosY() + vY * 2);
                        break;

                    // target: pacman, until pacman is closer than 5 grid fields, then back to scatter
                    case GHOSTS.CLYDE:
                        var tX = pacman.getGridPosX();
                        var tY = pacman.getGridPosY();
                        var dist = Math.sqrt(Math.pow(pX - tX, 2) + Math.pow(pY - tY, 2));

                        if (dist < 5) {
                            tX = this.gridBaseX;
                            tY = this.gridBaseY;
                        }
                        break;
                }
            }
            var oppDir = this.getOppositeDirection(); // ghosts are not allowed to change direction 180�

            var dirs = [{}, {}, {}, {}];
            dirs[0].field = game.getMapContent(pX, pY - 1);
            dirs[0].dir = up;
            dirs[0].distance = Math.sqrt(Math.pow(pX - tX, 2) + Math.pow(pY - 1 - tY, 2));

            dirs[1].field = game.getMapContent(pX, pY + 1);
            dirs[1].dir = down;
            dirs[1].distance = Math.sqrt(Math.pow(pX - tX, 2) + Math.pow(pY + 1 - tY, 2));

            dirs[2].field = game.getMapContent(pX + 1, pY);
            dirs[2].dir = right;
            dirs[2].distance = Math.sqrt(Math.pow(pX + 1 - tX, 2) + Math.pow(pY - tY, 2));

            dirs[3].field = game.getMapContent(pX - 1, pY);
            dirs[3].dir = left;
            dirs[3].distance = Math.sqrt(Math.pow(pX - 1 - tX, 2) + Math.pow(pY - tY, 2));

            // Sort possible directions by distance
            function compare(a, b) {
                if (a.distance < b.distance) return -1;
                if (a.distance > b.distance) return 1;
                return 0;
            }
            var dirs2 = dirs.sort(compare);

            var r = this.dir;
            var j;

            if (this.dead) {
                for (var i = dirs2.length - 1; i >= 0; i--) {
                    if (dirs2[i].field != 'wall' && !dirs2[i].dir.equals(this.getOppositeDirection())) {
                        r = dirs2[i].dir;
                    }
                }
            } else {
                for (var i = dirs2.length - 1; i >= 0; i--) {
                    if (
                        dirs2[i].field != 'wall' &&
                        dirs2[i].field != 'door' &&
                        !dirs2[i].dir.equals(this.getOppositeDirection())
                    ) {
                        r = dirs2[i].dir;
                    }
                }
            }
            this.directionWatcher.set(r);
            return r;
        };
        this.setRandomDirection = function () {
            var dir = Math.floor(Math.random() * 10 + 1) % 5;

            switch (dir) {
                case 1:
                    if (this.getOppositeDirection().equals(up)) this.setDirection(down);
                    else this.setDirection(up);
                    break;
                case 2:
                    if (this.getOppositeDirection().equals(down)) this.setDirection(up);
                    else this.setDirection(down);
                    break;
                case 3:
                    if (this.getOppositeDirection().equals(right)) this.setDirection(left);
                    else this.setDirection(right);
                    break;
                case 4:
                    if (this.getOppositeDirection().equals(left)) this.setDirection(right);
                    else this.setDirection(left);
                    break;
            }
        };
        this.reverseDirection = function () {
            console.log('reverseDirection: ' + this.direction.name + ' to ' + this.getOppositeDirection().name);
            this.directionWatcher.set(this.getOppositeDirection());
        };
    }

    Ghost.prototype = new Figure();

    // Super Class for Pacman & Ghosts
    function Figure() {
        this.posX = 0;
        this.posY = 0;
        this.speed = 0;
        this.dirX = right.dirX;
        this.dirY = right.dirY;
        this.direction = null;
        this.stop = true;
        this.directionWatcher = new directionWatcher();
        this.getNextDirection = function () {
            console.log('Figure getNextDirection');
        };
        this.checkDirectionChange = function () {
            if (this.inGrid() && this.directionWatcher.get() == null) this.getNextDirection();
            if (this.directionWatcher.get() != null && this.inGrid()) {
                //console.log("changeDirection to "+this.directionWatcher.get().name);
                this.setDirection(this.directionWatcher.get());
                this.directionWatcher.set(null);
            }
        };

        this.inGrid = function () {
            if (this.posX % (2 * this.radius) === 0 && this.posY % (2 * this.radius) === 0) return true;
            return false;
        };
        this.getOppositeDirection = function () {
            if (this.direction.equals(up)) return down;
            else if (this.direction.equals(down)) return up;
            else if (this.direction.equals(right)) return left;
            else if (this.direction.equals(left)) return right;
        };
        this.move = function () {
            if (!this.stop) {
                this.posX += this.speed * this.dirX;
                this.posY += this.speed * this.dirY;

                // Check if out of canvas
                if (this.posX >= game.width - this.radius) this.posX = this.speed - this.radius;
                if (this.posX <= 0 - this.radius) this.posX = game.width - this.speed - this.radius;
                if (this.posY >= game.height - this.radius) this.posY = this.speed - this.radius;
                if (this.posY <= 0 - this.radius) this.posY = game.height - this.speed - this.radius;
            }
        };
        this.stop = function () {
            this.stop = true;
        };
        this.start = function () {
            this.stop = false;
        };

        this.getGridPosX = function () {
            return (this.posX - (this.posX % 30)) / 30;
        };
        this.getGridPosY = function () {
            return (this.posY - (this.posY % 30)) / 30;
        };
        this.setDirection = function (dir) {
            this.dirX = dir.dirX;
            this.dirY = dir.dirY;
            this.angle1 = dir.angle1;
            this.angle2 = dir.angle2;
            this.direction = dir;
        };
        this.setPosition = function (x, y) {
            this.posX = x;
            this.posY = y;
        };
    }

    function Pacman() {
        this.radius = 15;
        this.posX = 0;
        this.posY = 6 * 2 * this.radius;
        this.speed = 5;
        this.angle1 = 0.25;
        this.angle2 = 1.75;
        this.mouth = 1; /* Switches between 1 and -1, depending on mouth closing / opening */
        this.dirX = right.dirX;
        this.dirY = right.dirY;
        this.lives = 3;
        this.stuckX = 0;
        this.stuckY = 0;
        this.frozen = false; // used to play die Animation
        this.freeze = function () {
            this.frozen = true;
        };
        this.unfreeze = function () {
            this.frozen = false;
        };
        this.getCenterX = function () {
            return this.posX + this.radius;
        };
        this.getCenterY = function () {
            return this.posY + this.radius;
        };
        this.directionWatcher = new directionWatcher();

        this.direction = right;

        this.beastMode = false;
        this.beastModeTimer = 0;

        this.checkCollisions = function () {
            if (this.stuckX == 0 && this.stuckY == 0 && this.frozen == false) {
                // Get the Grid Position of Pac
                var gridX = this.getGridPosX();
                var gridY = this.getGridPosY();
                var gridAheadX = gridX;
                var gridAheadY = gridY;

                var field = game.getMapContent(gridX, gridY);

                // get the field 1 ahead to check wall collisions
                if (this.dirX == 1 && gridAheadX < 17) gridAheadX += 1;
                if (this.dirY == 1 && gridAheadY < 12) gridAheadY += 1;
                var fieldAhead = game.getMapContent(gridAheadX, gridAheadY);

                /*	Check Pill Collision			*/
                if (field === 'pill' || field === 'powerpill') {
                    //console.log("Pill found at ("+gridX+"/"+gridY+"). Pacman at ("+this.posX+"/"+this.posY+")");
                    if (
                        (this.dirX == 1 &&
                            between(this.posX, game.toPixelPos(gridX) + this.radius - 5, game.toPixelPos(gridX + 1))) ||
                        (this.dirX == -1 && between(this.posX, game.toPixelPos(gridX), game.toPixelPos(gridX) + 5)) ||
                        (this.dirY == 1 &&
                            between(this.posY, game.toPixelPos(gridY) + this.radius - 5, game.toPixelPos(gridY + 1))) ||
                        (this.dirY == -1 && between(this.posY, game.toPixelPos(gridY), game.toPixelPos(gridY) + 5)) ||
                        fieldAhead === 'wall'
                    ) {
                        var s;
                        if (field === 'powerpill') {
                            Sound.play('powerpill');
                            s = POWERPILL_POINTS;
                            this.enableBeastMode();
                            game.startGhostFrightened();
                        } else {
                            Sound.play('waka');
                            s = PILL_POINTS;
                            game.pillCount--;
                        }
                        game.map.posY[gridY].posX[gridX].type = 'null';
                        game.score.add(s);
                    }
                }

                /*	Check Wall Collision			*/
                if (fieldAhead === 'wall' || fieldAhead === 'door') {
                    this.stuckX = this.dirX;
                    this.stuckY = this.dirY;
                    pacman.stop();
                    // get out of the wall
                    if (this.stuckX == 1 && (this.posX % 2) * this.radius != 0) this.posX -= 5;
                    if (this.stuckY == 1 && (this.posY % 2) * this.radius != 0) this.posY -= 5;
                    if (this.stuckX == -1) this.posX += 5;
                    if (this.stuckY == -1) this.posY += 5;
                }
            }
        };

        this.checkDirectionChange = function () {
            if (this.directionWatcher.get() != null) {
                console.groupCollapsed('checkDirectionChange');
                //console.log("next Direction: "+directionWatcher.get().name);

                if (this.stuckX == 1 && this.directionWatcher.get() == right) this.directionWatcher.set(null);
                else {
                    // reset stuck events
                    this.stuckX = 0;
                    this.stuckY = 0;

                    // only allow direction changes inside the grid
                    if (this.inGrid()) {
                        //console.log("changeDirection to "+directionWatcher.get().name);

                        // check if possible to change direction without getting stuck
                        console.debug('x: ' + this.getGridPosX() + ' + ' + this.directionWatcher.get().dirX);
                        console.debug('y: ' + this.getGridPosY() + ' + ' + this.directionWatcher.get().dirY);
                        var x = this.getGridPosX() + this.directionWatcher.get().dirX;
                        var y = this.getGridPosY() + this.directionWatcher.get().dirY;
                        if (x <= -1) x = game.width / (this.radius * 2) - 1;
                        if (x >= game.width / (this.radius * 2)) x = 0;
                        if (y <= -1) x = game.height / (this.radius * 2) - 1;
                        if (y >= game.heigth / (this.radius * 2)) y = 0;

                        console.debug('x: ' + x);
                        console.debug('y: ' + y);
                        var nextTile = game.map.posY[y].posX[x].type;
                        console.debug('checkNextTile: ' + nextTile);

                        if (nextTile != 'wall') {
                            this.setDirection(this.directionWatcher.get());
                            this.directionWatcher.set(null);
                        }
                    }
                }
                console.groupEnd();
            }
        };
        this.setDirection = function (dir) {
            if (!this.frozen) {
                this.dirX = dir.dirX;
                this.dirY = dir.dirY;
                this.angle1 = dir.angle1;
                this.angle2 = dir.angle2;
                this.direction = dir;
            }
        };
        this.enableBeastMode = function () {
            this.beastMode = true;
            this.beastModeTimer = 240;
            console.debug('Beast Mode activated!');
            inky.dazzle();
            pinky.dazzle();
            blinky.dazzle();
            clyde.dazzle();
        };
        this.disableBeastMode = function () {
            this.beastMode = false;
            console.debug('Beast Mode is over!');
            inky.undazzle();
            pinky.undazzle();
            blinky.undazzle();
            clyde.undazzle();
        };
        this.move = function () {
            if (!this.frozen) {
                if (this.beastModeTimer > 0) {
                    this.beastModeTimer--;
                    //console.log("Beast Mode: "+this.beastModeTimer);
                }
                if (this.beastModeTimer == 0 && this.beastMode == true) this.disableBeastMode();

                this.posX += this.speed * this.dirX;
                this.posY += this.speed * this.dirY;

                // Check if out of canvas
                if (this.posX >= game.width - this.radius) this.posX = 5 - this.radius;
                if (this.posX <= 0 - this.radius) this.posX = game.width - 5 - this.radius;
                if (this.posY >= game.height - this.radius) this.posY = 5 - this.radius;
                if (this.posY <= 0 - this.radius) this.posY = game.height - 5 - this.radius;
            } else this.dieAnimation();
        };

        this.eat = function () {
            if (!this.frozen) {
                if ((this.dirX == this.dirY) == 0) {
                    this.angle1 -= this.mouth * 0.07;
                    this.angle2 += this.mouth * 0.07;

                    var limitMax1 = this.direction.angle1;
                    var limitMax2 = this.direction.angle2;
                    var limitMin1 = this.direction.angle1 - 0.21;
                    var limitMin2 = this.direction.angle2 + 0.21;

                    if (this.angle1 < limitMin1 || this.angle2 > limitMin2) {
                        this.mouth = -1;
                    }
                    if (this.angle1 >= limitMax1 || this.angle2 <= limitMax2) {
                        this.mouth = 1;
                    }
                }
            }
        };
        this.stop = function () {
            this.dirX = 0;
            this.dirY = 0;
        };
        this.reset = function () {
            this.unfreeze();
            this.posX = 0;
            this.posY = 6 * 2 * this.radius;
            this.setDirection(right);
            this.stop();
            this.stuckX = 0;
            this.stuckY = 0;
            //console.log("reset pacman");
        };
        this.dieAnimation = function () {
            this.angle1 += 0.05;
            this.angle2 -= 0.05;
            if (this.angle1 >= this.direction.angle1 + 0.7 || this.angle2 <= this.direction.angle2 - 0.7) {
                this.dieFinal();
            }
        };
        this.die = function () {
            Sound.play('die');
            this.freeze();
            this.dieAnimation();
        };
        this.dieFinal = function () {
            this.reset();
            pinky.reset();
            inky.reset();
            blinky.reset();
            clyde.reset();
            this.lives--;
            console.log('pacman died, ' + this.lives + ' lives left');
            if (this.lives <= 0) {
                game.endGame();
                game.showHighscoreForm();
            }
            game.drawHearts(this.lives);
        };
        this.getGridPosX = function () {
            return (this.posX - (this.posX % 30)) / 30;
        };
        this.getGridPosY = function () {
            return (this.posY - (this.posY % 30)) / 30;
        };
    }
    Pacman.prototype = new Figure();
    const pacman = new Pacman();
    game.buildWalls();

    // Action starts here:

    function renderContent() {
        // Refresh Score
        game.score.refresh('.score');

        // Pills
        context.beginPath();
        context.fillStyle = 'White';
        context.strokeStyle = 'White';

        var dotPosY;
        if (game.map && game.map.posY && game.map.posY.length > 0) {
            game.map.posY.forEach(function (row, i) {
                dotPosY = row.row;
                row.posX.forEach(function (column, j) {
                    if (column.type == 'pill') {
                        context.arc(
                            game.toPixelPos(column.col - 1) + pacman.radius,
                            game.toPixelPos(dotPosY - 1) + pacman.radius,
                            game.pillSize,
                            0 * Math.PI,
                            2 * Math.PI,
                        );
                        context.moveTo(game.toPixelPos(column.col - 1), game.toPixelPos(dotPosY - 1));
                    } else if (column.type == 'powerpill') {
                        context.arc(
                            game.toPixelPos(column.col - 1) + pacman.radius,
                            game.toPixelPos(dotPosY - 1) + pacman.radius,
                            game.powerpillSizeCurrent,
                            0 * Math.PI,
                            2 * Math.PI,
                        );
                        context.moveTo(game.toPixelPos(column.col - 1), game.toPixelPos(dotPosY - 1));
                    }
                });
            });
        } else {
            console.warn('Map not loaded (yet).');
        }

        context.fill();

        // Walls
        context.drawImage(canvas_walls, 0, 0);

        if (game.started) {
            // Ghosts
            pinky.draw(context);
            blinky.draw(context);
            inky.draw(context);
            clyde.draw(context);

            // Pac Man
            context.beginPath();
            context.fillStyle = 'Yellow';
            context.strokeStyle = 'Yellow';
            context.arc(
                pacman.posX + pacman.radius,
                pacman.posY + pacman.radius,
                pacman.radius,
                pacman.angle1 * Math.PI,
                pacman.angle2 * Math.PI,
            );
            context.lineTo(pacman.posX + pacman.radius, pacman.posY + pacman.radius);
            context.stroke();
            context.fill();
        }
    }

    // TODO: only for debugging
    function renderGrid(gridPixelSize, color) {
        context.save();
        context.lineWidth = 0.5;
        context.strokeStyle = color;

        // horizontal grid lines
        for (var i = 0; i <= canvas.height; i = i + gridPixelSize) {
            context.beginPath();
            context.moveTo(0, i);
            context.lineTo(canvas.width, i);
            context.closePath();
            context.stroke();
        }

        // vertical grid lines
        for (var i = 0; i <= canvas.width; i = i + gridPixelSize) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, canvas.height);
            context.closePath();
            context.stroke();
        }

        context.restore();
    }

    function animationLoop() {
        // if (gameOver) return;

        canvas.width = canvas.width;
        // enable next line to show grid
        // renderGrid(pacman.radius, "red");
        renderContent();

        if (game.dieAnimation == 1) pacman.dieAnimation();
        if (game.pause !== true) {
            // Make changes before next loop
            pacman.move();
            pacman.eat();
            pacman.checkDirectionChange();
            pacman.checkCollisions(); // has to be the LAST method called on pacman

            blinky.move();
            inky.move();
            pinky.move();
            clyde.move();

            game.checkGhostMode();

            // All dots collected?
            game.checkForLevelUp();
        }

        //requestAnimationFrame(animationLoop);
        setTimeout(animationLoop, game.refreshRate);
    }
    return {
        game,
        pacman,
        up,
        down,
        left,
        right,
        renderContent,
        logger,
    };
}

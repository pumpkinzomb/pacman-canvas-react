import './App.css';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import Web3 from 'web3';
import { geronimo } from './utils/pacman-canvas';
import HighScore from './components/HighScore';
import Instructions from './components/Instructions';
import Info from './components/Info';
import Description from './components/Description';
import { ABI } from './contracts/Pacman';
import { findAllInRenderedTree } from 'react-dom/test-utils';

const injected = new InjectedConnector();
const web3 = new Web3(Web3.givenProvider || 'https://ropsten.infura.io/v3/a07cd96ad0bb435f9e750c8faa672052');
const dappUri = 'pacman-web3.herokuapp.com';
const CA = '0x4BCa824Da8A04b9230eD2c96DDAdB1eAf9299b90';
const PacmanContract = new web3.eth.Contract(ABI, CA);

function App() {
    const [init, setInit] = useState(false);
    const [pacmanControl, setPacmanControl] = useState(null);
    const [soundOn, setSoundOn] = useState(false);
    const [showHighScore, setShowHighScore] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showGameContents, setShowGameContents] = useState(true);
    const [showControl, setShowControl] = useState(true);
    const [heartCount, setHeartCount] = useState(3);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [playerName, setPlayerName] = useState('');
    const [highScoreList, setHighScoreList] = useState([]);
    const [canvasContainer, setCanvasContainer] = useState({
        show: true,
        gameover: false,
        fakeScore: false,
        title: 'Pacman Canvas',
        text: 'Click to Play',
    });
    const [submitValidation, setSubmitValidation] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const canvasRef = useRef();
    const { connector, library, chainId, account, active, error, activate } = useWeb3React();

    useEffect(() => {
        return () => {
            window.removeEventListener('keydown', doKeyDown);
        };
    }, []);

    useEffect(() => {
        if (chainId && chainId !== 3) {
            changeToRopstenChain();
        }
    }, [chainId]);

    useEffect(() => {
        if (account) {
            getBalance();
        }
    }, [account]);

    useEffect(() => {
        if (canvasRef.current && pacmanControl === null) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            const controller = geronimo({
                canvas,
                context,
                handleChangeCanvasContainer,
                handleShowControl,
                setHeartCount,
                setLevel,
                setScore,
                setSubmitValidation,
            });
            setPacmanControl(controller);
        }
    }, [canvasRef]);

    useEffect(() => {
        if (!init && pacmanControl?.game) {
            window.addEventListener('keydown', doKeyDown, true);
            pacmanControl.game.init(0);
            pacmanControl.renderContent();
            setInit(true);
            if (process.env.NODE_ENV === 'production') {
                pacmanControl.logger.disableLogger();
            }
            handleConnectWallet();
        }
    }, [pacmanControl]);

    const changeToRopstenChain = async () => {
        await web3.currentProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x3' }],
        });
    };

    const getBalance = async () => {
        const balance = await web3.eth.getBalance(account);
        console.log('account balance: ', balance);
    };

    const handleConnectWallet = async () => {
        try {
            await activate(injected, (error) => {
                // 크롬 익스텐션 없을 경우 오류 핸들링
                console.log('wallet error:', error);
                throw error;
            });
        } catch (err) {
            // console.error(err.message);
            // alert(err.message);
            if (err.code === -32603 || err.message.includes('No Ethereum provider was found on window.ethereum.')) {
                window.open(`https://metamask.app.link/dapp/${dappUri}`);
            }
        }
    };

    const handleChangeCanvasContainer = (params) => {
        setCanvasContainer({
            ...canvasContainer,
            ...params,
        });
    };

    const handlePauseToggle = () => {
        // pause / resume game on canvas click
        if (!(pacmanControl.game.gameOver === true)) {
            pacmanControl.game.pauseResume();
        }
    };

    const handleChangePlayerName = (event) => {
        if (event.target.value !== '') {
            setSubmitValidation(null);
        }
        setPlayerName(event.target.value);
    };

    const handleSubmitScore = () => {
        if (playerName === '') {
            setSubmitValidation(false);
        } else {
            setSubmitValidation(true);
            addHighscore();
        }
    };

    const getHighscore = async () => {
        let getScoreList = [];
        if (active) {
            getScoreList = await PacmanContract.methods.getAllScore().call();
            if (Array.isArray(getScoreList) && getScoreList.length > 0) {
                getScoreList = getScoreList.map((item) => {
                    return {
                        account: item['scoreAddress'],
                        score: item['scoreCount'],
                        name: item['scoreName'],
                    };
                });
            }
        } else {
            getScoreList = localStorage.getItem('pacman_highscore');
            if (getScoreList === null) {
                getScoreList = [];
            } else {
                getScoreList = JSON.parse(getScoreList);
            }
        }
        getScoreList = getScoreList.sort((a, b) => {
            return b.score - a.score;
        });
        setHighScoreList(getScoreList);
    };

    const addHighscore = async () => {
        if (active) {
            setSubmitLoading(true);
            try {
                await PacmanContract.methods
                    .addScore(playerName, score)
                    .send({ from: account, value: Web3.utils.toWei('0.01', 'ether') });
            } catch (error) {
                console.log('add score failed: ', error);
            }
            setSubmitLoading(false);
        } else {
            let getScoreList = localStorage.getItem('pacman_highscore');
            if (getScoreList === null) {
                getScoreList = [];
            } else {
                getScoreList = JSON.parse(getScoreList);
            }
            setSubmitLoading(true);
            getScoreList = getScoreList.concat({
                name: playerName,
                score,
            });
            setHighScoreList(getScoreList);
            localStorage.setItem('pacman_highscore', JSON.stringify(getScoreList));
            setSubmitLoading(false);
        }
    };

    // Mobile Control Buttons
    const handleUp = (event) => {
        event.preventDefault();
        pacmanControl.pacman.directionWatcher.set(pacmanControl.up);
    };

    const handleDown = (event) => {
        event.preventDefault();
        pacmanControl.pacman.directionWatcher.set(pacmanControl.down);
    };

    const handleLeft = (event) => {
        event.preventDefault();
        pacmanControl.pacman.directionWatcher.set(pacmanControl.left);
    };

    const handleRight = (event) => {
        event.preventDefault();
        pacmanControl.pacman.directionWatcher.set(pacmanControl.right);
    };

    const handleClickSound = (event) => {
        if (pacmanControl.game.soundfx === 0) {
            setSoundOn(true);
        } else {
            setSoundOn(false);
        }
        pacmanControl.game.toggleSound();
    };

    const handleClickNewgame = (event) => {
        pacmanControl.game.newGame();
    };

    const handleClickHighScore = (event) => {
        getHighscore();
        setShowGameContents(false);
        setShowHighScore(!showHighScore);
    };

    const handleClickInstruction = (event) => {
        setShowGameContents(false);
        setShowInstructions(!showInstructions);
    };

    const handleClickInfo = (event) => {
        setShowGameContents(false);
        setShowInfo(!showInfo);
    };

    const handleBackGameContents = (event) => {
        setShowGameContents(true);
        setShowHighScore(false);
        setShowInfo(false);
        setShowInstructions(false);
    };

    const handleShowControl = (flag) => {
        setShowControl(flag);
    };

    const doKeyDown = (evt) => {
        switch (evt.keyCode) {
            case 38: // UP Arrow Key pressed
                evt.preventDefault();
            case 87: // W pressed
                if (!(pacmanControl.game.gameOver === true)) {
                    pacmanControl.pacman.directionWatcher.set(pacmanControl.up);
                }
                break;
            case 40: // DOWN Arrow Key pressed
                evt.preventDefault();
            case 83: // S pressed
                if (!(pacmanControl.game.gameOver === true)) {
                    pacmanControl.pacman.directionWatcher.set(pacmanControl.down);
                }
                break;
            case 37: // LEFT Arrow Key pressed
            case 65: // A pressed
                if (!(pacmanControl.game.gameOver === true)) {
                    pacmanControl.pacman.directionWatcher.set(pacmanControl.left);
                }
                break;
            case 39: // RIGHT Arrow Key pressed
            case 68: // D pressed
                pacmanControl.pacman.directionWatcher.set(pacmanControl.right);
                break;
            case 78: // N pressed
                if (!(pacmanControl.game.gameOver === true)) {
                    pacmanControl.game.pause = 1;
                    pacmanControl.game.newGame();
                }
                break;
            case 77: // M pressed
                if (!(pacmanControl.game.gameOver === true)) {
                    handleClickSound();
                }
                break;
            case 8: // Backspace pressed -> show Game Content
                handleBackGameContents();
                break;
            case 27: // ESC pressed -> show Game Content
                handleBackGameContents();
                break;
            case 32: // SPACE pressed -> pause Game
                if (!(pacmanControl.game.gameOver === true)) {
                    pacmanControl.game.pauseResume();
                }
                break;
        }
    };

    return (
        <div className="container">
            <div className="main">
                {showHighScore && (
                    <HighScore onBackGameContents={handleBackGameContents} highScoreList={highScoreList} />
                )}
                {showInstructions && <Instructions onBackGameContents={handleBackGameContents} />}
                {showInfo && <Info onBackGameContents={handleBackGameContents} />}
                <div className={`content ${showGameContents ? 'show' : ''}`} id="game-content">
                    <div className="account-section">
                        {active ? (
                            <span>
                                Account:&nbsp;
                                {account?.slice(0, 6)}...{account?.slice(-6)}
                            </span>
                        ) : (
                            <span className="button" id="connect-wallet" onClick={handleConnectWallet}>
                                wallet
                            </span>
                        )}
                    </div>

                    <div className="game wrapper">
                        <div className="score">{`Score: ${score}`}&nbsp;</div>
                        <div className="level">{`Lvl: ${level}`}&nbsp;</div>
                        <div className="lives">
                            {'Lives: '}
                            {[...Array(heartCount)].map((item, i) => {
                                return (
                                    <React.Fragment key={i}>
                                        {' '}
                                        <img src="images/heart.png" />
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        <div className={`controlSound ${soundOn ? 'on' : ''}`} onClick={handleClickSound}>
                            <img src="images/audio-icon-mute.png" id="mute" />
                        </div>

                        <div id="canvas-container" onClick={handlePauseToggle}>
                            {canvasContainer.show && (
                                <div id="canvas-overlay-container">
                                    <div id="canvas-overlay-content">
                                        <div
                                            id="title"
                                            dangerouslySetInnerHTML={{ __html: canvasContainer.title }}
                                        ></div>
                                        <div>
                                            <p id="text" dangerouslySetInnerHTML={{ __html: canvasContainer.text }}></p>
                                            {canvasContainer.gameover &&
                                                (canvasContainer.fakeScore ? (
                                                    <div id="highscore-form">
                                                        {submitValidation === true ? (
                                                            submitLoading ? (
                                                                'Saving highscore...'
                                                            ) : (
                                                                <span
                                                                    className="button"
                                                                    id="show-highscore"
                                                                    onClick={handleClickHighScore}
                                                                >
                                                                    View Highscore List
                                                                </span>
                                                            )
                                                        ) : (
                                                            <React.Fragment>
                                                                <span id="form-validator">
                                                                    {submitValidation === null ? (
                                                                        ''
                                                                    ) : (
                                                                        <React.Fragment>
                                                                            Please enter a name
                                                                            <br />
                                                                        </React.Fragment>
                                                                    )}
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    id="playerName"
                                                                    onChange={handleChangePlayerName}
                                                                    value={playerName}
                                                                />
                                                                <span
                                                                    className="button"
                                                                    id="score-submit"
                                                                    onClick={handleSubmitScore}
                                                                >
                                                                    save
                                                                </span>
                                                            </React.Fragment>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div id="invalid-score">
                                                        Your score looks fake, the highscore list is only for honest
                                                        players ;)
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <canvas id="myCanvas" width="540" height="390" ref={canvasRef}>
                                <p>Canvas not supported</p>
                            </canvas>
                        </div>

                        {showControl ? (
                            <div className="controls" id="menu-buttons">
                                <ul>
                                    <li className="button" id="newGame" onClick={handleClickNewgame}>
                                        New Game
                                    </li>
                                    <li className="button" id="highscore" onClick={handleClickHighScore}>
                                        Highscore
                                    </li>
                                    <li className="button" id="instructions" onClick={handleClickInstruction}>
                                        Instructions
                                    </li>
                                    <li className="button" id="info" onClick={handleClickInfo}>
                                        Info
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <div className="controls" id="game-buttons">
                                <div>
                                    <span id="up" className="controlButton" onMouseDown={handleUp}>
                                        &uarr;
                                    </span>
                                </div>
                                <div>
                                    <span id="left" className="controlButton" onMouseDown={handleLeft}>
                                        &larr;
                                    </span>
                                    <span id="down" className="controlButton" onMouseDown={handleDown}>
                                        &darr;
                                    </span>
                                    <span id="right" className="controlButton" onMouseDown={handleRight}>
                                        &rarr;
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <Description />
                </div>
            </div>
        </div>
    );
}

export default App;

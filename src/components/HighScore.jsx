import React from 'react';

const HighScore = (props) => {
    const { onBackGameContents, highScoreList } = props;
    return (
        <div className="content" id="highscore-content">
            <div className="button" id="back" onClick={onBackGameContents}>
                &lt; back
            </div>
            <div>
                <h1>Highscore</h1>
                {highScoreList.length > 0 && (
                    <ol id="highscore-list">
                        {highScoreList.map((item, index) => {
                            return (
                                <li key={index}>
                                    {item.account && (
                                        <React.Fragment>
                                            <a
                                                href={`https://ropsten.etherscan.io/address/${item.account}`}
                                                target="_blank"
                                            >
                                                {item.account?.slice(0, 6)}...{item.account?.slice(-6)}
                                            </a>
                                            &nbsp;
                                        </React.Fragment>
                                    )}
                                    {item.name}
                                    <span id="score">{item.score}</span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </div>
    );
};
export default HighScore;

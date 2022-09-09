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
                        {highScoreList.map((item) => {
                            return (
                                <li>
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

const Info = (props) => {
    const { onBackGameContents } = props;
    return (
        <div className="content" id="info-content">
            <div className="button" id="back" onClick={onBackGameContents}>
                &lt; back
            </div>
            <div>
                <h1>Info</h1>
                <p>
                    Current Version: <span className="app-version">1.0.6 (2022-08-14)</span>
                </p>
                <img src="images/platzh1rsch-logo.png" />
                <p>
                    Pacman Canvas is Open Source, written by <a href="http://platzh1rsch.ch">platzh1rsch</a>. You can
                    get the code on{' '}
                    <a target="_blank" href="https://github.com/platzhersh/pacman-canvas">
                        github
                    </a>
                    .
                </p>
            </div>
        </div>
    );
};
export default Info;

const Instructions = (props) => {
    const { onBackGameContents } = props;
    return (
        <div className="content" id="instructions-content" onClick={onBackGameContents}>
            <div className="button" id="back">
                &lt; back
            </div>
            <div>
                <h1>Instructions</h1>
                <div className="nomobile">
                    <h2>Controls</h2>
                    <p>Use your arrow keys or [W,A,S,D] keys to navigate pacman.</p>
                    <p>To pause / resume the game press [SPACE] or [ESC] or just click into the game area.</p>
                </div>
                <div className="mobile">
                    <h2>Controls</h2>
                    <p>Use swipe gestures to navigate pacman.</p>
                    <p>Alternatively use the Arrow Buttons underneath the game area to navigate pacman.</p>
                    <p>To pause / resume the game, touch the game area once.</p>
                </div>

                <div>
                    <h2>Ghosts</h2>
                    <p>Ghosts are creatures that hunt pacman and will kill him if they catch him.</p>
                    <p>Every ghost has its own strategy to chase down pacman.</p>
                    <h3>
                        Inky
                        <img src="images/inky.svg" className="pull-right" />
                    </h3>
                    Inky will stay in the ghost house until pacman has eaten at least 30 pills. His home is the bottom
                    right corner.
                    <h3>
                        Blinky <img src="images/blinky.svg" className="pull-right" />
                    </h3>
                    Blinky is the most agressive of the 4 ghosts. He will start chasing pacman right away, and aim
                    directly at him. His home is the upper right corner.
                    <h3>
                        Pinky
                        <img src="images/pinky.svg" className="pull-right" />
                    </h3>
                    Pinky will start chasing pacman right away, he will always aim 4 fields ahead and 4 fields left of
                    pacman. His home is the upper left corner.
                    <h3>
                        Clyde
                        <img src="images/clyde.svg" className="pull-right" />
                    </h3>
                    Inky will stay in the ghost house until pacman has eaten at least 2/3 of all pills. His home is the
                    bottom left corner.
                </div>

                <div>
                    <h2>Ghost moods</h2>
                    The ghosts have two different moods that change the way they act during the game.
                    <h3>Scatter mood</h3>
                    <p>
                        This is the default mood. When ghosts are in scatter mood, they will just go to their home
                        corner and stay there.
                    </p>
                    <img src="images/instructions/instructions_scatter.PNG" />
                    <h3>Chase mood</h3>
                    <p>
                        After a certain time the ghosts change their mood and want to go chasing pacman. This is
                        indicated through the walls turning red.
                    </p>
                    <img src="images/instructions/instructions_chase.PNG" />
                </div>

                <div>
                    <h2>Items</h2>
                    <h3>Pills</h3>
                    <p>
                        The goal of every level is, to eat all the white pills without getting catched by the ghosts.
                        One pill results in 10 points.
                    </p>
                    <h3>Powerpills</h3>
                    <p>
                        In every level there are 4 powerpills, which are a bit bigger than the regular ones. If Pacman
                        eats those, he will get strong enough to eat the ghosts. You can see this indicated by the
                        ghosts turning blue. One powerpill results in 50 points.
                    </p>
                    <img src="images/instructions/instructions_powerpill.PNG" />
                    <p>
                        Eating a ghost results in 100 points. The soul of the ghost will return to the ghost house
                        before starting to chase Pacman again.
                    </p>
                </div>
            </div>
        </div>
    );
};
export default Instructions;

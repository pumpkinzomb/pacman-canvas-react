const Description = (props) => {
    return (
        <div className="description nomobile">
            <p>
                This whole thing was written in HTML5, CSS3 and Javascript (using small bits of jquery). For the basics
                I was following the{' '}
                <a href="http://devhammer.net/blog/exploring-html5-canvas-part-1---introduction" target="_blank">
                    "Exploring HTML5 Canvas"
                </a>{' '}
                Tutorials (Part 1 - 6) by Devhammer. Thanks for the great Tutorial!
            </p>
            <p>
                For some other stuff, like how to write objectorientated javascript I was following the tutorials over
                at{' '}
                <a href="http://www.codecademy.com/" target="_blank">
                    http://www.codecademy.com/
                </a>
                , which is a really great site to learn Javascript and also other languages.
            </p>
            <p>
                If you understand German you can also read my blogpost about this site:{' '}
                <a href="http://blog.platzh1rsch.ch/2012/08/pacman-in-html5-canvas.html">"Pacman in HTML5 Canvas"</a>.
            </p>
        </div>
    );
};
export default Description;

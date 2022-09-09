const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8080;
const PILL_POINTS = 10;
const POWERPILL_POINTS = 50;
const GHOST_POINTS = 100;

const validateScoreWithLevel = function (score, level) {
    const maxLevelPointsPills = 104 * PILL_POINTS;
    const maxLevelPointsPowerpills = 4 * POWERPILL_POINTS;
    const maxLevelPointsGhosts = 4 * 4 * GHOST_POINTS;
    const maxLevelPoints = maxLevelPointsPills + maxLevelPointsPowerpills + maxLevelPointsGhosts;

    const scoreIsValid = score / level <= maxLevelPoints;
    // console.log('validate score. score: ' + this.score.score + ', level: ' + this.level, scoreIsValid);
    return scoreIsValid;
};

const myLogger = function (req, res, next) {
    console.log('GET ' + req.path);
    next();
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(myLogger);
app.use(express.static(__dirname + './../build'));

app.get('/', function (req, res, next) {
    res.sendFile('/index.html');
});

app.post('/validatescore', function (req, res, next) {
    const { score, level } = req.body;
    const result = validateScoreWithLevel(score, level);
    res.json({
        result,
    });
});

app.listen(PORT, () => console.log('Server started at port:' + PORT));

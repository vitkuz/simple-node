const path = require('path');
const chalk = require('chalk');
const dotenv = require('dotenv');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const expressStatusMonitor = require('express-status-monitor');

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');

/**
* Load environment variables from .env file, where API keys and passwords are configured.
*/
dotenv.load({ path: '.env' });

const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
mongoose.connection.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
    process.exit();
});

app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 3000);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
    store: new MongoStore({
        url: process.env.MONGODB_URI,
        autoReconnect: true,
    })
}));

app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

app.get('/', (req,res) => {
    res.render('home');
});


app.get('/health', (req,res) => {
    console.log('App is healthy');
    res.json({
        message: 'App is healthy'
    })
});

app.get('/delay/:sec', (req,res) => {
    console.log(`Response with delay=${req.params.sec / 1000}sec`);
    setTimeout(() => {
        res.json({
            message: `Response with delay=${req.params.sec / 1000}sec`
        })
    }, req.params.sec || 0);
});

app.get('/kill', (req,res) => {
    console.log('App was intentionally killed');
    process.exit();
});

/**
 * Error Handler.
 */
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server Error', err);
});

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
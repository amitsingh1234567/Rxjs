const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Bring All Routes
const tourRoutes = require('./routes/tourRoutes');
const userRoutes = require('./routes/userRoutes');
const AppError = require('./utilities/appError');
const globalErrorHandler = require('./controllers/errorController');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

// Serving static file
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Morgan Development logging
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

// Limit requrest from same API
const limiter = rateLimit({
    max: 5,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});

app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(bodyParser.json({limit: '10kb'}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitizition aganist XSS -> (Cross Side Scripting) if user put <html></html> code xss() breakout html code
app.use(xss());

// Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);


// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date()
    // console.log(req.requestTime)
    // console.log(req.headers);
    next();
});

// 2) ROUTES
app.get('/', (req, res) => {
    res.status(200).render('base');
})

app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reviews', reviewRouter);


app.all('*', (req, res, next) => {
    // const err = new Error(`Can't find ${req.originalUrl} on this server`);
    // err.status = 'fail';
    // err.statusCode = 404;
    // next(err);

    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));

});

app.use(globalErrorHandler);
console.log('Ok Ok') 
module.exports = app;
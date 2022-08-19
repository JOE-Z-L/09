const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const path = require("path");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRouter = require("./routes/viewRoutes");
const csp = require("express-csp");


const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Set security http

app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "https:", "http:", "data:", "ws:"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "http:", "data:"],
      scriptSrc: ["'self'", "https:", "http:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  })
);

csp.extend(app, {
  policy: {
    directives: {
      "default-src": ["self"],
      "style-src": ["self", "unsafe-inline", "https:"],
      "font-src": ["self", "https://fonts.gstatic.com"],
      "script-src": [
        "self",
        "unsafe-inline",
        "data",
        "blob",
        "https://js.stripe.com",
        "https://api.mapbox.com"
      ],
      "worker-src": [
        "self",
        "unsafe-inline",
        "data:",
        "blob:",
        "https://js.stripe.com",
        "https://api.mapbox.com"
      ],
      "frame-src": [
        "self",
        "unsafe-inline",
        "data:",
        "blob:",
        "https://js.stripe.com",
        "https://api.mapbox.com"
      ],
      "img-src": [
        "self",
        "unsafe-inline",
        "data:",
        "blob:",
        "https://js.stripe.com",
        "https://api.mapbox.com"
      ],
      "connect-src": [
        "self",
        "unsafe-inline",
        "data:",
        "blob:",
        "https://api.mapbox.com",
        "https://events.mapbox.com"
      ]
    }
  }
});

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws://127.0.0.1:*"],
      scriptSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js",
        "ajax.googleapis.com *"
      ],
      styleSrc: ["'self'", "fonts.googleapis.com"],
      fontSrc: ["fonts.gstatic.com"],
      upgradeInsecureRequests: []
    }
  })
);



app.use(function(req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' https://cdnjs.cloudflare.com"
  );
  next();
});


// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
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
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
// app.use('/api/v1/bookings', bookingRouter);
//
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

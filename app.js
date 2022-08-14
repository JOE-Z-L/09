const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const path = require("path");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRoute = require("./routes/viewRoutes");
const csp = require("express-csp");
const cors = require("cors");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Set security http

app.use(function(req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' https://cdnjs.cloudflare.com"
  );
  next();
});

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000"
  })
);

// abaixo tentando consertar o erro "Refused to load the script 'https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.js' because it violates the following Content Security Policy directive: "script-src 'self'". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback."
// csp.extend(app, {
//   policy: {
//     directives: {
//       "default-src": ["self"],
//       "style-src": ["self", "unsafe-inline", "https:"],
//       "font-src": ["self", "https://fonts.gstatic.com"],
//       "script-src": [
//         "self",
//         "unsafe-inline",
//         "data",
//         "blob",
//         "https://js.stripe.com",
//         "https://api.mapbox.com",
//         "https://*.cloudflare.com"
//       ],
//       "worker-src": [
//         "self",
//         "unsafe-inline",
//         "data:",
//         "blob:",
//         "https://js.stripe.com",
//         "https://api.mapbox.com"
//       ],
//       "frame-src": [
//         "self",
//         "unsafe-inline",
//         "data:",
//         "blob:",
//         "https://js.stripe.com",
//         "https://api.mapbox.com"
//       ],
//       "img-src": [
//         "self",
//         "unsafe-inline",
//         "data:",
//         "blob:",
//         "https://js.stripe.com",
//         "https://api.mapbox.com"
//       ],
//       "connect-src": [
//         "self",
//         "unsafe-inline",
//         "data:",
//         "blob:",
//         "https://api.mapbox.com",
//         "https://events.mapbox.com"
//       ]
//     }
//   }
// });

//Dev login
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "too many requests from this IP please try again in a hour"
});

app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: "10kb"
  })
);

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution (limpa a query string)
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price"
    ]
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);

  next();
});

// 3) ROUTES

app.use("/", viewRoute);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

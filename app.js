require('./db'); // Ensure your database connection is set up
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tripaiRouter = require('./routes/tripai');
var authRouter = require('./routes/auth'); // This should contain your /auth/google and /auth/google/callback routes
const { authenticateToken } = require('./routes/auth'); // Import JWT middleware
const User = require('./models/users'); 

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// --- การกำหนดค่า Google OAuth Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    // ตรงนี้แหละครับที่ 'User' ถูกใช้งาน
    try {
        let user = await User.findOne({ googleId: profile.id }); // <--- 'User' ถูกใช้ตรงนี้
        if (user) {
            return done(null, user);
        } else {
            user = new User({ // <--- 'User' ถูกใช้ตรงนี้
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            });
            await user.save();
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

// --- Passport Serialization/Deserialization ---
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // <--- 'User' ถูกใช้ตรงนี้
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


// --- Your Routers ---
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/trip', authenticateToken, tripaiRouter); 
app.use('/auth', authRouter); 

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
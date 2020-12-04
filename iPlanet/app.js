const express = require('express');
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const LocalStrategy = require('passport-local').Strategy;
const MySQLStore = require('express-mysql-session')(session);

var conn;

const app = express();
app.set('view engine', 'ejs');

const jsonParser = bodyParser.json();

const dbConfiguration = {
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: '',
    database: 'iplanet'
}

app.use(session({
    secret: 'some secret',
    store: new MySQLStore(dbConfiguration),
    proxy: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/static'))
app.use(cookieParser());

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Credentials", true);
    next();
  });

app.use((req, res, next) => {
    if (req.url.indexOf('/signup') < 0 && req.url.indexOf('/login') < 0 
    && (!req.session || req.session.passport == null)) {
        res.redirect('/login');
    }   else{
        next();
    }
});

passport.use('local', new LocalStrategy(
	{
	    passReqToCallback : true
	},
	(req, username, password, done) => {
        connectDb();

        conn.query('SELECT id, username, pass FROM app_user WHERE username = ?', [username], (error, rows) => {
            closeDb();

            if (rows.length == 0) {
                return done(null, false);
            }

            let result = rows[0];

            bcrypt.compare(password, result.pass, (error, res) => {
                if (error) {
                    throw error;
                }

                if (res) {
                    return done(null, result);
                } else {
                    return done(null, false);
                }
            })
        })
	}
));

passport.serializeUser((user, done) => {
	return done(null, user.id);
});

passport.deserializeUser((id, done) => {
    connectDb();
    
	conn.query('SELECT id, username FROM app_user WHERE id = ?', [id], (error, row) => {
        closeDb();
		if (row.length == 0) {
			return done(null, false);
        }
        
		return done(null, row[0]);
	});
});

connectDb = () => {
    conn = mysql.createConnection(dbConfiguration);

    conn.connect((err) => {
        if (err) {
            throw err;
        }

        console.log('Connected');
    })
}

closeDb = () => {
    conn.end();
}

app.get('/login', (req, res) => {
    res.render('main', {'title': 'Login', 'message': '', 'content': 'login'})
})

app.get('/loginerror', (req, res) => {
    res.render('main', {'title': 'Login', 'message': 'Login failed', 'content': 'login'})
})

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) {
            return next(error);
        }

        if (!user) {
            return res.redirect('/loginerror');
        }

        req.logIn(user, (error) => {
            if (error) {
                return next(error);
            }

            req.session.save(() => {
                res.redirect('/');
            });
        })
    })(req, res, next);
})

app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.redirect('/login');
    });
});

app.get('/signup', (req, res) => {
    connectDb();
    conn.query('SELECT id, city_name AS cityName FROM city', (error, rows) => {
        if (error) {
            throw error;
        }

        res.render('main', {'title': 'Sign Up', 'content': 'signup', 'cities': rows});
        closeDb();
    });
});

app.get('/', (req, res) => {
    res.render('main', {'title': 'Main Page', 'content': 'home', 'user': req.user});
})

app.post('/signup', (req, res) => {
    let user = req.body;
    connectDb();
    conn.query('INSERT INTO app_user(first_name, last_name, birth_date, city_id, username, pass) ' + 
               'VALUES (?, ?, ?, ?, ?, ?)',
               [user.firstName, user.lastName, user.birthDate, 
                user.cityId, user.username, bcrypt.hashSync(user.password, 10)],
               (error, rows) => {
                   if (error) {
                       throw error;
                   }

                   if (req.xhr) {
                       res.writeHead(200, {'Content-Type': 'application/json'});
                       res.end(JSON.stringify(rows));
                   } else {
                       res.redirect('/login');
                   }
                   closeDb();
               });
})

// Complete implementation of
// * GET /articles to obtain all articles by user logged in
// * GET /newarticle to retrieve view for new article registration
// * GET /articles/:id to retrieve an existing article by id
// * GET /editarticle/:id to retrieve view for existing article by id
// * POST /articles to create a new article in the database
// * PUT /articles to update an existing article in the database

app.get('/articles', (req, res) => {
    connectDb();
    conn.query('SELECT id, title, publish_date AS publishDate FROM article ' +
               'WHERE user_id = ?', [req.user.id], (error, rows) => {
                   if (error) {
                       throw error;
                   }

                   res.render('main', {'content': 'listarticles', 
                              'title': 'My Articles', 'articles': rows, 'user': req.user});
                   closeDb();
               })
})

app.get('/newarticle', (req, res) => {
    res.render('main', {'content': 'editarticle', 
                        'title': 'New Article', 'user': req.user, 'articleId': ''});
})

app.get('/articles/:id', (req, res) => {
    connectDb();
    conn.query('SELECT id, title, article_text AS articleText FROM article ' +
               'WHERE id = ?', [req.params.id],
               (error, rows) => {
                   if (error) {
                       throw error;
                   }

                   let article = rows[0];
                   res.writeHead(200, {'Content-Type': 'application/json'});
                   res.end(JSON.stringify(article));
                   closeDb();
               })
})

app.get('/editarticle/:id', (req, res) => {
    res.render('main', {'content': 'editarticle', 
                        'title': 'Edit Article', 'user': req.user, 'articleId': req.params.id});
})

app.post('/articles', (req, res) => {
    connectDb();
    conn.query('INSERT INTO article(title, publish_date, article_text, user_id) ' +
               'VALUES (?, ?, ?, ?)',
               [req.body.title, new Date(), req.body.articleText, req.user.id],
               (error, rows) => {
                   if (error) {
                       throw error;
                   }

                   res.writeHead(200, {'Content-Type': 'application/json'});
                   res.end(JSON.stringify(rows));
                   closeDb();
               })
})

app.listen(3000, () => {
    console.log('Server up');
})

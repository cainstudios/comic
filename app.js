var express = require('express');
var fs = require('fs');
var compress = require('compression');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var cdata = require('./data');
var staticImage = require('./staticImage');
var userAuth = require('./userAuth');

var app = express();

var conf = JSON.parse(fs.readFileSync('data/config.json', { encoding: 'utf-8' }));
var cfact = cdata(conf.database);
var authorizer = userAuth(conf.database);
var imageMaker = staticImage({
	dir: '/temp'
});

// --- set up login strategy
passport.use(new LocalStrategy(authorizer));

passport.serializeUser(function(user, done) {
	done(null, user.userid);
});

/*
 * this deserializer actually performs no user lookup, just
 * recreates the user object. my user object is not really
 * much of anything at this point, just the userid.
 */
passport.deserializeUser(function(id, done) {
	done(null, { userid: id });
});

// use jade for templates
app.set('view engine', 'jade');

// used on resources that you have to be authenticated to use
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}

// middleware for resources that should not be cached
function noCache(req, res, next) {
	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');
	next();
}

// creates static images for pinterest and facebook
function createStaticImages(id, imageMaker, storageObj, cb) {
	
	// store the static image for Pinterest
	imageMaker.createImage(id, storageObj.storePinImage, function(err) {
		if (err) {
			cb(err);
		} else {
			// now store a static image of one cell for Facebook
			imageMaker.createImage(id, 1, storageObj.storeFBImage, function(err) {
				if (err) {
					cb(err);
				} else {
					cb();
				}
			});
		}
	});

	
}

// --------- set up routes and middleware and such

// logging comes first
//   note: using the header "X-Real-IP" because I proxy this app throuh nginx
app.use(morgan(':req[X-Real-IP] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));

app.use(cookieParser()); // required before session.
app.use(session({ secret: conf.secret }));
app.use(bodyParser());
app.use(compress());
app.use(passport.initialize());
app.use(passport.session());

// if nothing explicit requested, send most recent comic
app.get('/', function(req, res, next) {
	
	cfact.loadCurrent(function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.render('comicpage', data);
		} else {
			next(); // no comic found
		}
	});
	
});

app.get('/login', function(req, res, next) {
	res.render('login', { message: req.session.messages });
});

app.post('/login', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err); }
		if (!user) {
			req.session.messages =  [info.message];
			return res.redirect('/login');
		}
		req.logIn(user, function(err) {
			if (err) { return next(err); }
			req.session.messages = null;
			return res.redirect('/');
		});
	})(req, res, next);
});

// load individual comic pages by id
app.get('/:n', function(req, res, next) {

	cfact.loadById(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.render('comicpage', data);
		} else {
			next(); // no comic found
		}
	});
	
});

// render basic (no header, footer, animation, etc) comic pages by id
app.get('/basic/:n', function(req, res, next) {

	cfact.loadById(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			data.basic = true;
			data.pubDate = null;
			data.prevDate = null;
			data.nextDate = null;
			res.render('basiccomicpage', data);
		} else {
			next(); // no comic found
		}
	});
	
});

//render basic single cell, given a comic id and cell number (1-based)
app.get('/basic/:n/:c', function(req, res, next) {

	cfact.loadById(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			data.basic = true;
			var cn = Number(req.params.c);
			var singleCell = [ data.cells[cn - 1] ];
			data.cells = singleCell;
			data.title = null;
			data.pubDate = null;
			data.prevDate = null;
			data.nextDate = null;
			res.render('basiccomicpage', data);
		} else {
			next(); // no comic found
		}
	});
	
});

//get just the comic HTML by id
app.get('/chtml/:n', function(req, res, next) {

	cfact.loadById(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.render('comic', data, function(err, str) {
				if (err) {
					next(err);
				} else {
					res.send(str);
				}
			});
		} else {
			next(); // no comic found
		}
	});
	
});

app.get('/list', function(req, res, next) {
	
	cfact.listComics(function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', 'application/json');
			res.send(data);
		} else {
			next(new Error('missing comic data!')); // this shouldn't happen
		}
	});
	
});


app.get('/data/:n', noCache, function(req, res, next) {

	cfact.loadById(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', 'application/json');
			res.send(data);
		} else {
			res.send(404); // don't use the full-page 404 for missing data
		}
	});
	
});

app.post('/data', ensureAuthenticated, function(req, res, next) {
	
	cfact.storeData(req.body, function(err, newid) {
		if (err) {
			next(err);
		} else {
			res.setHeader('Content-Type', 'application/json');
			res.send({
				id: newid
			});
			createStaticImages(newid, imageMaker, cfact, function(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	});
	
});

app.put('/data/:n', ensureAuthenticated, function(req, res, next) {
	
	var i = isNaN(req.params.n) ? null : Number(req.params.n);
	cfact.storeData(req.body, i, function(err, newid) {
		if (err) {
			next(err);
		} else {
			res.setHeader('Content-Type', 'application/json');
			res.send({
				id: newid
			});
			createStaticImages(newid, imageMaker, cfact, function(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	});
	
});

app.get('/editor', ensureAuthenticated, function(req, res, next) {
	res.render('editpage', {
		title: 'Editor'
	});
});

app.get('/about', function(req, res, next) {
	
	res.render('about', {
		title: 'About'
	});
	
});

app.get('/merch', function(req, res, next) {
	
	res.render('merch', {
		title: 'Merchandise'
	});
	
});

app.get('/games', function(req, res, next) {
	
	res.render('games', {
		title: 'Games'
	});
	
});

app.get('/pins/:n', function(req, res, next) {
	
	cfact.loadPinImage(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', 'image/png');
			res.send(data);
		} else {
			res.send(404); // don't use the full-page 404 for missing images
		}
	});
	
});

app.get('/cell/:n', function(req, res, next) {
	
	cfact.loadFBImage(req.params.n, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', 'image/png');
			res.send(data);
		} else {
			res.send(404); // don't use the full-page 404 for missing images
		}
	});
	
});

app.get('/images', function(req, res, next) {
	
	cfact.listImages(function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', 'application/json');
			res.send(data);
		} else {
			next(new Error('missing image data!')); // this shouldn't happen
		}
	});
	
});

app.post('/images', function(req, res, next) {
	
	var uploadName = '';
	var uploadType = '';
	var chunks = [];
	var totalLength = 0;

	var form = new multiparty.Form();
	
	form.on('error', function(err) {
		res.send(JSON.stringify({
			success: false,
			error: err
		}));
	});
	
	form.on('close', function() {
		
		var b = Buffer.concat(chunks, totalLength);
		console.log('storing file %s (%d bytes)', uploadName, b.length);
		cfact.storeImage(uploadName, b, uploadType, function(err, info) {
			if (err) {
				res.send(JSON.stringify({
					success: false,
					error: err
				}));
			} else {
				res.send(JSON.stringify({
					success: true
				}));
			}
		});

	});

	form.on('part', function(part) {
		
		part.on('data', function(chunk) {
			  chunks.push(chunk);
			  totalLength += chunk.length;
		});
		part.on('end', function() {
			  uploadName = part.filename;
			  uploadType = part.headers['content-type'];
		});
		
	});
	
    form.parse(req);
    
});

app.get('/images/:img', function(req, res, next) {
	
	cfact.loadImage(req.params.img, function (err, data) {
		if (err) {
			next(err);
		} else if (data) {
			res.setHeader('Content-Type', data.contentType);
			res.send(data.buffer);
		} else {
			res.send(404); // don't use the full-page 404 for missing images
		}
	});
	
});

app.use(express.static('public'));

// handle 404
app.use(function(req, res, next){
	fs.readFile('data/404.json', { encoding: 'utf-8' }, function(err, data) {
		if (err) {
			next(err);
		} else {
			res.render('comicpage', JSON.parse(data), function(err, str) {
				if (err) {
					next(err);
				} else {
					res.send(404, str);
				}
			});
		}
	});
});

// handle 500
app.use(function(err, req, res, next) {
	console.error(err.stack);
	fs.readFile('data/500.json', { encoding: 'utf-8' }, function(err, data) {
		if (err) {
			console.error(err.stack);
		} else {
			res.render('comicpage', JSON.parse(data), function(err, str) {
				if (err) {
					console.error(err.stack);
				} else {
					res.send(500, str);
				}
			});
		}
	});
});

var server = app.listen(3000, function() {
	console.log('listening on port %d', server.address().port);
});

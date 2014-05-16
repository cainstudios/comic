var express = require('express');
var fs = require('fs');
var compress = require('compression');
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var cdata = require('./data');

// --- set up login strategy

passport.use(new LocalStrategy(function(username, password, done) {
	
	console.log('username: ' + username);
	
	if (username === 'error') {
		done(new Error('test error'));
	} else if (username === 'user') {
		if (password === 'password') {
			console.log('good login');
			done(null, { userid: '33333' });
		} else {
			console.log('incorrect password');
			done(null, false, { message: 'incorrect password' });
		}
	} else {
		console.log('incorrect username');
		done(null, false, { message: 'incorrect username' });
	}
	
}));

passport.serializeUser(function(user, done) {
	done(null, user.userid);
});

passport.deserializeUser(function(id, done) {
	console.log('deserializer looking for ' + id);
	done(null, {});
});

var app = express();

var dbconf = JSON.parse(fs.readFileSync('data/dbconf.json', { encoding: 'utf-8' }));
var cfact = cdata(dbconf);

app.set('view engine', 'jade');


// --------- set up routes and middleware and such

// logging comes first
app.use(function(req, res, next) {
	console.log('%s %s', req.method, req.url);
	next();
});

app.use(cookieParser()); // required before session.
app.use(session({ secret: 'keyboard cat'}));
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
	res.render('login');
});

app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}), function(req, res, next) {
	res.redirect('/');
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

app.get('/data/:n', function(req, res, next) {

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

app.get('/editor', function(req, res, next) {
	
	res.render('editpage', {});
	
});

app.get('/about', function(req, res, next) {
	
	res.render('about', {});
	
});

app.get('/merch', function(req, res, next) {
	
	res.render('merch', {});
	
});

app.post('/data', function(req, res, next) {

	// stream in the posted data
	var data = '';
	req.setEncoding('utf8');
	req.on('data', function(chunk) {
		data += chunk;
	});

	req.on('end', function() {
		// we have read the entire POST body
		cfact.storeData(data, function(err, newid) {
			if (err) {
				next(err);
			} else {
				res.setHeader('Content-Type', 'text/plain');
				res.send('data id: ' + newid);
			}
		});

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

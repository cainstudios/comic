/*
 * logger. to the database or to stdout.
 */


module.exports = function(conf) {
	
	var myLogger = null;
	
	if (!conf.logToConsole) {

		var mysql = require('mysql');
		var pool = mysql.createPool(conf.database);

		myLogger = function(req, res, next) {
			
			function storeData() {

				res.removeListener('finish', storeData);
				res.removeListener('close', storeData);

				var reqIp = req.get('X-Real-IP') || req.ip;
				var reqVerb = req.method;
				var reqPath = req.originalUrl || req.url;
				var resStatus = res.statusCode;
				var resSize = res.get('content-length');
				var reqRef = req.get('referer');
				var reqAgent = req.get('user-agent');
				var adCode = req["click-source"];

				pool.query('INSERT INTO comic_access (ip, verb, resource, response, size, referer, agent, clickSource) ' +
						'VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [reqIp, reqVerb, reqPath, resStatus, resSize, reqRef, reqAgent, adCode],
						function(err, result) {

					if (err) {
						console.log('error logging to database: ' + err);
					}

				});

			};
			
			// defer logging until the end so we know the response stuff
			res.on('finish', storeData);
			res.on('close', storeData);			

			next();
			
		};
		
	} else {

		var morgan = require('morgan');
		myLogger = morgan(':req[X-Real-IP] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"');
		
	}
	
	return function(req, res, next) {
		myLogger(req, res, next);
	};
	
};

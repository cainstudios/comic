var path = require('path');
var fs = require('fs');

module.exports = function(conf) {
	
	var imgDir = path.normalize(conf.imgDir || 'comic-data/images');
	var dataDir = path.normalize(conf.dataDir || 'comic-data/comics');
	var pinDir = path.normalize(conf.pinDir || 'comic-data/pins');
	
	var cdata = [];
	
	function prevComic(d, cb) {
		
		//TODO: given date d, load the previous comic from the dataDir
		cb(null, null);
		
	}
	
	function nextComic(d, cb) {

		//TODO: given date d, load the next comic from the dataDir
		cb(null, null);
		
	}
	
	fs.readdir(dataDir, function(err, files) {
		if (err) {
			console.log(err);
		} else {
			for (var i = 0; i < files.length; i++) {
				fs.readFile(files[i], function(err, data) {
					if (err) {
						console.log(err);
					} else {
						var obj = JSON.parse(data);
						cdata.push(obj);
					}
				});
			}
		}
	});

	return {
		
		loadCurrent: function (cb) {
			
			//TODO: load the current comic from the dataDir
			cb(null, null);
			
		},

		loadById: function (id, cb) {

			var fn = dataDir + "/" + id + ".json";
			fs.readFile(fn, function(err, data) {
				if (err) {
					cb(err);
				} else {
					var obj = JSON.parse(data);
					cb(null, obj);
				}
			});

		},
		
		loadPinImage: function(id, cb) {

			//TODO: read data from pinDir
			cb(null, null);

		},

		storePinImage: function(id, data, cb) {

			fs.writeFile(imgDir + "/" + id + ".png", data, function(err) {
				if (err) {
					cb(err);
				} else {
					cb(null);
				}
			});

		},

		loadImage: function(name, cb) {

			//TODO: maybe figure this out from path.extname, but really I'm trying
			//      to use all SVG
			var ct = 'image/svg+xml';
			
			fs.readFile(imgDir + "/" + name, function(err, data) {
				if (err) {
					cb(err);
				} else {
					cb(null, {
						contentType: ct,
						buffer: data
					});
				}
			});

		},
		
		storeImage: function(fn, data, type, cb) {
			
			// note: ignoring type
			
			fs.writeFile(imgDir + "/" + name, data, function(err) {
				if (err) {
					cb(err);
				} else {
					// always sending 0 as the image id, because images
					// don't have ids anyway and it's not used.
					//TODO: fix that
					cb(null, 0);
				}
			});
			
		},
		
		storeData: function(data, idOrCb, cb) {
			
			var id = typeof(idOrCb) === 'function' ? null : idOrCb;
			var callback = typeof(idOrCb) === 'function' ? idOrCb : cb;
			
			var json = JSON.stringify(data);

			//TODO: write comic data to dataDir (overwrite same id)
			callback(null, 0);
			
		},
		
		listImages: function(cb) {
			
			//TODO: return a list of the imgDir contents in this format:
			//      {
			//        filename: <file name>,
			//        type: 'image/svg+xml'
			//      }
			
			cb(null, []);
			
		},
		
		listComics: function(cb) {
			
			//TODO: return something
			cb(null, []);
			
		}

	};
	
};
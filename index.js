var	Akismet = require('akismet'),
	stopForumSpam = require('spamcheck'),
	pluginData = require('./plugin.json'),
	fs = require('fs-extra'),
	path = require('path'),
	async = require('async'),
	log = require('tiny-logger').init(process.env.NODE_ENV === 'development' ? 'debug' : 'info,warn,error', '[' + pluginData.id + ']'),
	meta = module.parent.require('./meta'),
	nconf = require('../nconf/lib/nconf.js'),
	logFile = path.join(__dirname, 'nodebb-plugin-spam-be-gone.log'),
	akismet;

(function(Plugin){
	Plugin.config = {};

	Plugin.init = function(callback){
		log.debug('init()');
		var _self = this,
			hashes = Object.keys(pluginData.defaults).map(function(field) { return pluginData.id + ':options:' + field });

		meta.configs.getFields(hashes, function(err, options){
			if (err) throw err;

			for (field in options) {
				meta.config[field] = options[field];
			}
			nconf.file({
				file: module.parent.require('./../config.json')
			});
			if (typeof _self.softInit == 'function') {
				_self.softInit(callback);
			} else if (typeof callback == 'function'){
				callback();
			}

		});
	};

	Plugin.reload = function(hookVals) {
		var	isThisPlugin = new RegExp(pluginData.id + ':options:' + Object.keys(pluginData.defaults)[0]);
		if (isThisPlugin.test(hookVals.key)) {
			this.init(this.softInit.bind(this));
		}
	};

	Plugin.admin = {
		menu: function(custom_header) {
			custom_header.plugins.push({
				"route": '/plugins/' + pluginData.name,
				"icon": 'fa-shield',
				"name": pluginData.name
			});

			return custom_header;
		},
		route: function(custom_routes, callback) {
			fs.readFile(path.join(__dirname, 'public/templates/admin.tpl'), function(err, tpl) {
				if (err) throw err;

				custom_routes.routes.push({
					route: '/plugins/' + pluginData.name,
					method: "get",
					options: function(req, res, callback) {
						callback({
							req: req,
							res: res,
							route: '/plugins/' + pluginData.name,
							name: Plugin,
							content: tpl
						});
					}
				});

				callback(null, custom_routes);
			});
		},
		activate: function(id) {
			log.debug('activate()');
			if (id === pluginData.id) {
				async.each(Object.keys(pluginData.defaults), function(field, next) {
					meta.configs.setOnEmpty(pluginData.id + ':options:' + field, pluginData.defaults[field], next);
				});
			}
		}
	};

	Plugin.softInit = function() {
		log.debug('softInit()');

		var	_self = this;

		if (!meta.config) {
			this.init(callback);
		}

		var prefix = pluginData.id + ':options:';
		Object.keys(meta.config).forEach(function(field, i) {
			var option, value;
			if (field.indexOf(pluginData.id + ':options:') === 0 ) {
				option = field.slice(prefix.length) || '';
				value = meta.config[field];

				var obj;
				if (option === 'logging' || option === 'enableStopForumSpam') {
					obj = value === '1';
				} else {
					obj = value || pluginData.defaults[option];
				}
				_self.config[option] = obj;
			}
		});


		// enable/disable logging
		this.toggleLogging(this.config.logging);

		var done = function(){
			_self.initialized = true;
			if (typeof callback == 'function') {
				callback();
			}
		};

		// create the Akismet api instance
		if (this.config.akismetApiKey) {
			akismet = Akismet.client({blog: this.config.url, apiKey: this.config.akismetApiKey});
			akismet.verifyKey(function(err, verified) {
				if (verified) {
					_self.config.url = nconf.get('base_url') + (nconf.get('use_port') ? ':' + nconf.get('port') : '') + nconf.get('relative_path');
					log('Akismet API key successfully verified.');
				} else {
					log('Unable to verify API key.');
					akismet = null;
				}
				done();
			});
		} else {
			done();
		}
	};

	Plugin.toggleLogging = function(toggle){
		var _self = this;
		if (toggle) {
			fs.createFile(logFile, function(err){
				if (err)
					log.warn('can\'t create log file: ' + logFile + ' -- ' + err);
				else
					_self.log('Logging enabled in file: ' + logFile);
			});
		} else {
			fs.remove(logFile, function(){
				log.debug('Logging disabled, file ' + logFile + ' removed.');
			});
		}
	};

	Plugin.log = function(msg) {
		var _self = this;
		if (_self.config.logging) {
			fs.appendFile(logFile, log.p + ' ' + msg + '\n', function(err){
				if (err)
					log.warn('Could not append log file. ' + err);
			});
		}
		log.debug(msg);
	};

	Plugin.checkUser = function(userData, callback) {
		log.debug('checkUser()') ;
		var _self = this;
		if (this.config.enableStopForumSpam) {
			stopForumSpam.checkSpammer({ip: userData.ip, email: userData.email}, function(err, spammer) {
				if (err) _self.log(err);
				if (spammer) {
					var msg = 'User ' + userData.username + ':' + userData.email+ ' is flagged as a spammer. Registration will not continue.';
					_self.log(msg);
					callback(new Error(msg), userData);
				} else {
					log.debug('user: ' + userData.username + ' is real');
					callback(null, userData);
				}
			});
		}
	};

	// TODO: needs more than just post.content
	Plugin.checkPost = function(content, callback) {
		log.debug('checkPost()') ;
		var _self = this;
		if (akismet) {
			akismet.checkSpam({
				user_ip: null,
				permalink: null,
				comment_author: null,
				comment_content: content
			}, function(err, spam) {
				if (err) _self.log(err);

				if(spam)  {
					var msg = 'Post content was flagged as spam. ' + content;
					_self.log(msg);
					callback(new Error(msg), content);
				} else {
					log.debug('good content');
					callback(null, content);
				}
			});
		} else {
			callback(content);
		}
	};

	Plugin.init();

})(exports);
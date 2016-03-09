'use strict';


var Honeypot = require('project-honeypot');
var simpleRecaptcha = require('simple-recaptcha');
var pluginData = require('./plugin.json');
var winston = module.parent.require('winston');
var nconf = module.parent.require('nconf');
var async = module.parent.require('async');
var Meta = module.parent.require('./meta');
var user = module.parent.require('./user');
var topics = module.parent.require('./topics');
var db = module.parent.require('./database');

var akismet;
var honeypot;
var recaptchaArgs;
var pluginSettings;
var Plugin = {};

pluginData.nbbId = pluginData.id.replace(/nodebb-plugin-/, '');

Plugin.load = function (params, callback) {

	var render = function (req, res, next) {
		res.render('admin/plugins/' + pluginData.nbbId, pluginData || {});
	};

	Meta.settings.get(pluginData.nbbId, function (err, settings) {
		if (err) {
			return callback(err);
		}
		if (!settings) {
			winston.warn('[plugins/' + pluginData.nbbId + '] Settings not set or could not be retrived!');
			return callback();
		}

		if (settings.akismetEnabled === 'on') {
			if (settings.akismetApiKey) {
				akismet = require('akismet').client({
					blog: nconf.get('url'),
					apiKey: settings.akismetApiKey
				});
				akismet.verifyKey(function (err, verified) {
					if (!verified) {
						winston.error('[plugins/' + pluginData.nbbId + '] Unable to verify Akismet API key.');
						akismet = null;
					}
				});
			} else {
				winston.error('[plugins/' + pluginData.nbbId + '] Akismet API Key not set!');
			}
		}

		if (settings.honeypotEnabled === 'on') {
			if (settings.honeypotApiKey) {
				honeypot = Honeypot(settings.honeypotApiKey);
			} else {
				winston.error('[plugins/' + pluginData.nbbId + '] Honeypot API Key not set!');
			}
		}

		if (settings.recaptchaEnabled === 'on') {
			if (settings.recaptchaPublicKey && settings.recaptchaPrivateKey) {
				var recaptchaLanguages = {
						'en': 1,
						'nl': 1,
						'fr': 1,
						'de': 1,
						'pt': 1,
						'ru': 1,
						'es': 1,
						'tr': 1
					},
					lang = (Meta.config.defaultLang || 'en').toLowerCase();

				recaptchaArgs = {
					publicKey: settings.recaptchaPublicKey,
					targetId: pluginData.nbbId + '-recaptcha-target',
					options: {
						// theme: settings.recaptchaTheme || 'clean',
						//todo: switch to custom theme, issue#9
						theme: 'clean',
						lang: recaptchaLanguages[lang] ? lang : 'en',
						tabindex: settings.recaptchaTabindex || 0
					}
				};
			}
		}

		if (!settings.akismetMinReputationHam) {
			settings.akismetMinReputationHam = 10;
		}

		winston.info('[plugins/' + pluginData.nbbId + '] Settings loaded');
		pluginSettings = settings;

		params.router.get('/admin/plugins/' + pluginData.nbbId, params.middleware.admin.buildHeader, render);
		params.router.get('/api/admin/plugins/' + pluginData.nbbId, render);

		callback();
	});
};

Plugin.addCaptcha = function (data, callback) {
	if (recaptchaArgs) {
		var captcha = {
			label: 'Captcha',
			html: '' +
			'<div id="' + pluginData.nbbId + '-recaptcha-target"></div>' +
			'<script id="' + pluginData.nbbId + '-recaptcha-script">\n\n' +
			'window.plugin = window.plugin || {};\n\t\t\t' +
			'plugin["' + pluginData.nbbId + '"] = window.plugin["' + pluginData.nbbId + '"] || {};\n\t\t\t'	+
			'plugin["' + pluginData.nbbId + '"].recaptchaArgs = ' + JSON.stringify(recaptchaArgs) + ';\n'+ '</script>',
			styleName: pluginData.nbbId
		};
		if (data.templateData.regFormEntry && Array.isArray(data.templateData.regFormEntry)) {
			data.templateData.regFormEntry.push(captcha);
		} else {
			data.templateData.captcha = captcha;
		}
	}
	callback(null, data);
};

Plugin.onPostEdit = function(data, callback) {
	Plugin.checkReply({
		content: data.post.content,
		uid: data.post.uid,
		req: data.req
	}, function(err) {
		callback(err, data);
	});
};

Plugin.onTopicEdit = function(data, callback) {
	Plugin.checkReply({
		title: data.topic.title || '',
		uid: data.topic.uid,
		req: data.req
	}, function(err) {
		callback(err, data);
	});
};

Plugin.checkReply = function (data, callback) {
	// http://akismet.com/development/api/#comment-check
	if (!akismet || !data || !data.req) {
		return callback(null, data);
	}
	var userData;
	var akismetData;
	async.waterfall([
		function (next) {
			async.parallel({
				isAdminOrGlobalMod: function(next) {
					user.isAdminOrGlobalMod(data.uid, next);
				},
				userData: function(next) {
					user.getUserFields(data.uid, ['username', 'reputation'], next);
				}
			}, next);
		},
		function (results, next) {
			userData = results.userData;
			if (results.isAdminOrGlobalMod) {
				return callback(null, data);
			}
			akismetData = {
				user_ip: data.req.ip,
				user_agent: data.req.headers['user-agent'],
				permalink: nconf.get('url').replace(/\/$/, '') + data.req.path,
				comment_content: (data.title ? data.title + '\n\n' : '') + (data.content || ''),
				comment_author: userData.username
			};
			akismet.checkSpam(akismetData, next);
		},
		function (spam, next) {
			if (!spam) {
				return callback(null, data);
			}

			if (parseInt(userData.reputation, 10) >= parseInt(pluginSettings.akismetMinReputationHam, 10)) {
				akismet.submitHam(akismetData, function (err) {
					if (err) {
						winston.error(err);
					}
				});
			}

			winston.warn('[plugins/' + pluginData.nbbId + '] Post "' + akismetData.comment_content + '" by uid: ' + data.uid + ' username: ' + userData.username + '@' + data.req.ip + ' was flagged as spam and rejected.');
			next(new Error('Post content was flagged as spam by Akismet.com'));
		}
	], callback);
};

Plugin.checkRegister = function (data, callback) {
	async.parallel([
		function (next) {
			Plugin._honeypotCheck(data.req, data.res, data.userData, next);
		},
		function (next) {
			Plugin._recaptchaCheck(data.req, data.res, data.userData, next);
		}
	], function (err) {
		callback(err, data);
	});
};

Plugin.onPostFlagged = function (flagged) {
	if (akismet && pluginSettings.akismetFlagReporting && parseInt(flagged.flaggingUser.reputation, 10) >= parseInt(pluginSettings.akismetFlagReporting, 10)) {
		async.parallel({
			comment_author: function (next) {
				user.getUserField(flagged.post.uid, 'username', next);
			},
			permalink: function (next) {
				topics.getTopicField(flagged.post.tid, 'slug', next);
			},
			ip: function (next) {
				db.getSortedSetRevRange('uid:' + flagged.post.uid + ':ip', 0, 1, next);
			}
		}, function (err, data) {
			var submitted = {
				user_ip: data.ip ? data.ip[0] : '',
				permalink: nconf.get('url').replace(/\/$/, '') + '/topic/' + data.permalink,
				comment_author: data.comment_author,
				comment_content: flagged.post.content
			};

			akismet.submitSpam(submitted, function (err) {
				if (err) {
					winston.error('Error reporting to Akismet', err, submitted);
				}

				winston.info('Spam reported to Akismet.', submitted);
			});
		});
	}
};

Plugin._honeypotCheck = function (req, res, userData, next) {
	if (honeypot && req && req.ip) {
		honeypot.query(req.ip, function (err, results) {
			if (err) {
				winston.error(err);
				next(null, userData);
			} else {
				if (results && results.found && results.type) {
					if (results.type.spammer || results.type.suspicious) {
						var message = userData.username + ' | ' + userData.email + ' was detected as ' + (results.type.spammer ? 'spammer' : 'suspicious');

						winston.warn('[plugins/' + pluginData.nbbId + '] ' + message + ' and was denied registration.');
						next(new Error(message), userData);
					} else {
						next(null, userData);
					}
				} else {
					winston.warn('[plugins/' + pluginData.nbbId + '] username:' + userData.username + ' ip:' + req.ip + ' was not found in Honeypot database');
					next(null, userData);
				}
			}
		});
	} else {
		next(null, userData);
	}
};

Plugin._recaptchaCheck = function (req, res, userData, next) {
	if (recaptchaArgs && req && req.ip && req.body) {

		simpleRecaptcha(
			pluginSettings.recaptchaPrivateKey,
			req.ip,
			req.body['g-recaptcha-response'],
			function (err) {
				if (err) {
					var message = err.Error || 'Captcha not verified, are you a robot?';
					winston.warn('[plugins/' + pluginData.nbbId + '] ' + message);
					next(new Error(message), userData);
				} else {
					next(null, userData);
				}
			}
		);
	} else {
		next(null, userData);
	}
};

Plugin.admin = {
	menu: function (custom_header, callback) {
		custom_header.plugins.push({
			"route": '/plugins/' + pluginData.nbbId,
			"icon": pluginData.faIcon,
			"name": pluginData.name
		});

		callback(null, custom_header);
	}
};

module.exports = Plugin;

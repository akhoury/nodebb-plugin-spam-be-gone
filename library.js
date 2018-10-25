'use strict';


var Honeypot = require('project-honeypot');
var simpleRecaptcha = require('simple-recaptcha-new');

var pluginData = require('./plugin.json');
var nbbRequire = require('./lib/nbbRequire');

var Meta = nbbRequire('./src/meta');
var user = nbbRequire('./src/user');
var topics = nbbRequire('./src/topics');
var db = nbbRequire('./src/database');

var winston = require.main.require('winston');
var nconf = require.main.require('nconf');
var async = require.main.require('async');

var akismet;
var honeypot;
var recaptchaArgs;
var pluginSettings;
var Plugin = module.exports;

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

				recaptchaArgs = {
					publicKey: settings.recaptchaPublicKey,
					targetId: pluginData.nbbId + '-recaptcha-target',
					options: {
						// theme: settings.recaptchaTheme || 'clean',
						//todo: switch to custom theme, issue#9
						theme: 'clean',

						hl: (Meta.config.defaultLang || 'en').toLowerCase(),
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
	async.waterfall([
		function (next) {
			topics.getTopicField(data.post.tid, 'cid', next);
		},
		function (cid, next) {
			Plugin.checkReply({
				content: data.post.content,
				uid: data.post.uid,
				cid: cid,
				req: data.req,
			}, {type: 'post'}, function (err) {
				next(err, data);
			});
		},
	], callback);
};

Plugin.onTopicEdit = function(data, callback) {
	Plugin.checkReply({
		title: data.topic.title || '',
		uid: data.topic.uid,
		cid: data.topic.cid,
		req: data.req
	}, {type: 'topic'}, function(err) {
		callback(err, data);
	});
};

Plugin.onTopicPost = function(data, callback) {
	Plugin.checkReply(data, {type: 'topic'}, callback);
};

Plugin.onTopicReply = function(data, callback) {
	Plugin.checkReply(data, {type: 'post'}, callback);
};

Plugin.checkReply = function (data, options, callback) {
	if (typeof options === 'function') {
		callback = options;
		options = null;
	}
	options = options || {};

	// http://akismet.com/development/api/#comment-check
	if (!akismet || !data || !data.req) {
		return callback(null, data);
	}
	var userData;
	var akismetData;
	async.waterfall([
		function (next) {
			async.parallel({
				isAdmin: function(next) {
					user.isAdministrator(data.uid, next);
				},
				isModerator: function (next) {
					user.isModerator(data.uid, data.cid, next);
				},
				userData: function(next) {
					user.getUserFields(data.uid, ['username', 'reputation', 'email'], next);
				}
			}, next);
		},
		function (results, next) {
			userData = results.userData;
			if (results.isAdmin || results.isModerator) {
				return callback(null, data);
			}
			akismetData = {
				referrer: data.req.headers['referer'],
				user_ip: data.req.ip,
				user_agent: data.req.headers['user-agent'],
				permalink: nconf.get('url').replace(/\/$/, '') + data.req.path,
				comment_content: (data.title ? data.title + '\n\n' : '') + (data.content || ''),
				comment_author: userData.username,
				comment_author_email: userData.email,
				// https://github.com/akhoury/nodebb-plugin-spam-be-gone/issues/54
				comment_type: options.type === 'topic' ? 'forum-post' : 'comment'
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

			winston.verbose('[plugins/' + pluginData.nbbId + '] Post "' + akismetData.comment_content + '" by uid: ' + data.uid + ' username: ' + userData.username + '@' + data.req.ip + ' was flagged as spam and rejected.');
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

Plugin.onPostFlagged = function (data) {
	var flagObj = data.flag;

	// Don't do anything if flag is not for a post and not for "spam" reason
	if (flagObj.type !== 'post' || flagObj.description !== 'Spam') {
		return;
	}

	if (akismet && pluginSettings.akismetFlagReporting && parseInt(flagObj.reporter.reputation, 10) >= parseInt(pluginSettings.akismetFlagReporting, 10)) {
		async.parallel({
			userData: function (next) {
				user.getUserFields(flagObj.target.uid, ['username', 'email'], next);
			},
			permalink: function (next) {
				topics.getTopicField(flagObj.target.tid, 'slug', next);
			},
			ip: function (next) {
				db.getSortedSetRevRange('uid:' + flagObj.target.uid + ':ip', 0, 1, next);
			}
		}, function (err, data) {
			// todo: we don't have access to the req here :/
			var submitted = {
				user_ip: data.ip ? data.ip[0] : '',
				permalink: nconf.get('url').replace(/\/$/, '') + '/topic/' + data.permalink,
				comment_author: data.userData.username,
				comment_author_email: data.userData.email,
				comment_content: flagObj.target.content,
				comment_type: 'forum-post'
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
					winston.verbose('[plugins/' + pluginData.nbbId + '] username:' + userData.username + ' ip:' + req.ip + ' was not found in Honeypot database');
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
					winston.verbose('[plugins/' + pluginData.nbbId + '] ' + message);
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

'use strict';

var Honeypot = require('project-honeypot');
var simpleRecaptcha = require('simple-recaptcha-new');
const hCaptcha = require('hcaptcha');

var async = require('async');
var stopforumspam = require('stopforumspam');
var pluginData = require('./plugin.json');
var winston = require.main.require('winston');
var nconf = require.main.require('nconf');
var Meta = require.main.require('./src/meta');
var User = require.main.require('./src/user');
var Topics = require.main.require('./src/topics');
var db = require.main.require('./src/database');

var akismet;
var honeypot;
var recaptchaArgs;
var pluginSettings;
var Plugin = module.exports;

pluginData.nbbId = pluginData.id.replace(/nodebb-plugin-/, '');
Plugin.nbbId = pluginData.nbbId;

Plugin.middleware = {};

Plugin.middleware.isAdminOrGlobalMod = function (req, res, next) {
	User.isAdminOrGlobalMod(req.uid, function (err, isAdminOrGlobalMod) {
		if (!err && isAdminOrGlobalMod) {
			return next();
		}
		res.status(401).json({ message: '[[spam-be-gone:not-allowed]]' });
	});
};

Plugin.middleware.checkStopForumSpam = function (req, res, next) {
	if (!pluginSettings.stopforumspamEnabled) {
		return res.status(400).send({ message: '[[spam-be-gone:sfs-not-enabled]]' });
	}

	if (!pluginSettings.stopforumspamApiKey) {
		return res.status(400).send({ message: '[[spam-be-gone:sfs-api-key-not-set]]' });
	}
	next();
};

Plugin.load = function (params, callback) {
	Meta.settings.get(pluginData.nbbId, function (err, settings) {
		if (err) {
			return callback(err);
		}
		if (!settings) {
			winston.warn('[plugins/' + pluginData.nbbId + '] Settings not set or could not be retrieved!');
			return callback();
		}

		if (settings.akismetEnabled === 'on') {
			if (settings.akismetApiKey) {
				akismet = require('akismet').client({
					blog: nconf.get('url'),
					apiKey: settings.akismetApiKey,
				});
				akismet.verifyKey(function (err, verified) {
					if (err || !verified) {
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
					addLoginRecaptcha: settings.loginRecaptchaEnabled === 'on',
					publicKey: settings.recaptchaPublicKey,
					targetId: pluginData.nbbId + '-recaptcha-target',
					options: {
						// theme: settings.recaptchaTheme || 'clean',
						// todo: switch to custom theme, issue#9
						theme: 'clean',

						hl: (Meta.config.defaultLang || 'en').toLowerCase(),
						tabindex: settings.recaptchaTabindex || 0,
					},
				};
			}
		}

		if (!settings.akismetMinReputationHam) {
			settings.akismetMinReputationHam = 10;
		}

		if (settings.stopforumspamApiKey) {
			stopforumspam.Key(settings.stopforumspamApiKey);
		}

		winston.info('[plugins/' + pluginData.nbbId + '] Settings loaded');
		pluginSettings = settings;

		params.router.get('/admin/plugins/' + pluginData.nbbId, params.middleware.admin.buildHeader, Plugin.render);
		params.router.get('/api/admin/plugins/' + pluginData.nbbId, Plugin.render);

		params.router.post(
			'/api/user/:userslug/' + pluginData.nbbId + '/report',
			Plugin.middleware.isAdminOrGlobalMod,
			Plugin.middleware.checkStopForumSpam,
			Plugin.report);

		params.router.post(
			'/api/user/:username/' + pluginData.nbbId + '/report/queue',
			Plugin.middleware.isAdminOrGlobalMod,
			Plugin.middleware.checkStopForumSpam,
			Plugin.reportFromQueue);

		callback();
	});
};

Plugin.render = function (req, res) {
	res.render('admin/plugins/' + pluginData.nbbId, pluginData || {});
};

// report an existing user account
Plugin.report = function (req, res) {
	async.waterfall([
		function (next) {
			User.getUidByUserslug(req.params.userslug, next);
		},
		function (uid, next) {
			if (!uid) {
				return next(new Error('[[error:no-user]]'));
			}
			async.parallel({
				isAdmin: function (next) {
					User.isAdministrator(uid, next);
				},
				fields: function (next) {
					User.getUserFields(uid, ['username', 'email', 'uid'], next);
				},
				ips: function (next) {
					User.getIPs(uid, 4, next);
				},
			}, next);
		},
	], function (err, results) {
		if (err) {
			return res.status(400).json({ message: err.message || 'Something went wrong' });
		}

		if (results.isAdmin) {
			return res.status(403).send({ message: '[[spam-be-gone:cant-report-admin]]' });
		}
		var data = { ip: results.ips[0], email: results.fields.email, username: results.fields.username };
		stopforumspam.submit(data, 'Manual submission from user:' + req.uid + ' to user:' + results.fields.uid + ' via ' + pluginData.id)
			.then(function () {
				return res.status(200).json({ message: '[[spam-be-gone:user-reported]]' });
			})
			.catch(function (err) {
				winston.error('[plugins/' + pluginData.nbbId + '][report-error] ' + err.message, data);
				return res.status(400).json({ message: err.message || 'Something went wrong' });
			});
	});
};

// report a user that is in the registration queue
Plugin.reportFromQueue = async (req, res, next) => {
	const data = await db.getObject('registration:queue:name:' + req.params.username);
	if (!data) {
		res.status(400).json({ message: '[[error:no-user]]' });
	}
	var submitData = { ip: data.ip, email: data.email, username: data.username };
	stopforumspam.submit(submitData, 'Manual submission from user:' + req.uid + ' to user:' + data.username + ' via ' + pluginData.id)
		.then(function () {
			return res.status(200).json({ message: '[[spam-be-gone:user-reported]]' });
		})
		.catch(function (err) {
			winston.error('[plugins/' + pluginData.nbbId + '][report-error] ' + err.message, submitData);
			return res.status(400).json({ message: err.message || 'Something went wrong' });
		});
};

Plugin.appendConfig = async (data) => {
	data['spam-be-gone'] = {};

	if (pluginSettings.hCaptchaEnabled === 'on') {
		data['spam-be-gone'].hCaptcha = {
			key: pluginSettings.hCaptchaSiteKey,
		};
	}

	return data;
};

Plugin.addCaptcha = function (data, callback) {
	if (recaptchaArgs) {
		var captcha = {
			label: 'Captcha',
			html: '' +
			'<div id="' + pluginData.nbbId + '-recaptcha-target"></div>',
			styleName: pluginData.nbbId,
		};
		if (data.templateData) {
			data.templateData.recaptchaArgs = recaptchaArgs;
			if (data.templateData.regFormEntry && Array.isArray(data.templateData.regFormEntry)) {
				data.templateData.regFormEntry.push(captcha);
			} else if (recaptchaArgs.addLoginRecaptcha && data.templateData.loginFormEntry && Array.isArray(data.templateData.loginFormEntry)) {
				data.templateData.loginFormEntry.push(captcha);
			} else {
				data.templateData.captcha = captcha;
			}
		}
	}
	callback(null, data);
};

Plugin.onPostEdit = function (data, callback) {
	async.waterfall([
		function (next) {
			Topics.getTopicField(data.post.tid, 'cid', next);
		},
		function (cid, next) {
			Plugin.checkReply({
				content: data.post.content,
				uid: data.post.uid,
				cid: cid,
				req: data.req,
			}, { type: 'post' }, function (err) {
				next(err, data);
			});
		},
	], callback);
};

Plugin.onTopicEdit = function (data, callback) {
	Plugin.checkReply({
		title: data.topic.title || '',
		uid: data.topic.uid,
		cid: data.topic.cid,
		req: data.req,
	}, { type: 'topic' }, function (err) {
		callback(err, data);
	});
};

Plugin.onTopicPost = function (data, callback) {
	Plugin.checkReply(data, { type: 'topic' }, callback);
};

Plugin.onTopicReply = function (data, callback) {
	Plugin.checkReply(data, { type: 'post' }, callback);
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
				isAdmin: function (next) {
					User.isAdministrator(data.req.uid, next);
				},
				isModerator: function (next) {
					User.isModerator(data.req.uid, data.cid, next);
				},
				userData: function (next) {
					User.getUserFields(data.req.uid, ['username', 'reputation', 'email'], next);
				},
			}, next);
		},
		function (results, next) {
			userData = results.userData;
			if (results.isAdmin || results.isModerator) {
				return callback(null, data);
			}
			akismetData = {
				referrer: data.req.headers.referer,
				user_ip: data.req.ip,
				user_agent: data.req.headers['user-agent'],
				permalink: nconf.get('url').replace(/\/$/, '') + data.req.path,
				comment_content: (data.title ? data.title + '\n\n' : '') + (data.content || ''),
				comment_author: userData.username,
				comment_author_email: userData.email,
				// https://github.com/akhoury/nodebb-plugin-spam-be-gone/issues/54
				comment_type: options.type === 'topic' ? 'forum-post' : 'comment',
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

			winston.verbose('[plugins/' + pluginData.nbbId + '] Post "' + akismetData.comment_content + '" by uid: ' + data.req.uid + ' username: ' + userData.username + '@' + data.req.ip + ' was flagged as spam and rejected.');
			next(new Error('Post content was flagged as spam by Akismet.com'));
		},
	], callback);
};

Plugin.checkRegister = function (data, callback) {
	async.parallel([
		function (next) {
			Plugin._honeypotCheck(data.req, data.res, data.userData, next);
		},
		function (next) {
			Plugin._recaptchaCheck(data.req, data.res, data.userData, next);
		},
		async () => {
			await Plugin._hcaptchaCheck(data.userData);
		},
	], function (err) {
		callback(err, data);
	});
};

Plugin.checkLogin = function (data, callback) {
	if (!recaptchaArgs || !recaptchaArgs.addLoginRecaptcha) {
		return setImmediate(callback, null, data);
	}
	Plugin._recaptchaCheck(data.req, data.res, data.userData, function (err) {
		callback(err, data);
	});
};

function augmentWitSpamData(user, callback) {
	// temporary: see http://www.stopforumspam.com/forum/viewtopic.php?id=6392
	user.ip = user.ip.replace('::ffff:', '');

	stopforumspam.isSpammer({ ip: user.ip, email: user.email, username: user.username, f: 'json' })
		.then(function (body) {
			// body === false, then just set the default non spam response, which stopforumspam node module doesn't return it's spam, but some template rely on it
			if (!body) {
				body = { success: 1, username: { frequency: 0, appears: 0 }, email: { frequency: 0, appears: 0 }, ip: { frequency: 0, appears: 0, asn: null } };
			}
			user.spamChecked = true;
			user.spamData = body;
			user.usernameSpam = body.username ? (body.username.frequency > 0 || body.username.appears > 0) : true;
			user.emailSpam = body.email ? (body.email.frequency > 0 || body.email.appears > 0) : true;
			user.ipSpam = body.ip ? (body.ip.frequency > 0 || body.ip.appears > 0) : true;

			user.customActions = user.customActions || [];
			if (pluginSettings.stopforumspamApiKey) {
				user.customActions.push({
					title: '[[spam-be-gone:report-user]]',
					id: 'report-spam-user-' + user.username,
					class: 'btn-warning report-spam-user',
					icon: 'fa-flag',
				});
			}

			callback();
		})
		.catch(function (err) {
			// original nodebb core implementation did not pass the error to the cb, so im keeping it that way
			// https://github.com/NodeBB/NodeBB/blob/2cd1be0d041892742300a2ba2d5f1087b6272071/src/user/approval.js#L260-L264
			if (err) {
				winston.error(err);
			}
			callback();
		});
}

Plugin.getRegistrationQueue = function (data, callback) {
	if (pluginSettings.stopforumspamEnabled) {
		async.each(data.users, augmentWitSpamData, function (err) {
			callback(err, data);
		});
	}
};

Plugin.userProfileMenu = function (data, next) {
	if (pluginSettings.stopforumspamEnabled && pluginSettings.stopforumspamApiKey) {
		data.links.push({
			id: 'spamBeGoneReportUserBtn',
			route: 'report-user',
			icon: 'fa-flag',
			name: '[[spam-be-gone:report-user]]',
			visibility: {
				self: false,
				other: false,
				moderator: false,
				globalMod: true,
				admin: true,
			},
		});
	}
	next(null, data);
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
				User.getUserFields(flagObj.target.uid, ['username', 'email'], next);
			},
			permalink: function (next) {
				Topics.getTopicField(flagObj.target.tid, 'slug', next);
			},
			ip: function (next) {
				db.getSortedSetRevRange('uid:' + flagObj.target.uid + ':ip', 0, 1, next);
			},
		}, function (err, data) {
			if (err) {
				winston.error('Error reporting to Akismet', err);
			}

			// todo: we don't have access to the req here :/
			var submitted = {
				user_ip: data.ip ? data.ip[0] : '',
				permalink: nconf.get('url').replace(/\/$/, '') + '/topic/' + data.permalink,
				comment_author: data.userData.username,
				comment_author_email: data.userData.email,
				comment_content: flagObj.target.content,
				comment_type: 'forum-post',
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

Plugin.injectScript = async (scripts) => {
	scripts.push('https://hcaptcha.com/1/api.js');
	return scripts;
};

Plugin._honeypotCheck = function (req, res, userData, next) {
	if (honeypot && req && req.ip) {
		honeypot.query(req.ip, function (err, results) {
			if (err) {
				winston.error(err);
				next(null, userData);
			} else if (results && results.found && results.type) {
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

Plugin._hcaptchaCheck = async (userData) => {
	if (pluginSettings.hCaptchaEnabled !== 'on') {
		return;
	}

	const response = await hCaptcha.verify(pluginSettings.hCaptchaSecretKey, userData['h-captcha-response']);
	if (!response.success) {
		throw new Error('Captcha not verified, are you a robot?');
	}
};

Plugin.admin = {
	menu: function (custom_header, callback) {
		custom_header.plugins.push({
			route: '/plugins/' + pluginData.nbbId,
			icon: pluginData.faIcon,
			name: pluginData.name,
		});
		callback(null, custom_header);
	},
};

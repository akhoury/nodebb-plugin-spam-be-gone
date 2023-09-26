'use strict';

const util = require('util');
const https = require('https');
const Honeypot = require('project-honeypot');
const hCaptcha = require('hcaptcha');
const stopforumspam = require('stopforumspam');

const winston = require.main.require('winston');
const nconf = require.main.require('nconf');
const Meta = require.main.require('./src/meta');
const User = require.main.require('./src/user');
const Topics = require.main.require('./src/topics');
const db = require.main.require('./src/database');

const pluginData = require('./plugin.json');

let akismetClient;
let akismetCheckSpam;
let akismetSubmitSpam;
let akismetSubmitHam;

let honeypot;
let recaptchaArgs;
let pluginSettings;

const Plugin = module.exports;

pluginData.nbbId = pluginData.id.replace(/nodebb-plugin-/, '');
Plugin.nbbId = pluginData.nbbId;

Plugin.middleware = {};

Plugin.middleware.isAdminOrGlobalMod = function (req, res, next) {
	User.isAdminOrGlobalMod(req.uid, (err, isAdminOrGlobalMod) => {
		if (err) {
			return next(err);
		}
		if (isAdminOrGlobalMod) {
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

Plugin.load = async function (params) {
	const settings = await Meta.settings.get(pluginData.nbbId);
	if (!settings) {
		winston.warn(`[plugins/${pluginData.nbbId}] Settings not set or could not be retrieved!`);
		return;
	}

	if (settings.akismetEnabled === 'on') {
		if (settings.akismetApiKey) {
			akismetClient = require('akismet').client({
				blog: nconf.get('url'),
				apiKey: settings.akismetApiKey,
			});
			akismetClient.verifyKey((err, verified) => {
				if (err || !verified) {
					winston.error(`[plugins/${pluginData.nbbId}] Unable to verify Akismet API key.`);
					akismetClient = null;
				} else {
					akismetCheckSpam = util.promisify(akismetClient.checkSpam).bind(akismetClient);
					akismetSubmitSpam = util.promisify(akismetClient.submitSpam).bind(akismetClient);
					akismetSubmitHam = util.promisify(akismetClient.submitHam).bind(akismetClient);
				}
			});
		} else {
			winston.error(`[plugins/${pluginData.nbbId}] Akismet API Key not set!`);
		}
	}

	if (settings.honeypotEnabled === 'on') {
		if (settings.honeypotApiKey) {
			honeypot = Honeypot(settings.honeypotApiKey);
		} else {
			winston.error(`[plugins/${pluginData.nbbId}] Honeypot API Key not set!`);
		}
	}

	if (settings.recaptchaEnabled === 'on') {
		if (settings.recaptchaPublicKey && settings.recaptchaPrivateKey) {
			recaptchaArgs = {
				addLoginRecaptcha: settings.loginRecaptchaEnabled === 'on',
				publicKey: settings.recaptchaPublicKey,
				targetId: `${pluginData.nbbId}-recaptcha-target`,
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

	pluginSettings = settings;

	const routeHelpers = require.main.require('./src/routes/helpers');
	routeHelpers.setupAdminPageRoute(params.router, `/admin/plugins/${pluginData.nbbId}`, renderAdmin);

	params.router.post(
		`/api/user/:userslug/${pluginData.nbbId}/report`,
		Plugin.middleware.isAdminOrGlobalMod,
		Plugin.middleware.checkStopForumSpam,
		Plugin.report
	);

	params.router.post(
		`/api/user/:username/${pluginData.nbbId}/report/queue`,
		Plugin.middleware.isAdminOrGlobalMod,
		Plugin.middleware.checkStopForumSpam,
		Plugin.reportFromQueue
	);
};

async function renderAdmin(req, res) {
	let akismet = await db.getObject(`${pluginData.nbbId}:akismet`);
	akismet = { ...{ checks: 0, spam: 0 }, ...akismet };
	res.render(`admin/plugins/${pluginData.nbbId}`, {
		nbbId: pluginData.nbbId,
		akismet,
		title: 'Spam Be Gone',
	});
}

// report an existing user account
Plugin.report = async function (req, res, next) {
	try {
		const uid = await User.getUidByUserslug(req.params.userslug);
		if (!uid) {
			return next(new Error('[[error:no-user]]'));
		}
		const [isAdmin, fields, ips] = await Promise.all([
			User.isAdministrator(uid),
			User.getUserFields(uid, ['username', 'email', 'uid']),
			User.getIPs(uid, 0),
		]);
		if (isAdmin) {
			return res.status(403).send({ message: '[[spam-be-gone:cant-report-admin]]' });
		}
		const data = {
			ip: ips[0],
			email: fields.email,
			username: fields.username,
		};
		await stopforumspam.submit(data, `Manual submission from user: ${req.uid} to user: ${fields.uid} via ${pluginData.id}`);
		res.status(200).json({ message: '[[spam-be-gone:user-reported]]' });
	} catch (err) {
		winston.error(`[plugins/${pluginData.nbbId}][report-error] ${err.message}`);
		res.status(400).json({ message: err.message || 'Something went wrong' });
	}
};

// report a user that is in the registration queue
Plugin.reportFromQueue = async (req, res) => {
	const data = await db.getObject(`registration:queue:name:${req.params.username}`);
	if (!data) {
		res.status(400).json({ message: '[[error:no-user]]' });
	}
	const submitData = {
		ip: data.ip,
		email: data.email,
		username: data.username,
	};
	try {
		await stopforumspam.submit(submitData, `Manual submission from user: ${req.uid} to user: ${data.username} via ${pluginData.id}`);
		res.status(200).json({ message: '[[spam-be-gone:user-reported]]' });
	} catch (err) {
		winston.error(`[plugins/${pluginData.nbbId}][report-error] ${err.message}\n${JSON.stringify(submitData, null, 4)}`);
		res.status(400).json({ message: err.message || 'Something went wrong' });
	}
};

Plugin.appendConfig = async (data) => {
	data['spam-be-gone'] = {};
	const { hCaptchaEnabled, hCaptchaSiteKey } = await Meta.settings.get('spam-be-gone');

	if (hCaptchaEnabled === 'on') {
		data['spam-be-gone'].hCaptcha = {
			key: hCaptchaSiteKey,
		};
	}

	return data;
};

Plugin.addCaptcha = async (data) => {
	function addCaptchaData(templateData, loginCaptchaEnabled, captcha) {
		if (templateData.regFormEntry && Array.isArray(templateData.regFormEntry)) {
			templateData.regFormEntry.push(captcha);
		} else if (Array.isArray(templateData.loginFormEntry)) {
			if (loginCaptchaEnabled) {
				templateData.loginFormEntry.push(captcha);
			}
		} else {
			templateData.captcha = captcha;
		}
	}

	if (recaptchaArgs) {
		if (data.templateData) {
			data.templateData.recaptchaArgs = recaptchaArgs;
			addCaptchaData(data.templateData, recaptchaArgs.addLoginRecaptcha, {
				label: 'Captcha',
				html: `<div id="${pluginData.nbbId}-recaptcha-target"></div>`,
				styleName: pluginData.nbbId,
			});
		}
	}

	const { hCaptchaEnabled, loginhCaptchaEnabled } = await Meta.settings.get('spam-be-gone');
	if (hCaptchaEnabled === 'on') {
		if (data.templateData) {
			addCaptchaData(data.templateData, loginhCaptchaEnabled === 'on', {
				label: 'CAPTCHA',
				html: `<div id="h-captcha"></div>`,
				styleName: pluginData.nbbId,
			});
		}
	}

	return data;
};

Plugin.onPostEdit = async function (data) {
	const cid = await Topics.getTopicField(data.post.tid, 'cid');
	await Plugin.checkReply({
		content: data.post.content,
		uid: data.post.uid,
		cid: cid,
		req: data.req,
	}, { type: 'post', edit: true });
	return data;
};

Plugin.onTopicEdit = async function (data) {
	await Plugin.checkReply({
		title: data.topic.title || '',
		uid: data.topic.uid,
		cid: data.topic.cid,
		req: data.req,
	}, { type: 'topic', edit: true });
	return data;
};

Plugin.onTopicPost = async function (data) {
	await Plugin.checkReply(data, { type: 'topic' });
	return data;
};

Plugin.onTopicReply = async function (data) {
	await Plugin.checkReply(data, { type: 'post' });
	return data;
};

Plugin.checkReply = async function (data, options) {
	options = options || {};
	// http://akismet.com/development/api/#comment-check
	if (!akismetClient || !data || !data.req) {
		return;
	}
	if (data.fromQueue) { // don't check if submitted from queue
		return;
	}
	const [isAdmin, isModerator, userData] = await Promise.all([
		User.isAdministrator(data.req.uid),
		User.isModerator(data.req.uid, data.cid),
		User.getUserFields(data.req.uid, ['username', 'reputation', 'email']),
	]);

	if (isAdmin || isModerator) {
		return;
	}
	const akismetData = {
		referrer: data.req.headers.referer,
		user_ip: data.req.ip,
		user_agent: data.req.headers['user-agent'],
		permalink: nconf.get('url').replace(/\/$/, '') + data.req.path,
		comment_content: (data.title ? `${data.title}\n\n` : '') + (data.content || ''),
		comment_author: userData.username,
		comment_author_email: userData.email,
		// https://github.com/akhoury/nodebb-plugin-spam-be-gone/issues/54
		comment_type: options.type === 'topic' ? 'forum-post' : 'comment',
	};

	if (options.edit) {
		akismetData.recheck_reason = 'edit';
	}

	const isSpam = await akismetCheckSpam(akismetData);
	await db.incrObjectField(`${pluginData.nbbId}:akismet`, 'checks');
	if (!isSpam) {
		return;
	}
	await db.incrObjectField(`${pluginData.nbbId}:akismet`, 'spam');

	if (parseInt(userData.reputation, 10) >= parseInt(pluginSettings.akismetMinReputationHam, 10)) {
		await akismetSubmitHam(akismetData);
	}

	winston.verbose(`[plugins/${pluginData.nbbId}] Post "${akismetData.comment_content}" by uid: ${data.req.uid} username: ${userData.username}@${data.req.ip} was flagged as spam and rejected.`);
	throw new Error('Post content was flagged as spam by Akismet.com');
};

Plugin.checkRegister = async function (data) {
	await Promise.all([
		Plugin._honeypotCheck(data.req, data.userData),
		Plugin._recaptchaCheck(data.req, data.userData),
		Plugin._hcaptchaCheck(data.userData),
	]);
	return data;
};

Plugin.checkLogin = async function (data) {
	const { loginhCaptchaEnabled } = await Meta.settings.get('spam-be-gone');
	if (loginhCaptchaEnabled === 'on') {
		await Plugin._hcaptchaCheck(data.userData);
	}

	if (!recaptchaArgs || !recaptchaArgs.addLoginRecaptcha) {
		return data;
	}
	await Plugin._recaptchaCheck(data.req, data.res, data.userData);
	return data;
};

Plugin.getRegistrationQueue = async function (data) {
	if (pluginSettings.stopforumspamEnabled) {
		await Promise.all(data.users.map(augmentWitSpamData));
	}
	return data;
};

async function augmentWitSpamData(user) {
	// temporary: see http://www.stopforumspam.com/forum/viewtopic.php?id=6392
	try {
		user.ip = user.ip.replace('::ffff:', '');

		let body = await stopforumspam.isSpammer({ ip: user.ip, email: user.email, username: user.username, f: 'json' });
		// body === false, then just set the default non spam response,
		// which stopforumspam node module doesn't return it's spam, but some template rely on it
		if (!body) {
			body = {
				success: 1,
				username: { frequency: 0, appears: 0 },
				email: { frequency: 0, appears: 0 },
				ip: { frequency: 0, appears: 0, asn: null },
			};
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
				id: `report-spam-user-${user.username}`,
				class: 'btn-warning report-spam-user',
				icon: 'fa-flag',
			});
		}
	} catch (err) {
		// original nodebb core implementation did not pass the error to the cb, so im keeping it that way
		// https://github.com/NodeBB/NodeBB/blob/2cd1be0d041892742300a2ba2d5f1087b6272071/src/user/approval.js#L260-L264
		if (err) {
			winston.error(err);
		}
	}
}

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

Plugin.onPostFlagged = async function (data) {
	const flagObj = data.flag;

	// Don't do anything if flag is not for a post and not for "spam" reason
	if (flagObj.type !== 'post' || flagObj.description !== 'Spam') {
		return;
	}

	if (akismetClient && pluginSettings.akismetFlagReporting &&
		parseInt(flagObj.reporter.reputation, 10) >= parseInt(pluginSettings.akismetFlagReporting, 10)) {
		const [userData, permalink, ip] = await Promise.all([
			User.getUserFields(flagObj.target.uid, ['username', 'email']),
			Topics.getTopicField(flagObj.target.tid, 'slug'),
			db.getSortedSetRevRange(`uid:${flagObj.target.uid}:ip`, 0, 1),
		]);

		// todo: we don't have access to the req here :/
		const submitted = {
			user_ip: ip ? ip[0] : '',
			permalink: `${nconf.get('url').replace(/\/$/, '')}/topic/${permalink}`,
			comment_author: userData.username,
			comment_author_email: userData.email,
			comment_content: flagObj.target.content,
			comment_type: 'forum-post',
		};
		try {
			await akismetSubmitSpam(submitted);
			winston.info('Spam reported to Akismet.', submitted);
		} catch (err) {
			winston.error(`Error reporting to Akismet ${err.message}\n${JSON.stringify(submitted, null, 4)}`);
		}
	}
};

Plugin._honeypotCheck = async function (req, userData) {
	if (honeypot && req && req.ip) {
		const honeypotQuery = util.promisify(honeypot.query);
		const results = await honeypotQuery(req.ip);

		if (results && results.found && results.type) {
			if (results.type.spammer || results.type.suspicious) {
				const message = `${userData.username} | ${userData.email} was detected as ${(results.type.spammer ? 'spammer' : 'suspicious')}`;

				winston.warn(`[plugins/${pluginData.nbbId}] ${message} and was denied registration.`);
				throw new Error(message);
			}
		} else {
			winston.verbose(`[plugins/${pluginData.nbbId}] username: ${userData.username} ip: ${req.ip} was not found in Honeypot database`);
		}
	}
};

Plugin._recaptchaCheck = async function (req) {
	if (recaptchaArgs && req && req.ip && req.body) {
		const postData = `secret=${pluginSettings.recaptchaPrivateKey}&response=${req.body['g-recaptcha-response']}&remoteip=${req.ip}`;
		const options = {
			hostname: 'www.recaptcha.net',
			path: '/recaptcha/api/siteverify',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			},
		};

		return new Promise((resolve, reject) => {
			const request = https.request(options, (res) => {
				let responseData = '';

				res.on('data', (chunk) => {
					responseData += chunk;
				});

				res.on('end', () => {
					const response = JSON.parse(responseData);

					if (response.success === true) {
						resolve();
					} else {
						const message = '[[spam-be-gone:captcha-not-verified]]';
						reject(new Error(message));
					}
				});
			});

			request.on('error', (error) => {
				const message = error.message || '[[spam-be-gone:captcha-not-verified]]';
				reject(new Error(message));
			});

			request.write(postData);
			request.end();
		});
	}
};

Plugin._hcaptchaCheck = async (userData) => {
	const { hCaptchaEnabled, hCaptchaSecretKey } = await Meta.settings.get('spam-be-gone');
	if (hCaptchaEnabled !== 'on') {
		return;
	}

	const response = await hCaptcha.verify(hCaptchaSecretKey, userData['h-captcha-response']);
	if (!response.success) {
		throw new Error('[[spam-be-gone:captcha-not-verified]]');
	}
};

Plugin.admin = {
	menu: function (custom_header, callback) {
		custom_header.plugins.push({
			route: `/plugins/${pluginData.nbbId}`,
			icon: pluginData.faIcon,
			name: pluginData.name,
		});
		callback(null, custom_header);
	},
};

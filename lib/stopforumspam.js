'use strict';

const NodeBBVersion = require(nodebb.require('./src/constants').paths.currentPackage).version;
const SpamBeGoneVersion = require('../package.json').version;

const StopForumSpam = module.exports;

StopForumSpam.api_key = '';

async function callStopForumSpam(uri, data) {
	const response = await fetch(uri, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': `NodeBB/${NodeBBVersion} | nodebb-plugin-spam-be-gone/${SpamBeGoneVersion}`,
		},
		body: new URLSearchParams(data).toString(),
	});
	const responseBody = await response.text();
	if (!response.ok) {
		throw new Error(`StopForumSpam responded with ${response.status}: ${responseBody}`);
	}
	return responseBody;
}

// https://www.stopforumspam.com/usage
StopForumSpam.check = async ({ ip, email, username }) => {
	const data = { json: '', nobadusername: '' };
	if (ip) data.ip = ip;
	if (email) data.email = email;
	if (username) data.username = username;

	const body = JSON.parse(await callStopForumSpam('https://api.stopforumspam.org/api', data));
	if (body.success !== 1) {
		throw new Error(`StopForumSpam lookup failed: ${body.error || 'unknown error'}`);
	}
	return body;
};

StopForumSpam.submit = async ({ ip, email, username }, evidence) => {
	if (!StopForumSpam.api_key) {
		throw new Error('You cannot submit spammers without an API Key.');
	}
	if (!ip || !email || !username) {
		throw new Error('You must have all search parameters for StopForumSpam.com to accept your submission.');
	}
	const data = { username, email, ip_addr: ip, api_key: StopForumSpam.api_key };
	if (evidence) data.evidence = evidence;

	await callStopForumSpam('https://www.stopforumspam.com/add.php', data);
};

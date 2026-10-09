'use strict';

const NodeBBVersion = require(nodebb.require('./src/constants').paths.currentPackage).version;
const SpamBeGoneVersion = require('../package.json').version;

const Akismet = module.exports;

Akismet.verified = false;
Akismet.api_key = '';
Akismet.blog = '';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_CALLS = 100;
const callTimestamps = [];

function checkRateLimit() {
	const now = Date.now();
	// timestamps are chronological, so drop expired entries from the front
	while (callTimestamps.length && now - callTimestamps[0] >= RATE_LIMIT_WINDOW_MS) {
		callTimestamps.shift();
	}
	if (callTimestamps.length >= RATE_LIMIT_MAX_CALLS) {
		throw new Error('Akismet API rate limit exceeded, please try again later.');
	}
	callTimestamps.push(now);
}

async function callAkismet(uri, data) {
	checkRateLimit();

	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
		'User-Agent': `NodeBB/${NodeBBVersion} | nodebb-plugin-spam-be-gone/${SpamBeGoneVersion}`,
	};
	data.api_key = data.api_key || Akismet.api_key;
	data.blog = data.blog || Akismet.blog;

	const response = await fetch(uri, {
		method: 'POST',
		headers,
		body: new URLSearchParams(data).toString(),
	});

	const responseBody = await response.text();
	return responseBody;
}

Akismet.verifyKey = async (key, blog) => {
	Akismet.api_key = key;
	Akismet.blog = blog;

	try {
		const responseBody = await callAkismet(
			'https://rest.akismet.com/1.1/verify-key',
			{ api_key: key, blog }
		);

		Akismet.verified = responseBody === 'valid';

		return Akismet.verified;
	} catch (error) {
		console.error('Error verifying Akismet API key:', error);
		return false;
	}
};

Akismet.checkSpam = async (data) => {
	try {
		const responseBody = await callAkismet('https://rest.akismet.com/1.1/comment-check', data);
		const isSpam = responseBody === 'true';
		return isSpam;
	} catch (error) {
		console.error('Error checking spam:', error);
		throw error;
	}
};

Akismet.submitSpam = async (data) => {
	try {
		await callAkismet('https://rest.akismet.com/1.1/submit-spam', data);
	} catch (error) {
		console.error('Error submittin spam:', error);
	}
};

Akismet.submitHam = async (data) => {
	try {
		await callAkismet('https://rest.akismet.com/1.1/submit-ham', data);
	} catch (error) {
		console.error('Error submittin ham:', error);
	}
};


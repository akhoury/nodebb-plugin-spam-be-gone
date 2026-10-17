'use strict';

const NodeBBVersion = require(nodebb.require('./src/constants').paths.currentPackage).version;
const SpamBeGoneVersion = require('../package.json').version;

const Akismet = module.exports;

Akismet.verified = false;
Akismet.api_key = '';
Akismet.blog = '';

const winston = nodebb.require('winston');
const { createLimiter } = require('./ratelimit');

Akismet.rateLimitMax = 1000; // calls per minute, per process; overridden by the akismetRateLimit setting

// not applied to verify-key: it is a low-frequency admin action and must not eat user-facing headroom
const limiter = createLimiter({ windowMs: 60 * 1000, getMax: () => Akismet.rateLimitMax });
let lastWarned = 0;

function warnRateLimited() {
	const now = Date.now();
	if (now - lastWarned >= 60 * 1000) {
		lastWarned = now;
		winston.warn(`[spam-be-gone] Akismet rate limit (${Akismet.rateLimitMax}/min) reached, skipping Akismet calls.`);
	}
}

// resolves to null if the call was skipped due to the rate limit
async function callAkismet(uri, data, { throttle = true } = {}) {
	if (throttle && !limiter.tryAcquire()) {
		warnRateLimited();
		return null;
	}

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
			{ api_key: key, blog },
				{ throttle: false }
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
		if (responseBody === null) {
			return false; // rate limited: fail open rather than rejecting the post
		}
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


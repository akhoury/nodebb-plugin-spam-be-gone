'use strict';

const Meta = nodebb.require('./src/meta');

exports.cfTurnstileCheck = async (req, token) => {
	if (
		typeof token !== 'string' ||
			token.length === 0 ||
			token.length > 2048
	) {
		throw new Error('[[spam-be-gone:captcha-not-verified]]');
	}

	const { cfturnstileApiKey } = await Meta.settings.get('spam-be-gone');
	let result;
	try {
		const r = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				signal: AbortSignal.timeout(10000),
				body: new URLSearchParams({
					secret: cfturnstileApiKey,
					response: token,
					remoteip: req.ip,
				}),
			},
		);
		if (!r.ok) {
			throw new Error(`siteverify ${r.status}`);
		}
		result = await r.json();
	} catch {
		throw new Error('[[spam-be-gone:captcha-not-verified]]');
	}

	if (!result.success || (result.action !== 'login' && result.action !== 'register')) {
		throw new Error('[[spam-be-gone:captcha-not-verified]]');
	}
};
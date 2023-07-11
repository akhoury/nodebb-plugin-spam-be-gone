'use strict';

/* global hcaptcha */

define('spam-be-gone/hcaptcha', ['alerts'], (alerts) => {
	const hCaptcha = {};

	hCaptcha.init = () => {
		const hCaptchaOK = config['spam-be-gone'] && config['spam-be-gone'].hCaptcha;

		if (hCaptchaOK) {
			$.getScript('https://hcaptcha.com/1/api.js').then(() => {
				if (hcaptcha) {
					hcaptcha.render('h-captcha', {
						sitekey: config['spam-be-gone'].hCaptcha.key,
					});
				}
			}).fail(() => {
				alerts.error('Error loading hcaptcha');
			});
		}
	};

	return hCaptcha;
});

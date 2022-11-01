'use strict';

/* global hcaptcha */

define('spam-be-gone/hcaptcha', [], () => {
	const hCaptcha = {};

	hCaptcha.init = () => {
		const hCaptchaOK = config['spam-be-gone'] && config['spam-be-gone'].hCaptcha;

		if (hCaptchaOK) {
			hcaptcha.render('h-captcha', {
				sitekey: config['spam-be-gone'].hCaptcha.key,
			});
		}
	};

	return hCaptcha;
});

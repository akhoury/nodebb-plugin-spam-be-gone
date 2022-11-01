'use strict';

/* global hcaptcha */

define('spam-be-gone/register', [], () => {
	const Register = {};

	Register.init = () => {
		const hCaptchaOK = config['spam-be-gone'] && config['spam-be-gone'].hCaptcha;

		if (hCaptchaOK) {
			hcaptcha.render('h-captcha', {
				sitekey: config['spam-be-gone'].hCaptcha.key,
			});
		}
	};

	return Register;
});

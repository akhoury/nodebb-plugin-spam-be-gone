'use strict';

/* global define, hcaptcha, config, $ */

define('spam-be-gone/register', [], () => {
	const Register = {};

	Register.init = () => {
		const hCaptchaOK = config['spam-be-gone'] && config['spam-be-gone'].hCaptcha;

		if (hCaptchaOK) {
			const registerEl = $('#register').parents('.form-group');
			const cloneTarget = registerEl.prev('.form-group');
			const formEl = cloneTarget.clone().insertBefore(registerEl);

			formEl.find('label').text('CAPTCHA');
			formEl.children().eq(1).html('<div id="h-captcha"></div>');

			hcaptcha.render('h-captcha', {
				sitekey: config['spam-be-gone'].hCaptcha.key,
			});
		}
	};

	return Register;
});

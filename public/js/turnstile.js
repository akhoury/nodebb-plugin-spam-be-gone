'use strict';

/* global turnstile */

define('spam-be-gone/turnstile', ['alerts'], (alerts) => {
	const module = {};

	module.init = () => {
		const turnstileOK = config['spam-be-gone'] && config['spam-be-gone'].cfturnstile;

		if (turnstileOK) {
			$.getScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(() => {
				if (turnstile) {
					turnstile.render('#turnstile-container', {
						sitekey: config['spam-be-gone'].cfturnstile.key,
						action: ajaxify.data.template.login ? 'login' : 'register',
					});
				}
			}).fail((err) => {
				alerts.error('Error loading turnstile');
				console.error(err);
			});
		}
	};

	return module;
});

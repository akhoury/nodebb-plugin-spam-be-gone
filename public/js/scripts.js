'use strict';

/* global grecaptcha */

$(function () {
	var pluginName = 'spam-be-gone';

	function ensureRecaptchaThenCreate() {
		if (!$('script[src*="www.recaptcha.net/recaptcha/api.js"]').length) {
			injectScript('//www.recaptcha.net/recaptcha/api.js?onload=__nodebbSpamBeGoneCreateCaptcha__&render=explicit&hl=' +
				(ajaxify.data.recaptchaArgs.options.hl || 'en'));
		} else if (grecaptcha) {
			window.__nodebbSpamBeGoneCreateCaptcha__();
		}
	}

	function onRegisterPage() {
		if (ajaxify.data.recaptchaArgs) {
			ensureRecaptchaThenCreate();
		}
	}

	function onLoginPage() {
		if (ajaxify.data.recaptchaArgs && ajaxify.data.recaptchaArgs.addLoginRecaptcha) {
			ensureRecaptchaThenCreate();
		}
	}

	function onAccountProfilePage() {
		var $btn = $('#spamBeGoneReportUserBtn');
		$btn.off('click');
		$btn.on('click', function (e) {
			e.preventDefault();
			reportUser('/api/user/' + ajaxify.data.userslug + '/' + pluginName + '/report');
			var $parentBtn = $btn.parents('.account-fab').find('[data-toggle="dropdown"]');
			if ($parentBtn.dropdown) {
				$parentBtn.dropdown('toggle');
			}
			return false;
		});
	}

	function onManageRegistrationPage() {
		var $btn = $('button.report-spam-user');
		$btn.on('click', function (e) {
			e.preventDefault();
			var username = $btn.parents('[data-username]').attr('data-username');
			reportUser('/api/user/' + username + '/' + pluginName + '/report/queue');
			return false;
		});
	}

	function reportUser(url) {
		require(['alerts'], function (alerts) {
			return $.post(url)
				.then(function () {
					alerts.success('User reported!');
				})
				.catch(function (e) {
					alerts.error(e.responseJSON.message || '[spam-be-gone:something-went-wrong]');
				});
		});
	}

	function injectTag(tagName, attrs, options) {
		options = options || {};

		var tag = document.createElement(tagName);
		tag.onload = options.onload || null; // @ie8; img.onload cannot be undefined

		var setAttr = tag.setAttribute ?
			function (tag, key, value) { tag.setAttribute(key, value); return tag; } :
			function (tag, key, value) { tag[key] = value; return tag; };

		Object.keys(attrs).forEach(function (key) {
			tag = setAttr(tag, key, attrs[key]);
		});

		if (options.insertBefore) {
			options.insertBefore.parentNode.insertBefore(tag, options.insertBefore);
		} else if (options.appendChild) {
			options.appendChild.appendChild(tag);
		} else {
			var scripts = document.getElementsByTagName('script');
			scripts[scripts.length - 1].parentNode.appendChild(tag);
		}
	}

	function injectScript(src, options) {
		options = options || {};
		injectTag('script', { src: src, type: 'text/javascript', async: '', defer: '' }, options);
	}

	$(window).on('action:ajaxify.end', function (evt, data) {
		switch (data.tpl_url) {
			case 'register':
				onRegisterPage(data);
				break;
			case 'login':
				onLoginPage(data);
				break;
			case 'account/profile':
				onAccountProfilePage(data);
				break;
			case 'admin/manage/registration':
				onManageRegistrationPage(data);
				break;
		}
	});
});

window.__nodebbSpamBeGoneCreateCaptcha__ = function () {
	var args = ajaxify.data.recaptchaArgs;
	if (!args) {
		return;
	}

	grecaptcha.render(
		args.targetId,
		{
			theme: args.options.theme,
			sitekey: args.publicKey,
			callback: function () {
				var error = utils.param('error');
				if (error) {
					require(['alerts'], function (alerts) {
						alerts.error(error);
					});
				}
			},
		}
	);
};

$(window).on('action:script.load', function (evt, data) {
	// Inject register.tpl client-side script
	if (['register', 'login'].includes(data.tpl_url)) {
		data.scripts.push('spam-be-gone/hcaptcha');
	}
});

'use strict';

/* global grecaptcha */

$(function () {
	const pluginName = 'spam-be-gone';

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
		const $btn = $('#spamBeGoneReportUserBtn');
		$btn.off('click');
		$btn.on('click', function (e) {
			e.preventDefault();
			reportUser(`/api/user/${ajaxify.data.userslug}/${pluginName}/report`);
			const $parentBtn = $btn.parents('.account-fab').find('[data-toggle="dropdown"]');
			if ($parentBtn.dropdown) {
				$parentBtn.dropdown('toggle');
			}
			return false;
		});
	}

	function onManageRegistrationPage() {
		$('button.report-spam-user').on('click', function (e) {
			e.preventDefault();
			const username = $(this).parents('[data-username]').attr('data-username');
			reportUser(`/api/user/${username}/${pluginName}/report/queue`);
			return false;
		});

		$('#reject-and-report-spam-users').on('click', function (e) {
			e.preventDefault();
			// read the selection straight from the DOM; `forum/registration` is a page
			// controller and cannot be resolved from a plugin script by webpack
			const usernames = $('.registration-queue-group[data-group="spam"]')
				.find('[component="registration-queue/select/single"]:checked')
				.map((index, el) => $(el).attr('data-username'))
				.get();

			require(['modals', 'alerts'], function (modals, alerts) {
				if (!usernames.length) {
					return alerts.error('[[error:no-users-selected]]');
				}
				modals.confirm(`[[spam-be-gone:reject-and-report-confirm, ${usernames.length}]]`, function (ok) {
					if (ok) {
						rejectAndReportUsers(usernames);
					}
				});
			});
			return false;
		});
	}

	function rejectAndReportUsers(usernames) {
		require(['alerts'], function (alerts) {
			return $.ajax({
				url: `${config.relative_path}/api/${pluginName}/report/queue/bulk`,
				method: 'POST',
				data: JSON.stringify({ usernames: usernames }),
				contentType: 'application/json',
				headers: {
					'x-csrf-token': config.csrf_token,
				},
			}).then(function (res) {
				if (res.failed.length) {
					alerts.warning(`[[spam-be-gone:bulk-report-result, ${res.reported.length}, ${res.failed.length}]]`);
				} else {
					alerts.success('[[spam-be-gone:user-reported]]');
				}
				ajaxify.refresh();
			}).catch(function (e) {
				alerts.error((e.responseJSON && e.responseJSON.message) || '[[spam-be-gone:something-went-wrong]]');
			});
		});
	}

	function reportUser(url) {
		require(['alerts'], function (alerts) {
			return $.ajax({
				url: config.relative_path + url,
				method: 'POST',
				headers: {
					'x-csrf-token': config.csrf_token,
				},
			}).then(function (res) {
				alerts.success(res.message || '[[spam-be-gone:user-reported]]');
			}).catch(function (e) {
				alerts.error((e.responseJSON && e.responseJSON.message) || '[[spam-be-gone:something-went-wrong]]');
			});
		});
	}

	function injectTag(tagName, attrs, options) {
		options = options || {};

		let tag = document.createElement(tagName);
		tag.onload = options.onload || null; // @ie8; img.onload cannot be undefined

		const setAttr = tag.setAttribute ?
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
			const scripts = document.getElementsByTagName('script');
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
			case 'registration-queue':
			case 'admin/manage/registration':
				onManageRegistrationPage(data);
				break;
		}
	});
});

window.__nodebbSpamBeGoneCreateCaptcha__ = function () {
	const args = ajaxify.data.recaptchaArgs;
	if (!args) {
		return;
	}

	grecaptcha.render(
		args.targetId,
		{
			theme: args.options.theme,
			sitekey: args.publicKey,
			callback: function () {
				const error = utils.param('error');
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

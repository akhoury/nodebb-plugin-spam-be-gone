$(function() {
	$(window).on('action:ajaxify.end', function(e, data) {
		if (
			data.url === 'register'
			&& window.plugin
			&& plugin['spam-be-gone']
			&& plugin['spam-be-gone'].recaptchaArgs
			&& $('#' + plugin['spam-be-gone'].recaptchaArgs.targetId).length
			) {

			var createCaptcha = function() {
				var args = plugin['spam-be-gone'].recaptchaArgs;

				if (window.Recaptcha) {
					Recaptcha.create(
						args.publicKey,
						args.targetId,
						{
							theme: args.options.theme,
							lang: args.options.lang,
							tabIndex: args.options.tabindex,
							callback: function() {
								var error = utils.param('error');
								if (error) {
									app.alertError(error);
								}
							}
						}
					);
				}
			};

			if ($('script[scr$="recaptcha_ajax.js"]').length) {
				createCaptcha();
			} else {
				utils.injectScript('//www.google.com/recaptcha/api/js/recaptcha_ajax.js', {onload: createCaptcha});
			}
		}
	});
});
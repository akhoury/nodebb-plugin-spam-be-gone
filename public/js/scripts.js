$(function() {
	$(window).on('action:ajaxify.end', function(e, data) {
		if (
			data.url === 'register'
			&& window.plugin
			&& plugin['spam-be-gone']
			&& plugin['spam-be-gone'].recaptchaArgs
		) {
			var args = plugin['spam-be-gone'].recaptchaArgs;
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
	});
})
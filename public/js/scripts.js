window.__nodebbSpamBeGoneCreateCaptcha__ = function () {
    var args = plugin['spam-be-gone'].recaptchaArgs;

    grecaptcha.render(
        args.targetId,
		{
			theme: args.options.theme,
			sitekey: args.publicKey,
			callback: function() {
				var error = utils.param('error');
				if (error) {
					app.alertError(error);
				}
			}
		}
	);
};

$(function() {
	$(window).on('action:ajaxify.end', function(e, data) {
		if (
			data.url === 'register'
			&& window.plugin
			&& plugin['spam-be-gone']
			&& plugin['spam-be-gone'].recaptchaArgs
			&& $('#' + plugin['spam-be-gone'].recaptchaArgs.targetId).length
			) {

			var args = plugin['spam-be-gone'].recaptchaArgs;

			var injectTag = function (tagName, attrs, options) {
					options || (options = {});

					var tag = document.createElement(tagName);
					tag.onload = options.onload || null; // @ie8; img.onload cannot be undefined

					var setAttr = tag.setAttribute
						? function(tag, key, value) { tag.setAttribute(key, value); return tag;}
						: function(tag, key, value) { tag[key] = value; return tag;};

					Object.keys(attrs).forEach(function(key) {
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
				},

				injectScript = function(src, options) {
					options || (options = {});
					injectTag('script', {src: src, type: 'text/javascript', async: '', defer: '' }, options);
				};

				injectScript('//www.google.com/recaptcha/api.js?onload=__nodebbSpamBeGoneCreateCaptcha__&render=explicit&hl=' + (args.options.hl || 'en'));
		}
	});
});

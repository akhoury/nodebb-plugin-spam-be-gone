$(function() {
	$(window).on('action:ajaxify.end', function(e, data) {
		if (data.url.indexOf('register') > -1) {
			var captchaDiv = $('#register-captcha #recaptcha_widget_div');

		}
	});
});
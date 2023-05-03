'use strict';

define('admin/plugins/spam-be-gone', ['settings', 'alerts'], function (Settings, alerts) {
	var Admin = {};

	Admin.init = function () {
		var nbbId = ajaxify.data.nbbId;
		var klass = nbbId + '-settings';
		var wrapper = $('.' + klass);

		function onChange(e) {
			var target = $(e.target);
			var input = wrapper.find(target.attr('data-toggle-target'));
			input.prop('disabled', !target.is(':checked'));
		}

		wrapper.find('input[type="checkbox"][data-toggle-target]').on('change', onChange);

		Settings.load(nbbId, wrapper, function () {
			wrapper.find('input[type="checkbox"][data-toggle-target]').each(function () {
				onChange({ target: this });
			});
		});

		$('#save').on('click', function (e) {
			e.preventDefault();
			wrapper.find('.has-error').removeClass('has-error');

			var invalidSelector = '';
			var invalidCount = 0;
			wrapper.find('input[type="checkbox"][data-toggle-target]').each(function (i, checkbox) {
				checkbox = $(checkbox);
				if (checkbox.is(':checked') && !wrapper.find(checkbox.attr('data-toggle-target')).val()) {
					// eslint-disable-next-line no-plusplus
					invalidSelector += (!invalidCount++ ? '' : ', ') + checkbox.attr('data-toggle-target');
				}
			});

			if (invalidSelector) {
				wrapper.find(invalidSelector).each(function (i, el) {
					el = $(el);
					el.parent().addClass('has-error');
				});
				alerts.error('Empty fields not allowed!');
			} else {
				Settings.save(nbbId, wrapper, function () {
					alerts.alert({
						type: 'success',
						alert_id: nbbId,
						title: 'Reload Required',
						message: 'Please reload your NodeBB to have your changes take effect',
						clickfn: function () {
							socket.emit('admin.reload');
						},
					});
				});
			}
		});
	};

	return Admin;
});

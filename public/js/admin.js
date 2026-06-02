'use strict';

define('admin/plugins/spam-be-gone', ['settings', 'alerts'], function (Settings, alerts) {
	const Admin = {};

	Admin.init = function () {
		const nbbId = ajaxify.data.nbbId;
		const klass = nbbId + '-settings';
		const wrapper = $('.' + klass);

		function onChange(e) {
			const target = $(e.target);
			const input = wrapper.find(target.attr('data-toggle-target'));
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

			let invalidSelector = '';
			let invalidCount = 0;
			wrapper.find('input[type="checkbox"][data-toggle-target]').each(function (i, checkbox) {
				checkbox = $(checkbox);
				if (checkbox.is(':checked') && !wrapper.find(checkbox.attr('data-toggle-target')).val()) {
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

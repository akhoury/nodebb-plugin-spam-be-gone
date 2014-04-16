<h1><i class="fa {faIcon}"></i> {name}</h1>

<form role="form" class="{nbbId}-settings">
	<fieldset>
		<div class="row">
			<div class="col-sm-12">
                <div class="checkbox">
                   <label>
                     <input data-toggle-target="#akismetApiKey" type="checkbox" id="akismetEnabled" name="akismetEnabled" disabled="true"/> Enable Akismet
                     <p class="help-block">Akismet temporarly disabled till we solve some blockers. Keep track over <a target="_blank" href="https://community.nodebb.org/topic/150/nodebb-anti-spam">here</a></p>
                   </label>
                 </div>
				<div class="form-group">
					<label for="akismetApiKey">Akismet API Key</label>
					<input placeholder="Akismet API Key here" type="text" class="form-control" id="akismetApiKey" name="akismetApiKey" />
				    <p class="help-block">To check every user post. Get yours from <a target="_blank" href="http://akismet.com/">akismet.com</a></p>
				</div>

				<div class="checkbox">
                   <label>
                     <input data-toggle-target="#honeypotApiKey" type="checkbox" id="honeypotEnabled" name="honeypotEnabled"/> Enable Honeypot
                   </label>
                 </div>
				<div class="form-group">
					<label for="honeypotApiKey">Honeypot API Key</label>
					<input placeholder="Honeypot API Key here" type="text" class="form-control" id="honeypotApiKey" name="honeypotApiKey" />
				    <p class="help-block">To check every user registration. Get yours from <a target="_blank" href="http://www.projecthoneypot.org/">projecthoneypot.org</a></p>
				</div>
			</div>
		</div>

		<button class="btn btn-lg btn-primary" id="save" type="button">Save</button>

	    <p class="help-block">
	        This plugin uses <a target="_blank" href="https://github.com/julianlam/project-honeypot">project-honeypot</a>
	        and <a target="_blank" href="https://github.com/oozcitak/akismet-js">akismet-js</a>.

	        <br />
	        File issues, pull requests or ideas at the <a target="_blank" href="https://github.com/akhoury/nodebb-plugin-spam-be-gone">github repo</a>
	    </p>
	</fieldset>
</form>


<script type="text/javascript">
	require(['settings'], function(Settings) {
		var nbbId = '{nbbId}',
		    klass = nbbId + '-settings',
		    wrapper = $('.' + klass);

        wrapper.find('input[type="checkbox"]').on('change', function(e) {
            var target = $(e.target),
                input = wrapper.find(target.attr('data-toggle-target'));
            if (target.is(':checked')) {
                input.prop('disabled', false);
            } else {
                input.prop('disabled', true);
            }
        });

		Settings.load(nbbId, wrapper, function() {
            wrapper.find('input[type="checkbox"]').trigger('change');
		});

		wrapper.find('#save').on('click', function(e) {
			e.preventDefault();
			wrapper.find('.form-group').removeClass('has-error');

			var invalidSelector = '', invalidCount = 0;
			wrapper.find('input[type="checkbox"]').each(function(i, checkbox) {
			    checkbox = $(checkbox);
			    if (checkbox.is(':checked') && !wrapper.find(checkbox.attr('data-toggle-target')).val()) {
			        invalidSelector += (!invalidCount++ ? '' : ', ') + checkbox.attr('data-toggle-target');
			    }
			});

			if (invalidSelector) {
			    wrapper.find(invalidSelector).each(function(i, el) { el = $(el); el.parents('.form-group').addClass('has-error'); });
			} else {
                Settings.save(nbbId, wrapper, function() {
                    socket.emit('admin.restart');
                });
			}
		});


	});
</script>
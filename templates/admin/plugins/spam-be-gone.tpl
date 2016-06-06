<h1><i class="fa {faIcon}"></i> {name}</h1>

<style>
  .{nbbId}-settings .checkbox>label {
      font-size: 24px;
  }
  .{nbbId}-settings .checkbox>label>input[data-toggle-target] {
      margin-bottom: 0;
  }
</style>
<form role="form" class="{nbbId}-settings">
	<fieldset>
		<div class="row">
			<div class="col-sm-12">
				<div class="checkbox">
					<label>
						<input data-toggle-target="#akismetApiKey,#akismetMinReputationHam,#akismetFlagReporting" type="checkbox" id="akismetEnabled" name="akismetEnabled"/>
						Enable Akismet
					</label>
				</div>
				<p class="help-block">To check every user post. Get yours from
					<a target="_blank" href="http://akismet.com/">akismet.com</a></p>

				<div class="form-group">
					<label for="akismetApiKey">Akismet API Key</label>
					<input placeholder="Akismet API Key here" type="text" class="form-control" id="akismetApiKey" name="akismetApiKey"/>
				</div>
				<div class="form-group">
					<label for="akismetMinReputationHam">HAM Minimum Reputation</label>
					<input placeholder="10" type="number" class="form-control" id="akismetMinReputationHam" name="akismetMinReputationHam"/>
				</div>
				<p class="help-block">Minimum reputation level to classify flagged posts as false positives (HAM). Posts made by users with at least this level reputation will never be flagged as spam.</p>

				<div class="form-group">
					<label for="akismetFlagReporting">Flagging Minimum Reputation</label>
					<input placeholder="5" type="text" class="form-control" id="akismetFlagReporting" name="akismetFlagReporting"/>
				</div>
				<p class="help-block">Allow users with minimum reputation of X to submit posts to Akismet as spam via flagging (leave blank to disable)</p>

				<hr />

				<div class="checkbox">
					<label>
						<input data-toggle-target="#honeypotApiKey" type="checkbox" id="honeypotEnabled" name="honeypotEnabled"/> Enable Honeypot
					</label>
				</div>
				<p class="help-block">To check every user registration. Get yours from
					<a target="_blank" href="http://www.projecthoneypot.org/">projecthoneypot.org</a></p>
				<div class="form-group">
					<label for="honeypotApiKey">Honeypot API Key</label>
					<input placeholder="Honeypot API Key here" type="text" class="form-control" id="honeypotApiKey" name="honeypotApiKey"/>
				</div>

				<hr />

				<div class="checkbox">
					<label>
						<input data-toggle-target="#recaptchaPublicKey,#recaptchaPrivateKey" type="checkbox" id="recaptchaEnabled" name="recaptchaEnabled"/> Enable Re-Captcha
					</label>
				</div>
				<p class="help-block">To check every user registration. You need a private and a public key, get yours from
					<a target="_blank" href="http://www.google.com/recaptcha">google.com/recaptcha</a></p>
				<div class="form-inline">
					<div class="form-group" style="width:45%;">
						<label for="recaptchaPublicKey">Re-Captcha Public API Key</label>
						<input placeholder="Public API Key here" type="text" class="recaptchaKey form-control" id="recaptchaPublicKey" name="recaptchaPublicKey"/>
					</div>
					<div class="form-group" style="width:45%;">
						<label for="recaptchaPrivateKey">Re-Captcha Private API Key</label>
						<input placeholder="Private (Secret) API Key here" type="text" class="recaptchaKey form-control" id="recaptchaPrivateKey" name="recaptchaPrivateKey"/>
					</div>
				</div>
				<p class="help-block">Keep your private key private</p>

			</div>
		</div>
		<hr/>
		<button class="btn btn-lg btn-primary" id="save" type="button">Save</button>

		<p class="help-block">
			This plugin uses
			<a target="_blank" href="https://github.com/julianlam/project-honeypot">project-honeypot</a>,
			<a target="_blank" href="https://github.com/oozcitak/akismet-js">akismet-js</a>,
			and <a target="_blank" href="https://github.com/zeMirco/simple-recaptcha">simple-recaptcha</a>

			<br/>
			File issues, pull requests or ideas at the
			<a target="_blank" href="https://github.com/akhoury/nodebb-plugin-spam-be-gone">github repo</a>
		</p>
	</fieldset>
</form>


<script type="text/javascript">
	require( [ 'settings' ], function( Settings ) {
		var nbbId = '{nbbId}',
			klass = nbbId + '-settings',
			wrapper = $( '.' + klass );

		wrapper.find( 'input[type="checkbox"]' ).on( 'change', function( e ) {
			var target = $( e.target ),
				input = wrapper.find( target.attr( 'data-toggle-target' ) );
			if ( target.is( ':checked' ) ) {
				input.prop( 'disabled', false );
			} else {
				input.prop( 'disabled', true );
			}
		} );

		Settings.load( nbbId, wrapper, function() {
			wrapper.find( 'input[type="checkbox"]' ).trigger( 'change' );
		} );

		wrapper.find( '#save' ).on( 'click', function( e ) {
			e.preventDefault();
			wrapper.find( '.form-group' ).removeClass( 'has-error' );

			var invalidSelector = '', invalidCount = 0;
			wrapper.find( 'input[type="checkbox"]' ).each( function( i, checkbox ) {
				checkbox = $( checkbox );
				if ( checkbox.is( ':checked' ) && ! wrapper.find( checkbox.attr( 'data-toggle-target' ) ).val() ) {
					invalidSelector += (! invalidCount ++ ? '' : ', ') + checkbox.attr( 'data-toggle-target' );
				}
			} );

			if ( invalidSelector ) {
				wrapper.find( invalidSelector ).each( function( i, el ) {
					el = $( el );
					el.parents( '.form-group' ).addClass( 'has-error' );
				} );
			} else {
				Settings.save( nbbId, wrapper, function() {
					socket.emit( 'admin.restart' );
				} );
			}
		} );


	} );
</script>

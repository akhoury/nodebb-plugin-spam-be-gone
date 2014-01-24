<style>
	div.note {
		font-size: 10px;
		color: gray;
	}
	.form {
		margin-top: 20px;
	}
	.form input[type="checkbox"].form-control {
		width: 20px;
		display: inline-block;
	}
	.inline-block {
		display: inline-block;
	}
</style>
<h1>Spam Be Gone</h1>

<hr />

<form class="form">
	<div class="form-group">
		<label for="enableStopForumSpam">
			<p>Enable Spam Check on Registration</p>
			<input class="form-control" type="checkbox" data-field="nodebb-plugin-spam-be-gone:options:enableStopForumSpam" id="enableStopForumSpam" />
			<div class="note inline-block">
				Enable <a href="http://stopforumspam.com/">stopForumSpam.com</a>'s which will check the user on registration
			</div>
		</label>
	</div>

	<div class="form-group">
		<label for="akismetApiKey">
			<p>Your Akismet API key </p>
			<input class="form-control" type="text" placeholder="MailChimp API Key" data-field="nodebb-plugin-spam-be-gone:options:akismetApiKey" id="akismetApiKey" disabled="disabled"/>
			<div class="note ">Visit <a target="_blank" href="http://akismet.com/">akismet.com</a>, sign-up and get an API Key</div>
		</label>
	</div>

	<div class="form-group">
		<label for="logging">
			<p>Enable Logging</p>
			<input class="form-control" type="checkbox" data-field="nodebb-plugin-spam-be-gone:options:logging" id="logging" />
			<div class="note inline-block">logs will be saved in <i>[NodeBB_PATH]/node_modules/nodebb-plugin-spam-be-gone/nodebb-plugin-spam-be-gone.log</div>
		</label>
	</div>

    <hr />
	<button class="btn btn-lg btn-primary" id="save">Save</button>
</form>

<script type="text/javascript">
	require(['forum/admin/settings'], function(Settings) {
		Settings.prepare();
	});
</script>
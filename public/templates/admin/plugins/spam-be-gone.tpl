<style>
    .{nbbId}-settings .checkbox>label.section-title {
        font-size: 24px;
    }
    .{nbbId}-settings .checkbox>label>input[data-toggle-target] {
        margin-bottom: 0;
    }
    .nav-tabs {
        margin-bottom: 2rem;
    }
</style>
<div class="row">
    <div class="col-sm-9">
        <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active"><a href="#akismet" aria-controls="akismet" role="tab" data-toggle="tab">Akismet</a></li>
            <li role="presentation" class=""><a href="#honeypot" aria-controls="honeypot" role="tab" data-toggle="tab">Project Honeypot</a></li>
            <li role="presentation" class=""><a href="#recaptcha" aria-controls="recaptcha" role="tab" data-toggle="tab">Google reCAPTCHA</a></li>
            <li role="presentation" class=""><a href="#sfs" aria-controls="sfs" role="tab" data-toggle="tab">StopForumSpam</a></li>
            <li role="presentation" class=""><a href="#hCaptcha" aria-controls="hCaptcha" role="tab" data-toggle="tab">hCaptcha</a></li>
        </ul>

        <form role="form" class="{nbbId}-settings">
            <fieldset>
                <div class="tab-content">
                <div role="tabpanel" class="tab-pane active" id="akismet">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="checkbox">
                            <label class="section-title">
                            <input data-toggle-target="#akismetApiKey,#akismetMinReputationHam,#akismetFlagReporting" type="checkbox" id="akismetEnabled" name="akismetEnabled"/>
                            Enable Akismet
                            </label>
                            </div>
                            <p class="help-block">To check every user post. Get yours from
                            <a target="_blank" href="http://akismet.com/">akismet.com</a>
                            </p>
                            {{{ if akismet.checks }}}
                            <p>Akismet checked <strong>{akismet.checks}</strong> posts and caught <strong>{akismet.spam}</strong> spam posts.</p>
                            {{{ end }}}
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
                        </div>
                    </div>
                </div>
                <div role="tabpanel" class="tab-pane" id="honeypot">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="checkbox">
                            <label class="section-title">
                            <input data-toggle-target="#honeypotApiKey" type="checkbox" id="honeypotEnabled" name="honeypotEnabled"/> Enable Honeypot
                            </label>
                            </div>
                            <p class="help-block">To check every user registration. Get yours from
                            <a target="_blank" href="http://www.projecthoneypot.org/">projecthoneypot.org</a>
                            </p>
                            <div class="form-group">
                            <label for="honeypotApiKey">Honeypot API Key</label>
                            <input placeholder="Honeypot API Key here" type="text" class="form-control" id="honeypotApiKey" name="honeypotApiKey"/>
                            </div>
                        </div>
                    </div>
                </div>
                <div role="tabpanel" class="tab-pane" id="recaptcha">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="checkbox">
                            <label class="section-title">
                            <input data-toggle-target="#recaptchaPublicKey,#recaptchaPrivateKey,#loginRecaptchaEnabled" type="checkbox" id="recaptchaEnabled" name="recaptchaEnabled"/> Enable Re-Captcha
                            </label>
                            </div>
                            <p class="help-block">To check every user registration. You need a private and a public key, get yours from
                            <a target="_blank" href="http://www.google.com/recaptcha">google.com/recaptcha</a>
                            </p>
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
                            <p class="help-block">
                            Keep your private key private
                            </p>
                            <div class="checkbox">
                            <label>
                            <input type="checkbox" id="loginRecaptchaEnabled" name="loginRecaptchaEnabled"/>
                            <small>Enable Re-Captcha on login page as well</small>
                            </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div role="tabpanel" class="tab-pane" id="sfs">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="checkbox">
                            <label class="section-title">
                            <input data-toggle-target="#stopforumspamApiKey" type="checkbox" id="stopforumspamEnabled" name="stopforumspamEnabled"/> Enable StopForumSpam
                            </label>
                            </div>
                            <p class="help-block">
                            To report a user you need an API key, get yours from <a target="_blank" href="https://www.stopforumspam.com/keys">stopforumspam.com/keys</a>
                            </p>
                            <div class="form-group" style="width:45%;">
                            <label for="stopforumspamApiKey">StopForumSpam API Key</label>
                            <input placeholder="API key here" type="text" class="stopforumspamApiKey form-control" id="stopforumspamApiKey" name="stopforumspamApiKey"/>
                            </div>
                        </div>
                    </div>
                </div>
                <div role="tabpanel" class="tab-pane" id="hCaptcha">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="checkbox">
                                <label class="section-title">
                                  <input data-toggle-target="#hCaptchaSiteKey" type="checkbox" id="hCaptchaEnabled" name="hCaptchaEnabled"/> Enable hCaptcha
                                </label>
                            </div>
                            <p class="help-block">To check every user registration. You need a private and a public key, get yours from <a target="_blank">https://dashboard.hcaptcha.com</a></p>
                            <form class="form-inline">
                                <div class="form-group">
                                    <label for="hCaptchaSiteKey">hCaptcha Site Key</label>
                                    <input type="text" class="form-control" id="hCaptchaSiteKey" name="hCaptchaSiteKey" />
                                </div>
                                <div class="form-group">
                                    <label for="hCaptchaSecretKey">hCaptcha Secret Key</label>
                                    <input type="text" class="form-control" id="hCaptchaSecretKey" name="hCaptchaSecretKey" />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                </div>
            </fieldset>
        </form>
    </div>
    <div class="col-sm-3">
        <div class="alert alert-info">
            This plugin uses
            <a target="_blank" href="https://github.com/julianlam/project-honeypot">project-honeypot</a>,
            <a target="_blank" href="https://github.com/deltreey/stopforumspam">stopforumspam</a>,
            <a target="_blank" href="https://github.com/oozcitak/akismet-js">akismet-js</a>,
            <a target="_blank" href="https://github.com/zeMirco/simple-recaptcha">simple-recaptcha</a>, and
            <a target="_blank" href="https://github.com/vastus/node-hcaptcha#readme">hcaptcha</a>,
            <br/>
            File issues, pull requests or ideas at the
            <a target="_blank" href="https://github.com/akhoury/nodebb-plugin-spam-be-gone">github repo</a>
        </div>
    </div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
    <i class="material-icons">save</i>
</button>
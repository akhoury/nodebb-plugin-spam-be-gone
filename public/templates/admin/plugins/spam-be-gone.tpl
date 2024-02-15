
<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

    <div>
        <div class="alert alert-info mb-0 text-xs">
            <p>
                [[spam-be-gone:admin-topic-start]]
                <a target="_blank" href="https://github.com/oozcitak/akismet-js">akismet-js</a>,
                <a target="_blank" href="https://github.com/julianlam/project-honeypot">project-honeypot</a>,
                <a target="_blank" href="http://www.google.com/recaptcha">Google reCAPTCHA</a>,
                <a target="_blank" href="https://github.com/deltreey/stopforumspam">stopforumspam</a>,
                <a target="_blank" href="https://github.com/vastus/node-hcaptcha#readme">hcaptcha</a>
            </p>
            <p class="mb-0">
                [[spam-be-gone:admin-topic-end]]
                <a target="_blank" href="https://github.com/akhoury/nodebb-plugin-spam-be-gone">spam-be-gone</a>
            </p>
        </div>
    </div>

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
            <ul class="nav nav-tabs mb-3" role="tablist">
                <li role="presentation" class="nav-item"><a class="nav-link active" href="#akismet" aria-controls="akismet" role="tab" data-bs-toggle="tab">Akismet</a></li>
                <li role="presentation" class="nav-item"><a class="nav-link" href="#honeypot" aria-controls="honeypot" role="tab" data-bs-toggle="tab">Project Honeypot</a></li>
                <li role="presentation" class="nav-item"><a class="nav-link" href="#recaptcha" aria-controls="recaptcha" role="tab" data-bs-toggle="tab">Google reCAPTCHA</a></li>
                <li role="presentation" class="nav-item"><a class="nav-link" href="#sfs" aria-controls="sfs" role="tab" data-bs-toggle="tab">StopForumSpam</a></li>
                <li role="presentation" class="nav-item"><a class="nav-link" href="#hCaptcha" aria-controls="hCaptcha" role="tab" data-bs-toggle="tab">hCaptcha</a></li>
            </ul>

            <form role="form" class="{nbbId}-settings">
                <fieldset>
                    <div class="tab-content">
                    <div role="tabpanel" class="tab-pane fade show active" id="akismet">
                        <div class="row">
                            <div class="col-sm-12">
                                <div class="form-check">
                                    <input class="form-check-input" data-toggle-target="#akismetApiKey,#akismetMinReputationHam,#akismetFlagReporting" type="checkbox" id="akismetEnabled" name="akismetEnabled"/>
                                    <label class="section-title form-check-label">[[spam-be-gone:enable]] Akismet</label>
                                </div>
                                <p class="form-text">
                                    [[spam-be-gone:akismet-topic-1]] <a target="_blank" href="http://akismet.com/">akismet.com</a>
                                </p>
                                {{{ if akismet.checks }}}
                                <p>Akismet checked <strong>{akismet.checks}</strong> posts and caught <strong>{akismet.spam}</strong> spam posts.</p>
                                {{{ end }}}
                                <div class="mb-3">
                                    <label class="form-label" for="akismetApiKey">Akismet API Key</label>
                                    <input placeholder="Akismet API Key here" type="text" class="form-control" id="akismetApiKey" name="akismetApiKey"/>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label" for="akismetMinReputationHam">HAM Minimum Reputation</label>
                                    <input placeholder="10" type="number" class="form-control" id="akismetMinReputationHam" name="akismetMinReputationHam"/>
                                </div>
                                <p class="form-text">[[spam-be-gone:akismet-topic-2]]</p>
                                <div class="mb-3">
                                    <label class="form-label" for="akismetFlagReporting">Flagging Minimum Reputation</label>
                                    <input placeholder="5" type="text" class="form-control" id="akismetFlagReporting" name="akismetFlagReporting"/>
                                </div>
                                <p class="form-text">[[spam-be-gone:akismet-topic-3]]</p>
                            </div>
                        </div>
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="honeypot">
                        <div class="row">
                            <div class="col-sm-12">
                                <div class="form-check">
                                    <input class="form-check-input" data-toggle-target="#honeypotApiKey" type="checkbox" id="honeypotEnabled" name="honeypotEnabled"/>
                                    <label class="form-check-label">[[spam-be-gone:enable]] Honeypot</label>
                                </div>
                                <p class="form-text">
                                    [[spam-be-gone:honeypot-topic-1]]<a target="_blank" href="http://www.projecthoneypot.org/">projecthoneypot.org</a>
                                </p>
                                <div class="mb-3">
                                    <label class="form-label" for="honeypotApiKey">Honeypot API Key</label>
                                    <input placeholder="Honeypot API Key here" type="text" class="form-control" id="honeypotApiKey" name="honeypotApiKey"/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="recaptcha">
                        <div class="row">
                            <div class="col-sm-12">
                                <div class="form-check">
                                    <input class="form-check-input" data-toggle-target="#recaptchaPublicKey,#recaptchaPrivateKey,#loginRecaptchaEnabled" type="checkbox" id="recaptchaEnabled" name="recaptchaEnabled"/>
                                    <label class="form-check-label">[[spam-be-gone:enable]] Re-Captcha</label>
                                </div>
                                <p class="form-text">
                                    [[spam-be-gone:recaptcha-topic-1]]<a target="_blank" href="http://www.google.com/recaptcha">google.com/recaptcha</a>
                                </p>

                                <div class="mb-3" style="width:45%;">
                                    <label for="recaptchaPublicKey">Re-Captcha Public API Key</label>
                                    <input placeholder="Public API Key here" type="text" class="recaptchaKey form-control" id="recaptchaPublicKey" name="recaptchaPublicKey"/>
                                </div>
                                <div class="mb-3" style="width:45%;">
                                    <label for="recaptchaPrivateKey">Re-Captcha Private API Key</label>
                                    <input placeholder="Private (Secret) API Key here" type="text" class="recaptchaKey form-control" id="recaptchaPrivateKey" name="recaptchaPrivateKey"/>
                                </div>

                                <p class="form-text">
                                [[spam-be-gone:recaptcha-topic-2]]
                                </p>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="loginRecaptchaEnabled" name="loginRecaptchaEnabled"/>
                                    <label class="form-check-label">[[spam-be-gone:enable-recaptcha-login]]</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="sfs">
                        <div class="row">
                            <div class="col-sm-12">
                                <div class="form-check">
                                    <input class="form-check-input" data-toggle-target="#stopforumspamApiKey" type="checkbox" id="stopforumspamEnabled" name="stopforumspamEnabled"/>
                                    <label class="form-check-label">Enable StopForumSpam</label>
                                </div>
                                <p class="form-text">
                                    [[spam-be-gone:stopforumspam-topic-1]]<a target="_blank" href="https://www.stopforumspam.com/keys">stopforumspam.com/keys</a>
                                </p>
                                <div class="mb-3" style="width:45%;">
                                    <label class="form-label" for="stopforumspamApiKey">StopForumSpam API Key</label>
                                    <input placeholder="API key here" type="text" class="stopforumspamApiKey form-control" id="stopforumspamApiKey" name="stopforumspamApiKey"/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="hCaptcha">
                        <div class="row">
                            <div class="col-sm-12">
                                <div class="form-check">
                                    <input class="form-check-input" data-toggle-target="#hCaptchaSiteKey,#hCaptchaSecretKey" type="checkbox" id="hCaptchaEnabled" name="hCaptchaEnabled"/>
                                    <label class="form-check-label">[[spam-be-gone:enable]] hCaptcha</label>
                                </div>
                                <p class="form-text">
                                    [[spam-be-gone:hcaptcha-topic-1]]<a target="_blank" href="https://dashboard.hcaptcha.com">https://dashboard.hcaptcha.com</a>
                                </p>
                                <div class="mb-3">
                                    <label class="form-label" for="hCaptchaSiteKey">hCaptcha Site Key</label>
                                    <input type="text" class="form-control" id="hCaptchaSiteKey" name="hCaptchaSiteKey" />
                                </div>
                                <div class="mb-3">
                                    <label class="form-label" for="hCaptchaSecretKey">hCaptcha Secret Key</label>
                                    <input type="text" class="form-control" id="hCaptchaSecretKey" name="hCaptchaSecretKey" />
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="loginhCaptchaEnabled" name="loginhCaptchaEnabled"/>
                                    <label class="form-check-label">[[spam-be-gone:enable-hcaptcha-login]]</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </fieldset>
            </form>
		</div>
	</div>
</div>


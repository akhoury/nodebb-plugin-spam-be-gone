nodebb-plugin-spam-be-gone
==========================

## From 0.3.x to 0.4.x

Spam Be Gone 0.4.x uses [Google's "No CAPTCHA reCAPTCHA"](http://googleonlinesecurity.blogspot.com/2014/12/are-you-robot-introducing-no-captcha.html?m=1) which does not support the old public/private keys, so you need to generate new ones and replace the old ones in your NodeBB Admin Panel, or you will see an error instead of the captcha image, visit this page to do so: https://www.google.com/recaptcha/admin#list
```
ERROR: Global site keys are not supported
```
## Screenshots

### Settings page
![screen shot 2015-11-19 at 2 46 08 pm](https://cloud.githubusercontent.com/assets/1398375/11282248/4c5c7464-8ecc-11e5-9542-ab756a3fe5c2.png)

### Registration page
![Imgur](http://i.imgur.com/5nTBtMa.png)

### Flag a post for moderation
and it will be also reported to Akismet (if enabled)
![Github with love](https://cloud.githubusercontent.com/assets/1398375/11282166/e8c8edc4-8ecb-11e5-8925-9f09572d2371.png)
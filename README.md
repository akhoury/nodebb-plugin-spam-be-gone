nodebb-plugin-spam-be-gone
==========================

## From 0.3.x to 0.4.x

Spam Be Gone 0.4.x uses [Google's "No CAPTCHA reCAPTCHA"](http://googleonlinesecurity.blogspot.com/2014/12/are-you-robot-introducing-no-captcha.html?m=1) which does not support the old public/private keys, so you need to generate new ones and replace the old ones in your NodeBB Admin Panel, or you will see an error instead of the captcha image, visit this page to do so: https://www.google.com/recaptcha/admin#list
```
ERROR: Global site keys are not supported
```
## Screenshots

![Imgur](http://i.imgur.com/GRkH2c9.png)
![Imgur](http://i.imgur.com/5nTBtMa.png)

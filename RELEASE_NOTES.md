# 2.10.0

* The template documentation is now taken from `GUIDE.md` if there is
  such a file, and only from `README.md` as a fallback if `GUIDE.md`
  does not exist.
* Settings can now be displayed conditionally on the values of other settings.
  See the “Conditional settings” section of the documentation.

# 2.9.1

* Fix botched release (with many missing files) that was caused by
  a bug in npm: See https://github.com/npm/npm/issues/18461

# 2.9.0

* New settings layout options:
  * width: half
  * width: quarter
  * new_section: true
  * style: buttons

  See https://flourish.rocks/developers/reference/template-files.html#settings

* Add support for optional column bindings.
* Add --listen option for `flourish run` to listen on a non-localhost interface.
* Add support for `image_download: false`
* Upgrade d3-dsv to 1.0.7. #17
* Match data table names case-sensitively, even on case-insensitive filesystems. #25
* Warn if there is no autoheight configuration.
* Upgrade skeleton project to rollup 0.50.0

# 2.8.0

* Add missing font files. #21
* Add support for optional number settings. If “optional: true” is specified, 
  and no value is supplied for the setting, then a null value will be passed to 
  the template rather than zero.
* Fix “Uncaught TypeError: Cannot read property 'fireEvent' of undefined” #22

# 2.7.0

* New metadata property in template.yml “autoheight” to specify how the width of
  the embed should depend on the height when an auto-height embed is used.
* String settings can now have a “choices” property which restricts the values
  users can enter, and displays the setting as a dropdown list rather than a
  free-text field. If the optional “choices_other” property is also true, the
  user may type free text in addition to selecting from the listed choices.
  The choices property should be an array of strings or pairs of strings: if
  a pair of strings is given, the first element is displayed to the user on the
  dropdown menu and the second is used as the value of the setting.
* New data binding description metadata property in template.yml: in the data
  section, if a second string is supplied immediately following the binding
  name, it will be treated as the binding decription, and displayed to the
  user in the data bindings panel.
* Run “npm install” rather than “npm update” to install modules. (Newer versions
  of NPM will update package.json and package-lock.json when “npm update” is used.)

# 2.6.0

* Bundle fonts locally, so the SDK doesn’t need an internet connection.
* Work around a browser-dependent issue where mousewheel scrolling sometimes
  did not work after the viewport had been resized. #14
* Fix file watching when the template directory is not the current directory. #15

# 2.5.5

* More efficient generation of HTML: significantly faster reloads for
  large data tables. #11
* Avoid reloading many times in parallel when switching branches in git. #12

# 2.5.4

* Don’t show the “pointer” icon on the rotate button when it’s disabled.

# 2.5.3

* Specify in package.json that it only works with Node 6 and later.

# 2.5.2

* Remove another popup that slipped through the net in 2.5.1.

# 2.5.1

* Fix resizing on IE11 and Edge.
* Remove popups that don’t display properly.

# 2.5.0

* New preview interface, matching the new visualisation editor
  on flourish.studio

# 2.4.1

* Fix bug affecting error reporting for invalid data bindings
* Ignore repeated and trailing slashes in build rule directory paths
* Handle CSV files that have a UTF-8 BOM, as saved by Excel

# 2.4.0

* Add “flourish --version”, to print the SDK version number.

# 2.3.1

* Update top-level “flourish help”.
* Refer to the help command if you just type “flourish”.
* Do not include meta tags in SDK HTML.
* Remove full path to lessc script in the skeleton package.json, because it
  was not working on Windows.

# 2.3.0

* Add command-line help with “flourish help”.
* “flourish delete” now takes a template id, not a template directory.

# 2.2.0

* Cross-platform compatibility improvements: it should now work correctly on
	Windows, Mac and Linux.
* Run “`npm update`” on build if `package.json` exists but `node_modules` does not
* Better error reporting if “`flourish upgrade`” is run and neither `template.yml`
  nor `settings.js` exist.
* “flourish whoami” prints your username, rather than your email address
* Remove top menu; "Preview" mode now available as "Standalone" via the view menu
* Legal nonsense:
	* Add license
	* Agree to Terms and Conditions when you register
* An unfortunate consequence of the previous point is that older versions of
	the SDK are no longer allowed to communicate with the server, and users are
	prompted to upgrade
* Use Handlebars rather than Mustache internally
* Dogfood note: our internal templates may specify `flourish/identifier` in their
	`id` field, so when we publish them they’re linked to the `flourish` user.
	This only works if you’re logged in as an admin user.

# 2.1.0

* Add an option (`--as`) that only works for admin users.
* Serve source maps (`template.js.map`) for easier debugging of templates.
* Correct documentation for data bindings. Issue a better error message
  for data bindings that don’t have suitable `column` or `columns` specifications.
  Thanks to Tim Brock.
* Add release notes!
* Fix the “Editor” link in the SDK header.
* Mention “flourish register” in the quickstart notes.

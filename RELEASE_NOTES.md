# 3.11.5

* Print date and time when publishing a template.

# 3.11.4

* The “flourish register” command used to fail at the point of asking you to enter a password if you are using Node 10. This version fixes that problem.

# 3.11.3

* Add support for `svg_download`, which you should now set to `false` for templates where SVG download wouldn't produce useful results (for example if the only SVG in the template is a legend, not the main chart)

# 3.11.2

* Do not allow template settings to be conditional on themselves.

# 3.11.1

* Fix bug that broke show_if/hide_if settings rules.

# 3.11.0

* Update all node modules to their current versions. This also means that templates created with “flourish new” will be configured to use the current version of rollup.
* New design for settings panel (matching flourish.studio). Checkboxes are now iOS-style toggle switches, and editing the color palette opens the palette editor in a separate overlay.

# 3.10.3

* Update the documentation for the `colors` setting type.

# 3.10.2

* One of the dependency packages used by the SDK fails to compile with versions of node earlier than 8.3. Update the "engines" specification in package.json to specify that we require node 8.3 or later.

# 3.10.1

* Template name and author were being inserted into the page unescaped, which would cause problems if either contains characters such as `<` that have a special meaning in HTML. This is now fixed.

# 3.10.0

* Log a warning to the console if the draw() or update() functions are declared to have parameters. #19
* Support the `--as` flag consistently across commands. (This change only affects internal users at Flourish HQ.)

# 3.9.2

* The “flourish login” command was failing at the password prompt, with Node 10. Change the way we read the password, so it works. #56

# 3.9.1

* Allow "type: hidden" properties under settings in template.yml, for documenting state that isn't an exposed setting. This is intend to help document the template for programmatic use via the upcoming API.
* Document the suggestion that such state documentation is under a "State documentation" settings block.

# 3.9.0

* Add the “flourish history” command to the output of “flourish help”.
* Add the optional template id parameter for “flourish list” to the output of “flourish help”.
* Raise an error if “flourish history” is called with no argument.
* Set the NODE_ENV environment variable to "production" or "development" depending on whether the build was triggered by `flourish publish` or `flourish run`.
* New command `flourish assign-version-number`, which must be used to assign a version number to an already-published template before it can be republished.

# 3.8.0

* Add a new undocumented “flourish publish” option `--local-testing`, which is only useful if you are running your own instance of the Flourish server.

# 3.7.1

* Skeleton project: suppress “circular dependency” warnings in the rollup configuration.

# 3.7.0

* Introduces new "font" setting type.
* Allow headings in imported setting blocks
* Take metadata from package.json, if present. #35
  Specifically:
  * Use the author, description and version fields from package.json if the
    corresponding field is missing from template.yml.
  * Use the name from package.json as the template id, if the template.yml has no id.
* Respect the version number (as per semver.org): if the major version number is not incremented, assume the new version is backwards-compatible and upgrade existing visualisations. If the major version number is incremented, leave existing visualisations connected to the previous version.
* Add --patch, --prerelease and --release options to “flourish publish”.
* Make it possible to pass a template id as a parameter to “flourish list”, to list the available versions of a particular template.
* Add a version parameter to “flourish delete”.
* Add a “flourish history” command, to show the versions of a template that are available for use in the Live API.

# 3.6.0

* Fix a bug that meant conditional settings could not refer to a setting whose name begins with "data". #45
* `flourish list` now recognises the `--full` option.
* `flourish delete` now has a `--force` option that makes it possible to delete a template even if there are associated visualisations, provided they were created by the same user who created the template.

# 3.5.0

* `flourish new` now generates skeleton code for SDK version 3
* What was called `api_token` is now called `sdk_token`. This is a purely internal change, which should not affect developers using the SDK to develop Flourish templates. (Developers running their own instances of the Flourish app will need to ensure they have an up-to-date version of Flourish. On the other hand, older versions of the SDK are compatible with the newer Flourish app.)

# 3.4.0

* Modules imported using the “import” syntax are now resolved using
  Node's [`require.resolve` algorithm](https://nodejs.org/api/modules.html#modules_all_together).
* New “override” property for imported settings.

# 3.3.1

* New `joinable_data` property can be specified in template.yml.
  This is currently an undocumented feature intended for internal
  use by Flourish.
* Since 3.3.0, the SDK now only supports Node 8+. This is now specified in `package.json`.

# 3.3.0

* Added new `colors` setting type for palette picking.
* New “import” syntax to import groups of settings from a node module.

# 3.2.0

* After upgrading template.yml, write it back out with { flowLevel: 4 }, which makes the YAML come out more like the way we write it in the documentation. In practice this only affects choices for settings in key-value format, since that is the only place currently where the structure is nested four levels deep.

# 3.1.0

* Minor fix to the error handling in the template upgrade code.
* Having an `autoheight` property in template.yml is now an error rather than a warning.
* Updated tests.

# 3.0.0

This is a major version change, and a forced upgrade: older versions of the SDK can no longer publish templates to Flourish. The `autoheight` property is no longer supported, and instead iframe height is automatically set using default breakpoints. For templates that need to adjust the iframe height dynamically, there is a new method `Flourish.setHeight()`.

Templates now need to have `sdk_version: 3` in their template.yml. Old templates can be upgraded by running `flourish upgrade`.

# 2.16.1

* Upgrade node modules (mocha → 5.1.1, rollup → 0.58.0)
* Improve error message from “flourish login” in the case where the server returns something unexpected. (This is mainly useful for testing changes to Flourish itself: this should never happen in normal operation.)

# 2.16.0

* Tweak the Flourish logo, and make it link to the live app.
* Change the “prepublish” npm script to “prepare”, to be compatible with future versions of NPM.
* Set the file permissions of the .flourish_sdk file so that only the current user can read it.

# 2.15.2

* Slightly better fix for #40, so that the temporary zip file is still deleted on exit.

# 2.15.1

* Upgrade ws module to 5.1.1.
* Avoid crash after publishing a template. #40

# 2.15.0

* Upgrade all node module dependencies to their current versions. This will also
  affect new user projects created with the “flourish new” command.
* Support the --no-build option for “flourish publish”.
* New setting type “code”.
* New “size: large” option for text and code settings.

# 2.14.0

* Drop support for specifying a username in the `id` of `template.yml` by setting id to `<username>/<template>`. Specifying one now throws an error when publishing a template. (This feature was only used internally for Flourish templates on the @flourish account. This should not affect external users of the SDK.)

# 2.13.0

Major change: the preview pane is now embedded using the same height-adjustment
logic as when a published visualisation is embedded on another site. If the
preview pane is set to a fixed height, then `Flourish.fixed_height` is true
in the template.

Bug fixes:
* Fixes boolean button group bugs
* With a subhead in place, the new_section line didn't get hidden properly
* Only send nulls for empty number settings

# 2.12.1

* Handle strings containing U+2028 or U+2029 characters in data.

# 2.12.0

* New `is_master_slide` property can be specified in template.yml.
  This is currently an undocumented feature intended for internal
  use by Flourish.
* New setting width option “three quarters”.
* Settings display can now be conditional on data bindings being set.
* Boolean settings can specify `choices` in template.yml to display as buttons.
* Add tests for template.yml validation, fix some validation bugs, and make some
  error messages more consistent.

# 2.11.0

* New `credits:` property can be specified in template.yml

# 2.10.1

* Give a sensible error message if conditional settings configuration
  (`show_if:`) blocks are indented incorrectly.
* Correct the formatting of the `show_if` examples in README.md
* Hide section dividers when setting is hidden

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

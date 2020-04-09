# The Flourish SDK

[**Flourish**](https://flourish.studio) is a platform for visualising and storytelling with data. It allows users to quickly create high-quality visualisations, stories, presentations and other interactive content by putting their own data and text into configurable templates.

This SDK allows developers to make templates and upload them to Flourish.

## Quickstart
* [Install the SDK](#using-the-sdk): `npm install -g @flourish/sdk`
* [Create a new template](#create-a-new-template): `flourish new [dir_name]`
* [Run/view a template](#run-and-view-a-template): `flourish run [dir_name]`
* [Register an account](#login-logout-register-check-status): `flourish register`
* [Publish your template](#publish-a-template): `flourish publish [dir_name]`

See [all commands and options](#using-the-sdk). There are also a few [example templates](https://flourish.studio/developers/examples/) you can use for reference.

## Template overview
There is no limit to what a Flourish template can be or do. It may be a simple chart, a 3D visualisation in WebGL, or a richly interactive app with a complex UI. There's also no limit to how you can write your code, what libraries you can use, etc. The only requirement is that the template directory includes [certain files](#template-files), as specified below, and that the `template.js` creates a `window.template` object with the following properties:

* [`state`](#state) The template's current state; updated by Flourish when the user changes a setting or switches slide
* [`draw()`](#draw) Called by Flourish when the template is loaded
* [`update()`](#update) Called by Flourish when the user changes a setting or data table, or switches slide
* [`data`](#data-1) Optional; updated by Flourish with data from any user-editable data tables

## Template files
A Flourish template is a directory containing, at a minimum:
* [`template.yml`](#templateyml) Flourish configuration
* [`template.js`](#templatejs) The template’s JavaScript code, usually generated

Templates often also include:
* [`thumbnail.jpg` or `thumbnail.png`](#thumbnailjpg-or-thumbnailpng) Template image for use on Flourish: strongly recommended, and may become mandatory in the future
* [`index.html`](#indexhtml) The template HTML
* [`src/`](#src) JavaScript source files
* [`data/`](#data) Data tables in CSV format that define the sample data shipped with the template
* [`static/`](#static) Arbitrary static files that can be referenced by the template
* [`GUIDE.md`](#guidemd) Documentation for end users of the template in Flourish, in Markdown format
* [`README.md`](#readmemd) Documentation for developers working on the template, in Markdown format

The following files are not treated specially by Flourish, but many templates include them as part of the way they are packaged and built:
* [`package.json`](#packagejson) NPM package configuration specifying dependencies etc.
* [`rollup.config.js`](#rollupconfigjs) rollup.js configuration

### `template.js`
The template script. Typically generated using a build process, such as rollup.js, from Javascript modules in `src/`, though in principle you could write it directly as long as it creates a `window.template` object that has function properties [`update()`](#update) and [`draw()`](#draw), and object properties [`state`](#state) and optionally [`data`](#data-1).

### `template.yml`
The main Flourish configuration file for your template. The top-level properties are:
* `sdk_version` Which major version of the Flourish SDK the template is compatible with. Currently this should be `3`.
* `id` A unique identifier for your template. If you publish a template and the `id` is already in use by you, the Flourish server will assume you are updating an existing template and overwrite it.
* `name` What the template will be called within Flourish
* `author` Who wrote the template
* `description` A short description of the template
* `credits` Optional credits for data sources, map tiles, etc, in Markdown format
* `image_download` Flag to indicate whether image snapshots work for the template (default is `true`)
* `svg_download` Flag to indicate whether downloading a snapshot of template as SVG will work (default is `true`)

Other properties are [settings](#settings), [data](#data), [build](#build), and [tour](#tour), which are described below.

#### build configuration
The `template.yml` file will usually also include a `build` section defining build rules. For example:

```yaml
build:
  # Defines the build processes used to build your template from source.
  # You can have any number of build processes, and changes to the relevant
  # files will trigger the appropriate build. Here we define build scripts
  # for JavaScript and CSS.

  src:
    script: npm run build
    # You can specify a whole directory, or individual files, or both.
    # A change inside the directory or to any of the listed files will
    # trigger a rebuild and reload.
    directory: src
    files:
      - rollup.config.js

  less:
    script: npm run less
    directory: less
```

It’s also possible to use a custom watch command, instead of relying on Flourish to run your build script when one of the specified files has changed. Specify the watch script using the `watch:` key within the build rule. In this case the build script will not execute when you use `flourish run`, but the watch script will be run instead. You may not specify `files:` or `directory:` if you use `watch:`.

#### settings
The `template.yml` file will usually also include a `settings` section which populates the settings panel in the Flourish visualisation editor (and SDK). Each setting allows the user to change a specific property in the template [`state`](#state). When a setting is changed by the user , `state` is updated and the template's `update()` function is called.

If an entry in the settings array is a string, it is interpreted as a section title. Otherwise it must be an object with the `property` and `type` properties. Other properties are optional, but `name` and `description` are recommended to help the user understand the role of the setting. (As a special case, a section titled "State documentation" will be hidden in the visualisation editor: it's just for grouping documentation of non-settings state properties.)

```yaml
settings:
- Section title # Headings can be used to break up the settings into collapsible sections
- property: my_state_property # Required; must be a property of the state object
  name: Example number setting # Optional; appears next to the setting
  description: A setting for changing a number # Optional; appears on mouseover
  type: number # Required; see available types below
```

To improve the layout of your settings, you can set the `width` of any setting to be `full`, `half`, `three quarters` or `quarter` of the width of the settings panel. You can also add a horizontal separator above a setting using `new_section: true`, or a subheading using `new_section: This is a subheading`.

```yaml
- property: my_number
  name: Neat little number input
  width: quarter # Optional; sets the width of the setting
  new_section: true # Optional; starts a new line with the current setting and adds a line above
```

The following types of settings are supported:

##### `boolean`
Creates a checkbox that sets the state property to `true` or `false`. Alternatively can be displayed as two buttons using the `choices` attribute to specify labels and/or images. For example:

```yaml
- property: ranked
  type: boolean
  choices:
  - [ Ranks, true ]
  - [ Scores, false ]
```

##### `color`
Creates a colour picker that sets the state property to a string containing a hex RGB colour e.g. `"#123456"`.

##### `colors`
Creates a colour palette picker that sets the state property to an array of strings, each containing a colour value, e.g. `"#ff33c0"`. The menu contains the Flourish standard palettes plus any additional ones associated with the user's company. The user can edit the selected palette to add/remove/change colours.

##### `number`
Creates a number input that sets the state property to a number. Optionally add `min` and `max` properties to limit the range, `step` to control the input’s increment buttons. By default number settings always return a number and blanked inputs are set to zero; to allow blanked input, with `null` returned as the value, add `optional: true`. Width defaults to `half`.

##### `string`
By default, creates a single-line text input that sets the state property to the relevant string text. If you add a valid `choices` property, the setting instead creates a dropdown (by default) or button group (if you also add `style: buttons`). The `choices` property must be an array. Each of its element can be a string (in which case this string is returned to the state) or an array containing a display name, the associated string value and (for button groups) a background image.

To add a special dropdown that allows the user to specify any text in addition to choosing from the list, add `choices_other: true`. This is ignored for button groups.

```yaml
- property: size
  name: Size
  type: string
  choices: # An array of values to fill the dropdown
    – small_size # A choice can be a string
    – # Or a choice can be an array of two or three elements …
      – Absolutely enormous # … in which case the first string is the display name,
      – large_size # … the second string is the value passed to the template
      – massive.jpg # … the third is an image file name in your `static` directory
  choices_other: true # allows the user to input any value they like
```

##### `text`
Creates a user-resizeable multiline text input. Defaults to two lines tall. Can be made taller by adding `size: large`, which sets the height to half of the viewport height.

##### `code`
Same as `text` but with a monospace font and text-wrapping control.

##### `font`
Creates a font picker that sets the state property to the URL of a CSS stylesheet that will specify font imports. By default these are Google fonts, with URLs like `https://fonts.googleapis.com/css?family=Montserrat`. The value passed to the template `state` will be an object specifying both the font name and URL, for example: `body_font: { name: "Mali", url: "https://fonts.googleapis.com/css?family=Mali" }`. A template can load the font by inserting a `link` tag into the document, like this:
```javascript
  var font_link = document.createElement("link");
  font_link.setAttribute("rel", "stylesheet");
  document.body.appendChild(font_link);
  // Assuming the setting property is named "body_font"
  font_link.setAttribute("href", state.body_font.url);
```
Then elements can be styled by referencing the font name, whether in attributes or in CSS. If the font is being inherited in CSS, you could just add it to the document body, like this:
```javascript
document.body.style.fontFamily = state.body_font.url;
```

#### `hidden`
This type is for documenting state properties which should not be editable from the settings panel in the visualisation editor. Any property with a `hidden` type will not be editable within the visualisation editor interface.

#### Conditional settings
Sometimes you might want to simplify the user experience for Flourish users by hiding some settings depending on whether they are needed or not. You can use the `show_if` and `hide_if` properties to control whether or not a setting should be displayed based on another setting’s value.

In the following example, the x axis label setting will only be displayed if “Show x axis” is selected:

```yaml
- property: show_x_axis
  name: Show x axis
  type: boolean

- property: x_axis_label
  name: X axis label
  type: string
  show_if:
    show_x_axis: true
```

You can use the following shorthand syntax for booleans. This is equivalent to the previous example:

```yaml
show_if: show_x_axis
```

If you specify an array of conditional values, this setting will be displayed if the referenced setting has _any_ of the specified values. In the following example, the setting is displayed if `color_mode` is set to either `"diverging"` or `"continuous"`:

```yaml
show_if:
  color_mode: [diverging, continuous]
```

You can specify multiple conditions. All of these tests must pass for the setting to be displayed. For example:

```yaml
show_if:
  show_x_axis: true
  color_mode: diverging
```

The `hide_if` option works in exactly the same way, except that the setting is hidden if the conditional test passes.

```yaml
hide_if:
  color_mode: diverging
```

You can also control settings display depending on whether or not particular data bindings have been specified. A binding is specified using the syntax `data.[dataset].[key]`. For example:

```yaml
show_if: data.values.filter1 // shorthand syntax

show_if:
  data.values.filter1: true
```

You cannot specify both `show_if` and `hide_if` options on the same setting.

#### data bindings
The `template.yml` file may also include a `data` section. This section consists of an array of data ‘bindings’ that sets how the template should use and refer to the template’s editable data tables (which are initially populated by the CSV files in [`data/`](#data)). Each binding adds one or more columns of data to a `dataset` under a particular `key`. You can define as many datasets as you like. They are made available to the template as properties of [the `data` object](#data-1). Each one consists of an array containing an object for each row of the relevant data table, as shown in the example below.

Once your template is published, Flourish users can change the data in the Flourish editor, and also change which columns are linked to each binding. But in your code you don’t need to worry about this because you just refer to the `key` rather than referencing the column header or index.

There are two types of data binding: `column` is used when the number of columns is and must always be one; `columns` supports any number of columns, including none. 

A default value must be supplied for each data binding, unless you have specified `optional: true` (only supported for single `column` bindings). The example below shows how this is done.

The following example sets up a dataset with two keys, one single-column and one multi-column.

```yaml
data:
- Locations # Optional; breaks up the bindings into collapsible sections
- Description string # Optional; additional description to explain to the user how the data binding works
- name: Country code # Name shown in UI
  description: Requires ISO 3166-1 alpha-2 codes # Optional description for the UI
  dataset: country_scores # Which dataset this binding is part of
  key: iso_code # The key used to access the data in this binding in the template code
  type: column # This binding can take only one column
  column: By Decade::A  # The default values are drawn from column A of `By Decade.csv`
- name: Values
  dataset: country_scores
  key: values
  type: columns # This binding can take any number of columns
  columns: By Decade::B-D,F # The default values are arrays drawing from columns B-D and F of `By Decade.csv`
- name: Flag image 
  dataset: country_scores
  key: flag_pic
  type: column
  optional: true # Default values can be omitted for an optional binding
```

In this example, if `By Decade.csv` contained the following…

```csv
Country,1970s,1980s,1990s,20th_century_mean,2000s
US,3122,3128,3129,984,3119
GB,1203,1205,1208,1121,1200
FR,1030,1005,1010,3076,1024
```
… then in your template `data.country_scores` would be:

```js
[
	{ iso_code: "US", values: [ "3122", "3128", "3129", "3119" ]},
	{ iso_code: "GB", values: [ "1203", "1205", "1208", "1200" ]},
	{ iso_code: "FR", values: [ "1030", "1005", "1010", "1024" ]}
]
```
The column headers are available in any dataset via the `column_names` property of the data array. E.g. in the above example `data.country_scores.column_names` is:

```js
	{ iso_code: "Country", values: [ "1980s", "1990s", "2000s", "2010s" ]}
```

#### tour
You can optionally include a `tour` block which can be used to guide people through using the template in the Flourish editor.

A tour is an array of steps, each of which will be presented to the user in a popup. Here’s an example:

```yaml
tour:
  - text: This template is ideal for displaying categorical data.
  - text: Adjust these settings to customise the appearance of your visualisation.
    anchor: '.settings'
```
Each step must include a `text` property, which will be displayed in the modal. Additional optional properties are as follows:

* `anchor`: CSS selector for a DOM element in the editor to which the tour popup should be anchored. Use your browser’s web inspector to discover suitable class names or ids.
* `position`: Where the popup should be positioned relative to its anchor. One of `bottom` (the default), `top`, `left` or `right`.
* `button_text`: By default, each step displays with a button reading “Next”. You can specify an alternative label here.
* `trigger`: In some cases, you might need to ensure a particular action has been triggered in the UI before you display the next step. For example, if you want to highlight something in the Data tab, then you need to ensure that the data tab has been selected. You can use the `trigger` property to do this, by supplying a string of the form `[event type] [selector]`, e.g. `click button.data`. If the user triggers this event, the next step will automatically be displayed. If they press the “Next” button first, then the specified event will be dispatched before the next popup is displayed.

#### `thumbnail.jpg` or `thumbnail.png`
A thumbnail image for your template in JPEG or PNG format. No particular size is required – the precise size at which the image is displayed depends on the size of the browser window – but we recommend approximately 600px × 400px.

#### `index.html`
The base HTML for the template, if required.

To reference resources in the [static directory](#static) use relative links, e.g.
```html
<img src="logo.png">
```
These relative links will be replaced by a suitable path when the template is rendered. If you’re creating links to static resources with code, you need to prefix them with the value of `Flourish.static_prefix`. [See below for more about static resources.](#static)

You can add DOM elements, script tags, external stylesheets, etc, to your `index.html`, as with any other html page. Do not reference assets at non-`https` addresses, since these will cause problems when the template is embedded in Flourish or any other secure website.

If the `index.html` file is missing, the following default HTML is used:
```html
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<style>
			html, body { height: 100%; margin: 0; overflow: hidden; }
		</style>
	</head>
	<body>
	</body>
</html>
```
There is no need to include a `<title>` element, because Flourish will insert an appropriate one when it renders the template. If you do include a `<title>` then it will be replaced.

#### `src/`
JavaScript source code. Typically these will be [bundled in a build process](#build-configuration) to create [`template.js`](#templatejs).

In simple templates `src/` may contain just a single `index.js` which will export the three key template properties – [`state`](#state), [`draw()`](#draw), [`update()`](#update) – and, optionally, [`data`](#data-1).

If you modify a source file while the SDK is running, the SDK will run the appropriate build script [specified in `template.yml`](#build-configuration) and then reload the preview.

Source files are not uploaded to the server when you publish a template.

#### `data/`

A directory containing CSV data tables (with header rows) that the user will be able to see and edit in the Flourish visualisation editor's spreadsheet interface. These can be used for sample data that you intend the end user to replace with their own data. They can also be useful for create editable look-up tables for configuration options.

Columns from these CSV files (or the data tables in the Flourish editor) are made available in the template as one or more datasets, as specified in the [data bindings of the `template.yml`](#data-bindings).

(It's also possible to import data into your template manually from your `static` directory or elsewhere, using D3 or any other technique. But the end user won't be able to edit the data or update the column selection if you do that.)

#### `static/`
A directory for any static files used in the template, such as images, fonts, stylesheets or code libraries. To reference the static directory in your [`index.html`](#indexhtml) file, use relative links:
```html
<script src="leaflet/leaflet.js"></script>

```
Or from JavaScript use `Flourish.static_prefix`:

```js
var img_url = Flourish.static_prefix + "/my_image.jpg";
```

#### `GUIDE.md`
A file documenting the template for end Flourish users, in Markdown format. This documentation will be displayed on the template’s page on the Flourish site, when the template is [published](#publish-a-template) and made live.

#### `README.md`
A standard README file for developers, available as part of the source like other files.

### Other files
In general any files not listed above will be ignored by Flourish, and you may use them as part of your template’s build process or for any other purpose. They won’t be uploaded when you publish the template.

The skeleton template you get when you run `flourish new` and the Flourish example templates contain a couple of such files:

#### `package.json`
A standard npm configuration file, listing any dependencies. If you’re not starting with a skeleton template, you can create this file using `npm init`. This file is not treated specially by Flourish, and is only needed if your template is packaged as an npm module.

#### `rollup.config.js`
This is the default filename for a rollup.js configuration file, and specifies how the source code is to be bundled by rollup.js. It might look something like this:
```js
export default {
  entry: "src/index.js",
  format: "iife",
  moduleName: "template",
  dest: "template.js",

  sourceMap: true,
  plugins: [
    require("rollup-plugin-node-resolve"),
    require("rollup-plugin-uglify"),
  ]
};
```
You only need this if you’re using rollup.js to bundle your template.

## Using the SDK
### Installation
Install the SDK with npm, as follows. If you don't already have it you'll need to [install node](https://nodejs.org/en/download/).
```sh
npm install -g @flourish/sdk
```
The `-g` means the package will be installed globally, enabling access to the `flourish` command across your system.

### Create a new template
```sh
flourish new [dir_name]
```
Where `dir_name` is the name of the template directory that will be created. The new directory will be populated with skeleton files and directories that you can edit with your own code and files.

### Build
```sh
flourish build [rules]
```
Build the template in the current directory, using the scripts [specified in `template.yml`](#build-configuration).
if you don’t specify any build rules, it will run all of them. You shouldn’t usually need to use this command explicitly,
because `flourish run` will do a full build before it runs the server, and then monitor your files for changes and
trigger appropriate rebuilds automatically when something changes.

### Run and view a template
```sh
flourish run [dir_name]
```
Builds the template and runs the SDK viewer in your web browser. If `dir_name` is omitted it uses the current directory.

While it’s running it watches the template directory for changes:
* if you edit any static template files (`index.html`, `template.yml`, `data/*`, `static/*`) the SDK will refresh the page in the browser;
* if you edit a file that is the source for a [build rule](#build-configuration), the SDK will run that build rule and then refresh the page.

Options:
* `--open` or `-o` Try to open the SDK in your web browser once the server is running. At present this only works on macOS.
* `--port` Specify a particular port; defaults to [1685](https://en.wikipedia.org/wiki/Johann_Sebastian_Bach)
* `--no-build` Skip the build process

### Publish a template
```sh
flourish publish [dir_name]
```
You'll first need to be logged in. If `dir_name` is omitted it uses the current directory.

### Login, logout, register, check status
New users should `flourish register` and follow the prompts. Existing users can log in and out with `flourish login` and `flourish logout`. To check which account you are currently logged in with, use `flourish whoami`.

### Download a template
To download an existing template, such as one of our examples or an open-source template, simply `git clone` the repo, then change into the new directory and `npm install` then `flourish run`. For example:
```sh
git clone https://github.com/kiln/example-template-circle
cd example-template-circle/
npm install
flourish run
```

### Upgrade from an older version of the SDK
```sh
flourish upgrade [dir_name]
```
Sometimes changes to the Flourish SDK will require templates to be changed to be compatible with the new version. This command will attempt to convert a template made for an earlier version of Flourish to be compatible with the current version.

## Template API
Your compiled JavaScript should assign an object with the following properties to `window.template`:

### `.state`
Records the current state of template. Default values for each of its properties are set where the object is declared in the JavaScript. These are updated by Flourish when the user changes a setting in the visualisation editor, or programmatically, e.g. when the user interacts with the template output.

To make sure your template works nicely in the story editor, ensure that all visual aspects of the template – including the UI – are set from the `state` by the `update()` function. For example, if the user clicks a menu item and you want to highlight that item, do this by updating the `state` and calling `update()`. Do not do it in the click handler for the menu item, as this will only work when the user clicks the button manually, not when the story editor moves from one state to another.

### `.draw()`
Called when the template loads. Typically used for initialisation code such as adding elements to the DOM. In some cases, however, it might do nothing except call update().

In most templates `draw()` will not be called except once by Flourish after the template is loaded, though in some cases you may want to call it manually – for example if you want to delete the DOM and redraw it when the user resizes the window.

### `.update()`
Called whenever the user changes a data table or setting in the visualisation editor, or when changing slides in the story editor. Typically will also be called by the template in response to user interaction.

### `.data`
An object into which Flourish will put the data from user-editable data tables. Usually your code will initialise `data` as an empty object `{}`, and read from it in the `draw()` and `update()` functions.

Each property is a `dataset`: an array containing an object for each row in the relevant data table. The structure of each `dataset` is defined in the [data bindings of the `template.yml`](#data-bindings), and the data is loaded from the tables in the [`data/`](#data) directory.

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
* [`README.md`](#readmemd) Documentation for users of the template, in Markdown format

The following files are not treated specially by Flourish, but many templates include them as part of the way they are packaged and built:
* [`package.json`](#packagejson) NPM package configuration specifying dependencies etc.
* [`rollup.config.js`](#rollupconfigjs) rollup.js configuration

### `template.js`
The template script. Typically generated using a build process, such as rollup.js, from Javascript modules in `src/`, though in principle you could write it directly as long as it creates a `window.template` object that has function properties [`update()`](#update) and [`draw()`](#draw), and object properties [`state`](#state) and optionally [`data`](#data-1).

### `template.yml`
The main Flourish configuration file for your template. The top-level properties are:
* `sdk_version` Which major version of the Flourish SDK the template is compatible with. Currently this should be `2`.
* `id` A unique identifier for your template. If you publish a template and the `id` is already in use by you, the Flourish server will assume you are updating an existing template and overwrite it.
* `name` What the template will be called within Flourish
* `author` Who wrote the template
* `description` A short description of the template

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

#### settings
The `template.yml` file will usually also include a `settings` section defining user-editable properties. Each setting allows the user to change a specific property in the template [`state`](#state). When a setting is changed by the user in the SDK or the Flourish visualisation editor, `state` is updated and the template's `update()` function is called. The following types of settings are supported:

* `number` A number. Optionally add `min`, `max` and `step` properties to control how the input increment buttons work.
* `string` A single line of text
* `text` Multiline text
* `boolean` A true/false value
* `color` A colour; represented in the state as a string containing a hex RGB colour e.g. `"#123456"`

This section contains an array of objects and optional headings. For example:

```yaml
settings:
- Section title # Headings can be used to break up the settings into collapsible sections
- property: my_state_property # Required; must be a state property
  name: Example number setting # Optional; display name
  description: A setting for changing a number # Optional; description
  type: number # Required; see available types above
```

#### data bindings
The `template.yml` file may also include a `data` section. This section consists of an array of data ‘bindings’ that sets how the template should use and refer to the template’s editable data tables (which are initially populated by the CSV files in [`data/`](#data)). Each binding adds one or more columns of data to a `dataset` under a particular `key`. You can define as many datasets as you like. They are made available to the template as properties of [the `data` object](#data-1). Each one consists of an array containing an object for each row of the relevant data table, as shown in the example below.

Once your template is published, Flourish users can change the data in the Flourish editor, and also change which columns are linked to each binding. But in your code you don’t need to worry about this because you just refer to the `key` rather than referencing the column header or index.

There are two types of data binding: `column` is used when the number of columns is and must always be one; `columns` supports any number of columns, including none.

The following example sets up a dataset with two keys, one single-column and one multi-column.

```yaml
data:
- Locations # Optional; breaks up the bindings into collapsible sections
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

#### `README.md`
A file documenting the template, in Markdown format. This documentation will be displayed on the template’s page on the Flourish site, when the template is [published](#publish-a-template) and made live.

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
To download an existing template, such as one of our examples or an open-source template, simply `git clone` the repo, then change into the new directory and `npm update` then `flourish run`. For example:
```sh
git clone https://github.com/kiln/example-template-circle
cd example-template-circle/
npm update
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

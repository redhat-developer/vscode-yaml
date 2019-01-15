
# DevOps as Code by XebiaLabs

This extension adds DevOps as Code YAML support to VSCode. The extension adds the following features:

* Syntax highlighting
* Code completion
* Code validation
* Code formatting
* Code snippets
* Context documentation

Current support is limited to XL Deploy.

## Demo
![screencast](https://raw.githubusercontent.com/xebialabs/devops-as-code-vscode/master/images/demo.gif)

## Usage info

**Note:** By default, this extension provides DevOps as Code YAML support on all documents with the filename extension `.yaml`. This may conflict with other configuration file formats that also use the .yaml extension. See the section "Changing configuration" below.

When using the extension:
* You can trigger code completion using `CTRL`+`SPACE`. Code snippets are also listed as suggestions.
* You can insert Code snippets by typing the shortcut for the snippet. For example, try typing "def" and press `ENTER`. You can cycle through all template input positions by pressing `TAB`.
* You can format the code by right-mouse clicking the document and select `Format Document`. If you make a selection, only the selected part of the document will be formatted.
* The YAML is automatically validated.
	* Issues are indicated in red and are also listed in the "Problems window".
	* The validation is XL type system-aware, as the extension includes type system information of a standard installation with the default plugins installed.
* Embedded help is displayed when using code completion and when hovering over properties in the YAML document.

## Changing configuration

You can configure the files for which the extension will be enabled. By default, the extension is enabled on all files with extension `.yaml`. This behaviour may conflict with other configuration file formats that also use the `.yaml` extension.

**Note:** `xebialabs` is the schema name of the built-in support for DevOps as Code YAML.

For example, if you want editor support for both XebiaLabs and Kubernetes YAML, you can configure the extension as shown in the following example to make it possible to distinguish between the two. Ensure that you name your project files accordingly:

```
  "yaml.schemas": {
    "xebialabs": "*.xl.yaml",
    "kubernetes": "*.kube.yaml"
 }
```

For more configuration options, see the the documentation of the [YAML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml).

## Third party notice

This plugin is built on top of the [YAML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) extension. This means this extension works exactly the same, but adds built-in support for DevOps as Code from XebiaLabs. It is not recommended to enable both plugins at the same time, since some features and settings may conflict. To get the same functionality from both extensions, disable the YAML Language Support by Red Hat extension before enabeling DevOps as Code YAML support.


# Devops As Code YAML support by XebiaLabs

This extension adds Devops as Code YAML support to VSCode. The extension adds the following features:

* Syntax highlighting
* Code completion
* Code validation
* Code Snippets
* Context documentation

Currently the support is limited to only XL Deploy.

## Demo
![screencast](https://raw.githubusercontent.com/xebialabs/devops-as-code-vscode/master/images/demo.gif)

## Usage info

By default you will get Devops as Code YAML support on all YAML documents that you open with extension `.yaml`. If this is not want you want, you can configure it differently. See the section "Changing configuration" below.

* Code completion can be triggered by `CTRL`+`SPACE`. Code snippets are also listed as suggestions.
* Code snippets can also be inserted by typing the shortcut for the snippet. For example try typing "def" and hit `ENTER`. You can jump trough all template input positions by pressing `TAB`.
* The YAML is automatically validated. Problems are indicated with red and are also listed in the "Problems window".
  * The validation is XL type system aware. The extension ships with type system information of a standard installation with the default plugins installed.
* Documentation shows when using code completion and when hovering over properties in the YAML document.

## Changing configuration

You can change on which files the extension will be enabled. By default its enabled on all files with extension `.yaml`. But this behaviour might conflict with other configuration file formats that also use the `.yaml` extension. Notice that `xebialabs` is the schema name of the buildin support for Devops as Code YAML support.

For example, if you want editor support for both xebialabs and kubernetes YAML, you can configure the extension like shown in the example to make it possible to distinguish between the two. Please make sure you name your project files accordingly:

```
  "yaml.schemas": {
    "xebialabs": "*.xl.yaml",
    "kubernetes": "*.kube.yaml"
 }
```

For more configuration option have a look at the documentation of the [YAML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml).

## Third party notice

This plugin is build on top of the [YAML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) extension. This means this extension works exactly the same, but adds build-in support for Devops as Code from XebiaLabs. Its not recommended to enable both plugins at the same time, since some features and settings might conflict. We advise you to use disable the YAML Language Support by Red Hat extension before enabeling Devops as Code YAML support. You will get exactly the same functionality.

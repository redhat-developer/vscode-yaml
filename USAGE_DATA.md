# Data collection

vscode-yaml has opt-in telemetry collection, provided by [vscode-commons](https://github.com/redhat-developer/vscode-commons).

## What's included in the vscode-yaml telemetry data

- yaml-language-server start
- errors during yaml language server start
- any errors from LSP requests
- `kubernetes` schema usage

## What's included in the general telemetry data

Please see the
[vscode-commons data collection information](https://github.com/redhat-developer/vscode-commons/blob/master/USAGE_DATA.md#other-extensions)
for information on what data it collects.

## How to opt in or out

Use the `redhat.telemetry.enabled` setting in order to enable or disable telemetry collection.

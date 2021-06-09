# Data collection

vscode-yaml has opt-in telemetry collection, provided by [vscode-redhat-telemetry](https://github.com/redhat-developer/vscode-redhat-telemetry).

## What's included in the vscode-yaml telemetry data

- yaml-language-server start
- errors during yaml language server start
- any errors from LSP requests
- `kubernetes` schema usage

## What's included in the general telemetry data

Please see the
[vscode-redhat-telemetry data collection information](https://github.com/redhat-developer/vscode-redhat-telemetry/blob/HEAD/USAGE_DATA.md)
for information on what data it collects.

## How to opt in or out

Use the `redhat.telemetry.enabled` setting in order to enable or disable telemetry collection.

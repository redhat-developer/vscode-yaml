#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/test/testFixture"
export CODE_DISABLE_EXTENSIONS=1

node "$(pwd)/node_modules/vscode/bin/test"

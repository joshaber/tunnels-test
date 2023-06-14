#!/bin/bash

gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json

yarn start

REFRESH_PORTS_AFTER_DELETE=1 yarn start

yarn start

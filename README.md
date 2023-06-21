# tunnels-test

Bug: calling `refreshPorts` can hang.

To reproduce:

1. Create a codespace from this repository
1. `yarn && gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json`
1. `yarn start`
1. This seems to be a race, you may need to run it multiple times. Once a codespace is in a bad state, it seems to stay in a bad state until it's restarted.

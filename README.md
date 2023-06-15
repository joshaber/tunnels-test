# tunnels-test

Bug: creating, deleting, and then recreating a port makes TunnelClient throw when `acceptLocalConnectionsForForwardedPorts = false`, because we never remove the deleted port from `remoteForwardedPorts` in `portForwardingService`.

To reproduce:

1. Create a codespace from this repository
1. `yarn && gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json`
1. `yarn start`
1. Recreating the port will fail:
    ```
    !> Error: Error handling SessionRequestMessage (requestType=tcpip-forward): Port 3000->3000 is already in the collection. Error: Port 3000->3000 is already in the collection.
        at ForwardedPortsCollection.addPort (/workspaces/tunnels-test/node_modules/@microsoft/dev-tunnels-ssh-tcp/events/forwardedPortsCollection.js:93:19)
        at PortForwardingService.onSessionRequest (/workspaces/tunnels-test/node_modules/@microsoft/dev-tunnels-ssh-tcp/services/portForwardingService.js:422:39)
        at async SshClientSession.handleRequestMessage (/workspaces/tunnels-test/node_modules/@microsoft/dev-tunnels-ssh/sshSession.js:470:17)
        at async SshClientSession.processMessages (/workspaces/tunnels-test/node_modules/@microsoft/dev-tunnels-ssh/sshSession.js:303:17)
    >> Relay client: SshClientSession Close(protocolError, "Port 3000->3000 is already in the collection.")
    >> Relay client: Sending #11 DisconnectMessage (protocolError: Port 3000->3000 is already in the collection.)
    /workspaces/tunnels-test/node_modules/@microsoft/dev-tunnels-ssh/sshSession.js:848
                : new errors_1.SshConnectionError('Session disposed.');
    ```

# tunnels-test

To reproduce hang:

1. Run `gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json`
1. Run `yarn server`
1. Open another terminal and run `yarn start`
1. See `refreshPorts` hang waiting for a response:

```
...
> Refreshing ports...
>> Relay client: Sending #7 SessionRequestMessage (requestType=RefreshPorts)
>> Relay client: Receiving #7 SessionRequestMessage (requestType=tcpip-forward)
>> Relay client: Sending #8 PortForwardSuccessMessage (port=3000)
```

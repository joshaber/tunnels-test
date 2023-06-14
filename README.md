# tunnels-test

To reproduce hang:

1. `yarn`
1. Run `gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json`
1. Run `yarn server`
1. Open another terminal and run the test a number of times: `for i in {1..10}; do yarn start; done`
1. These will fail after the first run
1. Comment out the `refreshPorts` call after deleting the existing port (search for "Comment these lines out")
1. Run the test a number of times again: `for i in {1..10}; do yarn start; done`
1. See `refreshPorts` hang waiting for a response:

```
> Relay client connected
>> Relay client: Receiving #7 SessionRequestMessage (requestType=tcpip-forward)
>> Relay client: Sending #7 PortForwardSuccessMessage (port=3000)
> Port already exists
> Port deleted
> Created port ...
> Refreshing ports...
>> Relay client: Sending #8 SessionRequestMessage (requestType=RefreshPorts)
```

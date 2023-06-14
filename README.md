# tunnels-test

To reproduce hang:

1. Create a codespace from this repository
1. Run `./run.sh`. This will run the client test 3 times, each time deleting and creating a port.
1. The second run will call `refreshPorts` after deleting the existing port.
    1. Note that this errors with `Error: Port 3000->3000 is already in the collection.` Should this error? It doesn't seem like it.
1. The third run hangs on `refreshPorts` after creating the port:
    ```
    > Relay client connected
    >> Relay client: Receiving #7 SessionRequestMessage (requestType=tcpip-forward)
    >> Relay client: Sending #7 PortForwardSuccessMessage (port=3000)
    > Port already exists
    > Port deleted
    > Created port [...]
    > Refreshing ports...
    >> Relay client: Sending #8 SessionRequestMessage (requestType=RefreshPorts)
    ```
1. If this succeeds just try running `./run.sh` again.

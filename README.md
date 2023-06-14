# tunnels-test

There are two surprising behaviors:
1. Calling `refreshPorts` after deleting an existing ports throws with `Error: Port 3000->3000 is already in the collection.`. Is that intentional? Why?
2. Calling `refreshPorts` can hang indefinitely waiting for a response.

To reproduce:

1. Create a codespace from this repository
1. Run `./run.sh`. This will run the client test 3 times, each time deleting and creating a port.
1. The second run will call `refreshPorts` after deleting the existing port.
    1. Note that this errors with `Error: Port 3000->3000 is already in the collection.`
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

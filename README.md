# tunnels-test

Bug: calling `refreshPorts` can hang.

To reproduce:

1. Create a codespace from this repository
2. Update the GitHub token to be a token from devtunnels: https://github.com/joshaber/tunnels-test/blob/aed961156cd89451b5bc97e15154bda6a04a210d/host/Program.cs#L19
3. `cd host && dotnet run`
4. Copy `host/tunnel.json` to the root
5. `yarn start`. This will run just fine and exit.
7. `yarn start` again. This will hang.

import { TunnelManagementHttpClient } from '@microsoft/dev-tunnels-management';
import { Tunnel, TunnelAccessScopes, TunnelPort, TunnelProtocol } from '@microsoft/dev-tunnels-contracts';
import { TunnelRelayTunnelClient } from '@microsoft/dev-tunnels-connections';
import { AxiosError } from 'axios'
import * as fs from 'fs';

const PORT = 3000;

// seed tunnel.json: gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json
const data = fs.readFileSync('tunnel.json')
const tunnelInfo = JSON.parse(data.toString('utf-8'))

async function main() {
  const managementClient = new TunnelManagementHttpClient({ name: 'tunnels-test' }, undefined, tunnelInfo.serviceUri);
  const tunnel: Tunnel = {
    clusterId: tunnelInfo.clusterId,
    tunnelId: tunnelInfo.tunnelId,
    domain: tunnelInfo.domain,
    accessTokens: {
      [TunnelAccessScopes.Connect]: tunnelInfo.connectAccessToken,
      [TunnelAccessScopes.ManagePorts]: tunnelInfo.managePortsAccessToken,
    },
  };

  console.log('> Trying to delete existing port to get us to a clean slate...')
  try {
    await managementClient.deleteTunnelPort(tunnel, PORT);
    console.log('> Port deleted');
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`> Port didn't exist yet`)
    } else {
      throw error;
    }
  }

  const relayClient = await connectRelayClient(tunnel, managementClient);

  const tunnelPort: TunnelPort = {
    portNumber: PORT,
    protocol: TunnelProtocol.Http,
  };

  console.log('> Creating port...');
  const createdPort1 = await managementClient.createTunnelPort(tunnel, tunnelPort);
  await relayClient.refreshPorts();
  await relayClient.waitForForwardedPort(PORT);
  console.log('> Created port', createdPort1);

  console.log('> Deleting port...');
  await managementClient.deleteTunnelPort(tunnel, PORT);
  await relayClient.refreshPorts();
  console.log('> Port deleted');

  console.log('> Creating port again...');
  const createdPort2 = await managementClient.createTunnelPort(tunnel, tunnelPort);
  await relayClient.refreshPorts();
  await relayClient.waitForForwardedPort(PORT);
  console.log('> Created port', createdPort2);

  process.exit(0);
}

async function connectRelayClient(tunnel: Tunnel, managementClient: TunnelManagementHttpClient) {
  const relayClient = new TunnelRelayTunnelClient((_level: any, _eventId: number, msg: string, err?: Error) => {
    if (err) {
      console.log(`!> Error: ${msg}`, err);
    } else {
      console.log(`>> Relay client: ${msg}`);
    }
  }, managementClient);
  relayClient.acceptLocalConnectionsForForwardedPorts = false;
  relayClient.connectionStatusChanged(event => {
    console.log(`>> Tunnel client connection changed from ${event.previousStatus} to ${event.status}`);

    if (event.disconnectError) {
      console.log(`!> Disconnect error`, event.disconnectError);
      process.exit(1);
    }
  });

  const hydratedTunnel = (await managementClient.getTunnel(tunnel, { includePorts: true }))!;
  hydratedTunnel.accessTokens = tunnel.accessTokens;
  console.log('> Hydrated tunnel', hydratedTunnel);

  await relayClient.connect(hydratedTunnel);
  console.log(`> Relay client connected`);

  return relayClient;
}

main()

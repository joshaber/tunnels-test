import { TunnelManagementHttpClient } from '@microsoft/dev-tunnels-management';
import { Tunnel, TunnelAccessScopes, TunnelPort, TunnelProtocol } from '@microsoft/dev-tunnels-contracts';
import { TunnelRelayTunnelClient } from '@microsoft/dev-tunnels-connections';
import { AxiosError } from 'axios'
import * as fs from 'fs';

const PORT = 3000;

// seed tunnel.json: gh api /user/codespaces/$CODESPACE_NAME?internal=1 | jq .connection.tunnelProperties > tunnel.json
const data = fs.readFileSync('tunnel.json')
const tunnelInfo = JSON.parse(data.toString('utf-8'))

async function run() {
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

  const relayClient = await connectRelayClient(tunnel, managementClient);
  console.log('> Refresh ports after initial connection...');
  await relayClient.refreshPorts();

  console.log('> Trying to delete existing port to get us to a clean slate...')
  try {
    await managementClient.deleteTunnelPort(tunnel, PORT);
    console.log('> Refresh ports...');
    await relayClient.refreshPorts();
    console.log('> Port deleted');
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log(`> Port didn't exist yet`)
    } else {
      throw error;
    }
  }

  const tunnelPort: TunnelPort = {
    portNumber: PORT,
    protocol: TunnelProtocol.Http,
  };

  console.log('> Creating port...');
  const createdPort1 = await managementClient.createTunnelPort(tunnel, tunnelPort);
  await wait(1000);
  console.log('> Refresh ports...');
  await relayClient.refreshPorts();
  console.log('> Created port', createdPort1);

  console.log('> Deleting port...');
  await managementClient.deleteTunnelPort(tunnel, PORT);
  await wait(1000);
  console.log('> Refresh ports...');
  await relayClient.refreshPorts();
  console.log('> Port deleted');
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectRelayClient(tunnel: Tunnel, managementClient: TunnelManagementHttpClient) {
  const relayClient = new TunnelRelayTunnelClient((_level: any, eventId: number, msg: string, err?: Error) => {
    if (err) {
      console.log(`!> Error: ${msg}`, err);
    } else {
      console.log(`>> Relay client ${eventId}: ${msg}`);
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

async function main() {
  for (let i = 0; i < 5; i++) {
    console.log(`### RUN ${i} ###`)
    await run();
  }

  process.exit(0)
}

main()

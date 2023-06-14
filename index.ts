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
  const relayClient = await connectRelayClient(tunnel, managementClient);

  const tunnelPort: TunnelPort = {
    portNumber: PORT,
    protocol: TunnelProtocol.Http,
  };

  try {
    const createdPort = await managementClient.createTunnelPort(tunnel, tunnelPort);
    console.log('> Created port', createdPort);
  } catch (error: any) {
    if (error.response) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status == 409) {
        console.log('> Port already exists');

        await managementClient.deleteTunnelPort(tunnel, PORT);
        console.log('> Port deleted');

        if (process.env.REFRESH_PORTS_AFTER_DELETE) {
          console.log(`> Refreshing ports after deleting existing port...`);
          await relayClient.refreshPorts();
          console.log(`> Refreshing ports done`);
        }

        const createdPort = await managementClient.createTunnelPort(tunnel, tunnelPort);
        console.log('> Created port', createdPort);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  console.log(`> Refreshing ports...`);
  await relayClient.refreshPorts();
  console.log(`> Refreshing ports done`);

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

using System.Diagnostics;
using System.Net.Http.Headers;
using Microsoft.DevTunnels.Management;
using Microsoft.DevTunnels.Contracts;
using Microsoft.DevTunnels.Connections;
using System.Text.Json;

namespace host;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Hello, World!");

        var productInfo = new ProductInfoHeaderValue("YourAppName", "0.0.1");
        var manager = new TunnelManagementClient(productInfo, async () =>
        {
            return new AuthenticationHeaderValue("GitHub", "XXX");
        }, null);

        var trace = new TraceSource("TunnelHost");
        trace.Listeners.Add(new ConsoleTraceListener());
        trace.Switch.Level = SourceLevels.All;

        var host = new TunnelRelayTunnelHost(manager, trace);

        var tunnelDefinition = new Tunnel
        {
            Ports = new[]
            {
                new TunnelPort { PortNumber = 7208, Protocol = TunnelProtocol.Http },
            },
            AccessControl = new TunnelAccessControl(),
        };
        var cancellation = new CancellationTokenSource();
        var options = new TunnelRequestOptions
        {
            TokenScopes = new string[] { TunnelAccessScopes.Connect, TunnelAccessScopes.ManagePorts, TunnelAccessScopes.Host },
        };
        var tunnel = await manager.CreateTunnelAsync(tunnelDefinition, options: options, cancellation.Token);

        Console.CancelKeyPress += async (object? sender, ConsoleCancelEventArgs args) =>
        {
            cancellation.Cancel();
        };

        var tokens = tunnel.AccessTokens?.Select(kvp => kvp.Key + ": " + kvp.Value.ToString()) ?? Array.Empty<string>();
        Console.WriteLine($"Created tunnel, id: {tunnel.TunnelId}, cluster ID: {tunnel.ClusterId}, tokens: <{string.Join(Environment.NewLine, tokens)}>, domain: {tunnel.Domain}");

        var tunnelDump = new Dictionary<string, object>()
        {
            {"tunnelId", tunnel.TunnelId},
            {"clusterId", tunnel.ClusterId},
            {"connectAccessToken", tunnel.AccessTokens["connect"]},
            {"managePortsAccessToken", tunnel.AccessTokens["manage:ports"]},
            {"domain", "app.github.dev"},
            {"serviceUri", "https://global.rel.tunnels.api.visualstudio.com/"},
        };

        string fileName = "tunnel.json";
        string jsonString = JsonSerializer.Serialize(tunnelDump);
        File.WriteAllText(fileName, jsonString);
        Console.WriteLine($"Wrote tunnel info to {fileName}");

        await host.StartAsync(tunnel, cancellation.Token);
        Console.WriteLine($"Started host: {host}");

        while(true)
        {
            if (cancellation.IsCancellationRequested)
            {
                break;
            }

            await Task.Delay(1000);
        }

        Console.WriteLine("Shutting down...");
        await host.DisposeAsync();

        Console.WriteLine("Deleting tunnel...");
        await manager.DeleteTunnelAsync(tunnel, null, CancellationToken.None);
    }
}

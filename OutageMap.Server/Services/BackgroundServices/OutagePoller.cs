using Microsoft.AspNetCore.SignalR;
using OutageMap.Server.Dtos;
using OutageMap.Server.Hubs;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Services;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Services.BackgroundServices;

public class OutagePoller : BackgroundService
{
    private readonly TimeSpan _period = TimeSpan.FromMinutes(10);
    private readonly ILogger<OutagePoller> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<OutageHub> _hub;

    public OutagePoller(ILogger<OutagePoller> logger, IServiceProvider service, IHubContext<OutageHub> hub)
    {
        _logger = logger;
        _serviceProvider = service;
        _hub = hub;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(_period);

        int timesPolled = 0;

        _logger.LogInformation("Starting outage polling");

        await SyncAsync(++timesPolled, stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await SyncAsync(++timesPolled, stoppingToken);
        }
    }

    private async Task SyncAsync(int timesPolled, CancellationToken stoppingToken)
    {
        try
        {
            using IServiceScope scope = _serviceProvider.CreateScope();

            OutageSyncService syncService = scope.ServiceProvider.GetRequiredService<OutageSyncService>();
            OutageSyncResult result = await syncService.SyncOutages(stoppingToken);

            _logger.LogInformation(
                "Poll #{TimesPolled}. Added: {Added}, Updated: {Updated}, Deactivated: {Deactivated}",
                timesPolled,
                result.Added,
                result.Updated,
                result.Deactivated);

            if (result.HasChanges)
                await _hub.Clients.All.SendAsync("OutagesChanged", cancellationToken: stoppingToken);
        }
        catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Outage poll #{TimesPolled} failed.", timesPolled);
        }
    }
}

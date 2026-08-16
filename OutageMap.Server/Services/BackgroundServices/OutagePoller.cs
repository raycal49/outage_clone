using Microsoft.AspNetCore.SignalR;
using OutageMap.Server.Hubs;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Services;

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

        await PollAsync(++timesPolled, stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PollAsync(++timesPolled, stoppingToken);
        }
    }

    private async Task PollAsync(int timesPolled, CancellationToken stoppingToken)
    {
        try
        {
            using IServiceScope scope = _serviceProvider.CreateScope();

            IOutageSource source =
                scope.ServiceProvider
                    .GetRequiredService<IOutageSource>();

            var outages = await source.GetOutageData();

            OutageValidator.Validate(outages);

            OutageSyncService syncService = scope.ServiceProvider.GetRequiredService<OutageSyncService>();

            OutageSyncResult result = await syncService.SyncOutages(outages, stoppingToken);

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

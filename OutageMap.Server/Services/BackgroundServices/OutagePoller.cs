using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using OutageMap.Server.Dtos;
using OutageMap.Server.Hubs;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Services;

namespace Services.BackgroundServices;

public class OutagePoller : BackgroundService
{
    private readonly TimeSpan _period;
    private readonly ILogger<OutagePoller> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<OutageHub> _hub;

    public OutagePoller(IOptions<OutageFeedOptions> feedOptions, ILogger<OutagePoller> logger,IServiceProvider service, IHubContext<OutageHub> hub)
    {
        _period = feedOptions.Value.PollInterval ;
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

            IOutageSource source = scope.ServiceProvider.GetRequiredService<IOutageSource>();
            var outages = await GetValidSnapshot(source, timesPolled, stoppingToken);

            OutageSyncService syncService = scope.ServiceProvider.GetRequiredService<OutageSyncService>();
            OutageSyncResult result = await syncService.SyncStoredOutages(outages, stoppingToken);

            _logger.LogInformation(
                "Poll #{TimesPolled}. Added: {Added}, Updated: {Updated}, Deactivated: {Deactivated}",
                timesPolled, result.Added, result.Updated, result.Deactivated);

            if (result.HasChanges)
                await _hub.Clients.All.SendAsync("OutagesChanged", cancellationToken: stoppingToken);
        }
        catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Outage poll #{TimesPolled} failed.", timesPolled);
        }
    }


    private async Task<List<OutageDto>> GetValidSnapshot(IOutageSource source, int timesPolled, CancellationToken stoppingToken)
    {
        var retryDelays = new List<TimeSpan> { TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30) };

        int maxRetries = retryDelays.Count;

        for (int attempt = 0; ; attempt++)
        {
            var outages = await source.GetOutageData();

            try
            {
                OutageValidator.Validate(outages);
                return outages;
            }
            catch (InvalidDataException ex) when (attempt < maxRetries)
            {
                var retryDelay = retryDelays[attempt];

                _logger.LogWarning(
                    ex,
                    "Poll #{TimesPolled} returned an invalid outage snapshot. Retrying in {RetryDelay}. Retry {RetryNumber} of 2.",
                    timesPolled, retryDelay, attempt + 1);

                await Task.Delay(retryDelay, stoppingToken);
            }
        }
    }
}

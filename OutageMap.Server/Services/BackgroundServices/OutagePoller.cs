using OutageMap.Server.Dtos;
using OutageMap.Server.Infrastructure.Http;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Services.BackgroundServices;

public class OutagePoller : BackgroundService
{
    private readonly TimeSpan _period = TimeSpan.FromMinutes(10);
    private readonly ILogger<OutagePoller> _logger;
    private readonly IServiceProvider _serviceProvider;

    public OutagePoller(ILogger<OutagePoller> logger, IServiceProvider service)
    {
        _logger = logger;
        _serviceProvider = service;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(_period);

        int timesPolled = 0;

        _logger.LogInformation("Starting outage polling");

        // this line actually yields List<OutageDto> and so we should capture it, examine it, and compare it with what we have in our EF Core 
        var outages = await PollAsync(++timesPolled);

        //
        // do comparison here and have a conditional based off of if we have new rows or not
        //
        // run CheckIfNewOutagePoints
        //
        // if we do not have new rows, we will NOT run the below StoreOutagePoints function and will just wait until next poll, where we will check again
        // if we do have new rows, we will run the below StoreOutagePoints function
        //
        // run StoreOutagePoints function here
        //

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PollAsync(++timesPolled);
        }
    }

    private async Task<List<OutageDto>> PollAsync(int timesPolled)
    {
        using IServiceScope scope = _serviceProvider.CreateScope();

        IOutageSource source =
            scope.ServiceProvider.GetRequiredService<IOutageSource>();

        List<OutageDto> outages = await source.GetOutageData();

        _logger.LogInformation(
            "Poll #{TimesPolled} at {Timestamp}. Outages: {Count}\n{Data}",
            timesPolled,
            DateTimeOffset.Now,
            outages.Count,
            JsonSerializer.Serialize(
                outages,
                new JsonSerializerOptions { WriteIndented = true }));

        return outages;
    }

    // CheckIfNewOutagePoints

    // StoreNewOutagePoints
}

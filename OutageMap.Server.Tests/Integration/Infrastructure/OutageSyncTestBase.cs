using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OutageMap.Server.Dtos;
using OutageMap.Server.Dtos.Mappers;
using OutageMap.Server.Models;
using OutageMap.Server.Services;

namespace OutageMap.Server.Tests.Infrastructure.Integration;

public abstract class OutageSyncTestBase : IDisposable
{
    private readonly AppDbContext _db;

    protected OutageSyncService Service { get; }

    protected OutageSyncTestBase(SqlServerFixture database)
    {
        _db = database.CreateTestContext();

        Service = new OutageSyncService(_db);
    }

    protected static OutageDto Outage(
        long id,
        int customersAffected = 100,
        string status = "Investigating",
        string? cause = "Unknown")
    {
        const long startTime = 1_700_000_000_000;

        return new OutageDto
        {
            Id = id,
            StartTime = startTime,
            EtrTime = startTime + 3_600_000,
            NumPeople = customersAffected,
            Status = status,
            Cause = cause,
            Latitude = 29.7604,
            Longitude = -95.3698,
            AdditionalProperties = []
        };
    }

    protected async Task InsertIntoDb(params OutageDto[] outages)
    {
        var entities = outages
            .Select(OutageDtoToEntity.ConvertToOutage)
            .Select(x => x!);

        _db.Outages.AddRange(entities);

        await _db.SaveChangesAsync(TestContext.Current.CancellationToken);

        _db.ChangeTracker.Clear();
    }

    protected Task<OutageEntity> Find(long sourceId)
    {
        _db.ChangeTracker.Clear();

        return _db.Outages
            .AsNoTracking()
            .SingleAsync(
                x => x.SourceId == sourceId,
                TestContext.Current.CancellationToken);
    }

    protected Task<List<OutageEntity>> AllOutages()
    {
        _db.ChangeTracker.Clear();

        return _db.Outages
            .AsNoTracking()
            .OrderBy(x => x.SourceId)
            .ToListAsync(TestContext.Current.CancellationToken);
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}  

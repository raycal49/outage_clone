using Microsoft.EntityFrameworkCore;
using OutageMap.Server.Dtos;
using OutageMap.Server.Dtos.Mappers;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Models;

namespace OutageMap.Server.Services;

public sealed class OutageSyncService
{
    private readonly IOutageSource _source;
    private readonly AppDbContext _db;
    private readonly ILogger<OutageSyncService> _logger;

    public OutageSyncService(IOutageSource source, AppDbContext db, ILogger<OutageSyncService> logger)
    {
        _source = source;
        _db = db;
        _logger = logger;
    }

    public async Task<OutageSyncResult> SyncOutages(List<OutageDto> outages, CancellationToken cancellationToken)
    {
        OutageValidator.Validate(outages);

        long[] sourceIds = outages.Select(x => x.Id).ToArray();

        Dictionary<long, OutageEntity> stored = await _db.Outages
            .Where(x => x.IsActive || sourceIds.Contains(x.SourceId))
            .ToDictionaryAsync(x => x.SourceId, cancellationToken);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        OutageSyncResult result = new();

        foreach (OutageDto dto in outages)
        {
            if (!stored.TryGetValue(dto.Id, out OutageEntity? storedOutage))
            {
                OutageEntity newOutage = OutageDtoToEntity.ConvertToOutage(dto)!;

                _db.Outages.Add(newOutage);
                result.Added++;

                continue;
            }

            bool changed = OutageUpdater.Update(dto, storedOutage);

            if (!storedOutage.IsActive)
            {
                _logger.LogWarning("Inactive outage {SourceId} reappeared.", storedOutage.SourceId);

                storedOutage.IsActive = true;
                storedOutage.ResolvedAt = null;
                changed = true;
            }

            if (changed)
                result.Updated++;
        }

        foreach (OutageEntity storedOutage in stored.Values.Where(x => x.IsActive && !sourceIds.Contains(x.SourceId)))
        {
            storedOutage.IsActive = false;
            storedOutage.ResolvedAt = now;

            result.Deactivated++;
        }

        if (result.HasChanges)
            await _db.SaveChangesAsync(cancellationToken);

        return result;
    }
}
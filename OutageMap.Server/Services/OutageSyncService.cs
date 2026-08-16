using Microsoft.EntityFrameworkCore;
using OutageMap.Server.Dtos;
using OutageMap.Server.Dtos.Mappers;
using OutageMap.Server.Models;

namespace OutageMap.Server.Services;

public sealed class OutageSyncService
{
    private readonly AppDbContext _db;

    public OutageSyncService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OutageSyncResult> SyncStoredOutages(List<OutageDto> outages, CancellationToken cancellationToken)
    {
        long[] sourceIds = outages.Select(x => x.Id).ToArray();

        Dictionary<long, OutageEntity> stored = await _db.Outages
            .Where(x => x.IsActive)
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

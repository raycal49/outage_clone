using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Features;
using OutageMap.Server.Models;

namespace OutageMap.Server.Services;

public sealed class OutageReader : IOutageReader
{
    private readonly AppDbContext _db;

    public OutageReader(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FeatureCollection> GetActiveOutages(CancellationToken cancellationToken)
    {
        List<OutageEntity> outages = await _db.Outages
            .Where(x => x.IsActive)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return OutageEntityToGeojson.ConvertToFeatureCollection(outages);
    }
}
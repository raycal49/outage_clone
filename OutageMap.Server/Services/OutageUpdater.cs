using NetTopologySuite;
using NetTopologySuite.Geometries;
using OutageMap.Server.Dtos;
using OutageMap.Server.Models;

namespace OutageMap.Server.Services;

public static class OutageUpdater
{
    private static readonly GeometryFactory GeometryFactory =
        NtsGeometryServices.Instance
            .CreateGeometryFactory(srid: 4326);

    public static bool Update(OutageDto dto, OutageEntity storedOutage)
    {
        if (!NeedsUpdate(dto, storedOutage))
            return false;

        storedOutage.EstimatedRestorationTime = DateTimeOffset.FromUnixTimeMilliseconds(dto.EtrTime!.Value);
        storedOutage.CustomersAffected = dto.NumPeople;
        storedOutage.Status = dto.Status!;
        storedOutage.Cause = dto.Cause;
        storedOutage.Location = GeometryFactory.CreatePoint(new Coordinate(dto.Longitude, dto.Latitude));

        return true;
    }

    private static bool NeedsUpdate(OutageDto dto, OutageEntity storedOutage)
    {
        DateTimeOffset? dtoEtr = DateTimeOffset.FromUnixTimeMilliseconds(dto.EtrTime!.Value);

        Point dtoLocation = GeometryFactory.CreatePoint(new Coordinate(dto.Longitude, dto.Latitude));

        if (storedOutage.EstimatedRestorationTime != dtoEtr)
            return true;

        if (storedOutage.CustomersAffected != dto.NumPeople)
            return true;

        if (storedOutage.Status != dto.Status)
            return true;

        if (storedOutage.Cause != dto.Cause)
            return true;

        if (!storedOutage.Location.EqualsExact(dtoLocation))
            return true;

        return false;
    }
}
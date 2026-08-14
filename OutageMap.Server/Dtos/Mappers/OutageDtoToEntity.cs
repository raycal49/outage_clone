using NetTopologySuite;
using NetTopologySuite.Geometries;
using OutageMap.Server.Models;

namespace OutageMap.Server.Dtos.Mappers;

public static class OutageDtoToEntity
{
    private static readonly GeometryFactory GeometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    public static OutageEntity? ConvertToOutage(OutageDto dto)
    {
        if (dto.Id <= 0 || string.IsNullOrWhiteSpace(dto.Status))
            return null;

        var outage = CreateOutage(dto, DateTimeOffset.Now);

        SetAreaProperties(outage, dto);

        return outage;
    }

    private static OutageEntity CreateOutage(OutageDto dto,DateTimeOffset now)
    {
        return new OutageEntity
        {
            SourceId = dto.Id,
            StartTime = DateTimeOffset.FromUnixTimeMilliseconds(dto.StartTime),
            EstimatedRestorationTime = dto.EtrTime is null ? null : DateTimeOffset.FromUnixTimeMilliseconds(dto.EtrTime.Value),
            CustomersAffected = dto.NumPeople,
            Status = dto.Status,
            Cause = dto.Cause,
            Location = GeometryFactory.CreatePoint(new Coordinate(dto.Longitude, dto.Latitude)),
            IsActive = true,
        };
    }

    private static void SetAreaProperties(OutageEntity outage, OutageDto dto)
    {
        outage.City = GetAreaValue(dto, "AREA_CITY");
        outage.County = GetAreaValue(dto, "AREA_COUNTY");
        outage.ServiceArea = GetAreaValue(dto, "AREA_SERVICE");
        outage.ZipCode = GetAreaValue(dto, "AREA_ZIP");
    }

    private static string? GetAreaValue(OutageDto dto, string propertyName)
    {
        if (dto.AdditionalProperties == null)
            throw new ArgumentNullException($"The input OutageDto has no additional properties.");

        foreach (var property in dto.AdditionalProperties)
        {
            if (property.Property == propertyName)
                return property.GetFirstString();
        }

        return null;
    }

}

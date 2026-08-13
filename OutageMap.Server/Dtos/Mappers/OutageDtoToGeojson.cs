using NetTopologySuite;
using NetTopologySuite.Features;
using NetTopologySuite.Geometries;

namespace OutageMap.Server.Dtos.Conversions;

public static class OutageDtoToGeojson
{
    public static FeatureCollection ConvertToFeatureCollection(List<OutageDto> dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var geoFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        var featureCollection = new FeatureCollection();

        foreach (var d in dto)
        {
            var geom = geoFactory.CreatePoint(new Coordinate(d.Longitude, d.Latitude));

            var properties = new AttributesTable
                {
                    { "id", d.Id },
                    { "startTime", d.StartTime },
                    { "lastUpdatedTime", d.LastUpdatedTime },
                    { "etrTime", d.EtrTime },
                    { "numPeople", d.NumPeople },
                    { "status", d.Status },
                    { "cause", d.Cause },
                    { "identifier", d.Identifier },
                    { "additionalProperties", d.AdditionalProperties }
                };

            featureCollection.Add(new Feature(geom, properties));

        }

        return featureCollection;
    }

}
